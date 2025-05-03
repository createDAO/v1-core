const fs = require('fs');
const path = require('path');

// Paths configuration
const DATA_DIR = path.join(__dirname, '../../data');
const GAS_REPORT_PATH = path.join(DATA_DIR, 'gas-results.md');
const OUTPUT_PATH = path.join(DATA_DIR, 'gas-results.json');

function parseGasReport(content) {
    const lines = content.split('\n');
    const report = {
        solcVersion: '',
        optimizer: {
            enabled: false,
            runs: 0
        },
        blockLimit: 0,
        contracts: {},
        deployments: [],
        // New fields for specific analysis
        createDAOTransaction: null,
        transactionsByContract: {}
    };

    let currentSection = null;
    let headersParsed = false;

    for (const line of lines) {
        // Skip separator lines and empty lines
        if (!line.trim() || line.match(/^[·|-]+$/) || line.match(/^[·|][-]+[·|]$/)) {
            continue;
        }

        // Extract compiler settings from the first line
        if (line.includes('Solc version:')) {
            const parts = line.split('·').map(p => p.trim());
            report.solcVersion = parts[0].match(/Solc version: (.*)/)[1].trim();
            report.optimizer.enabled = parts[1].includes('true');
            report.optimizer.runs = parseInt(parts[2].match(/Runs: (\d+)/)[1]);
            report.blockLimit = parseInt(parts[3].match(/Block limit: ([\d,]+)/)[1].replace(/,/g, ''));
            continue;
        }

        // Detect sections
        if (line.includes('Methods')) {
            currentSection = 'methods';
            continue;
        }
        if (line.includes('Deployments')) {
            currentSection = 'deployments';
            headersParsed = false;
            continue;
        }

        // Skip header rows
        if (line.includes('Contract') && line.includes('Method')) {
            headersParsed = true;
            continue;
        }

        // Parse methods section
        if (currentSection === 'methods' && headersParsed) {
            const parts = line.split(/[|·]/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 6) {
                const [contract, method, min, max, avg, calls] = parts;
                
                // Skip empty rows or header rows
                if (!contract || !method || method === 'Method') continue;

                const contractName = contract.trim();
                // Initialize contract if not exists
                if (!report.contracts[contractName]) {
                    report.contracts[contractName] = {
                        name: contractName,
                        methods: []
                    };
                }

                // Parse gas values, handling empty or '-' values
                const parseGas = (value) => {
                    if (!value || value === '-') return null;
                    const num = parseInt(value.replace(/,/g, ''));
                    return isNaN(num) ? null : num;
                };

                const parseCalls = (value) => {
                    if (!value || value === '-') return 0;
                    const num = parseInt(value);
                    return isNaN(num) ? 0 : num;
                };

                const methodData = {
                    name: method.trim(),
                    gas: {
                        min: parseGas(min),
                        max: parseGas(max),
                        avg: parseGas(avg)
                    },
                    calls: parseCalls(calls)
                };

                // Only add methods that have some gas data
                if (methodData.gas.min !== null || methodData.gas.max !== null || methodData.gas.avg !== null) {
                    report.contracts[contractName].methods.push(methodData);
                }
            }
        }

        // Parse deployments section
        if (currentSection === 'deployments' && line.includes('|')) {
            // Skip headers and separators
            if (!line.includes('Deployments') && !line.includes('Contract') && !line.includes('% of limit')) {
                // Extract contract name (first part after |)
                const contractMatch = line.match(/\|\s*([^·|]+)/);
                if (!contractMatch) continue;
                const contract = contractMatch[1].trim();

                // Find the last number before the percentage
                const gasMatch = line.match(/·\s*(\d+(?:,\d+)*)\s*·\s*(\d+\.?\d*)\s*%/);
                if (gasMatch) {
                    const gasValue = parseInt(gasMatch[1].replace(/,/g, ''));
                    const percentValue = parseFloat(gasMatch[2]);
                    
                    if (!isNaN(gasValue) && !isNaN(percentValue)) {
                        report.deployments.push({
                            contract: contract,
                            gas: gasValue,
                            percentOfLimit: percentValue
                        });
                    }
                }
            }
        }
    }

    // Convert contracts object to array
    const contractsArray = Object.values(report.contracts)
        .map(contract => ({
            ...contract,
            methods: contract.methods
                .filter(m => m.gas.min !== null || m.gas.max !== null || m.gas.avg !== null)
                .sort((a, b) => (b.gas.avg || 0) - (a.gas.avg || 0)) // Sort by average gas cost
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

        // Process transactions by contract
        report.transactionsByContract = {};
        contractsArray.forEach(contract => {
            const transactions = contract.methods
                // Only include methods where min, max, and avg gas values are numbers
                .filter(method => {
                    const hasAllGasValues = method.gas.min !== null && 
                                         method.gas.max !== null && 
                                         method.gas.avg !== null;
                    const isCreateDAO = method.name.startsWith('createDAO(');
                    // Include createDAO even if it doesn't have all gas values
                    return hasAllGasValues || isCreateDAO;
                })
                .map(method => {
                    // Remove everything in parentheses
                    const cleanMethodName = method.name.replace(/\(.*\)/, '');

                    return {
                        method: cleanMethodName,
                        avgGas: method.gas.avg,
                        maxGas: method.gas.max
                    };
                })
                .sort((a, b) => b.maxGas - a.maxGas);

            if (transactions.length > 0) {
                report.transactionsByContract[contract.name] = transactions;
            }
        });

    // Find createDAO transaction (before removing parameters)
    const daoFactoryTxs = contractsArray.find(c => c.name === 'DAOFactory.sol:DAOFactory')?.methods || [];
    const createDAOMethod = daoFactoryTxs.find(m => m.name.startsWith('createDAO('));
    if (createDAOMethod) {
        report.createDAOTransaction = {
            method: 'createDAO',
            avgGas: createDAOMethod.gas.avg || 0,
            maxGas: createDAOMethod.gas.max || 0
        };
    }

    // Sort deployments by gas usage
    report.deployments.sort((a, b) => b.gas - a.gas);
    return report;
}

function processGasReport() {
    try {
        const content = fs.readFileSync(GAS_REPORT_PATH, 'utf8');
        const report = parseGasReport(content);
        
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
        console.log('Gas report processed and saved successfully');
        
        // Log CreateDAO Transaction first
        console.log('\nCreateDAO Transaction:');
        if (report.createDAOTransaction) {
            const maxGasStr = report.createDAOTransaction.maxGas ? ` (max: ${report.createDAOTransaction.maxGas.toLocaleString()})` : '';
            console.log(`createDAO: ${report.createDAOTransaction.avgGas.toLocaleString()} gas avg${maxGasStr}`);
        } else {
            console.log('CreateDAO transaction not found');
        }

        // Log Contract Deployments
        console.log('\nContract Deployments:');
        report.deployments.forEach(dep => {
            console.log(`${dep.contract}: ${dep.gas.toLocaleString()} gas (${dep.percentOfLimit.toFixed(2)}% of limit)`);
        });

        // Log Transactions by Contract
        console.log('\nTransactions by Contract:');
        Object.entries(report.transactionsByContract).forEach(([contract, transactions]) => {
            console.log(`\n${contract}:`);
            transactions.forEach(tx => {
                const maxGasStr = tx.maxGas ? ` (max: ${tx.maxGas.toLocaleString()})` : '';
                console.log(`  ${tx.method}: ${tx.avgGas.toLocaleString()} gas avg${maxGasStr}`);
            });
        });
    } catch (error) {
        console.error('Error processing gas report:', error);
        process.exit(1);
    }
}

// Execute the processing
processGasReport();
