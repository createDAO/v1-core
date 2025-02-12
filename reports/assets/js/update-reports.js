const fs = require('fs');
const path = require('path');

// Paths configuration
const DATA_DIR = path.join(__dirname, '../../data');
const TEST_RESULTS_PATH = path.join(DATA_DIR, 'test-results.txt');
const GAS_REPORT_PATH = path.join(DATA_DIR, 'gas.md');
const OUTPUT_PATH = path.join(DATA_DIR, 'test-results.json');

// Parse test results from the test output file
function parseTestResults(content) {
    const lines = content.split('\n');
    const results = {
        totalTests: 0,
        passed: 0,
        failed: 0,
        duration: '',
        testSuites: []
    };

    let currentSuite = null;

    for (const line of lines) {
        // Match test suite
        // Match duration first to avoid treating it as a suite
        const durationMatch = line.match(/finished in\s+([^)]+)/i);
        if (durationMatch) {
            results.duration = durationMatch[1].trim();
            continue;
        }

        // Match test suite (excluding duration line)
        const suiteMatch = line.match(/^[\s]*([^✓✕\n]+)$/);
        if (suiteMatch && !line.includes('finished in')) {
            currentSuite = {
                name: suiteMatch[1].trim(),
                tests: []
            };
            results.testSuites.push(currentSuite);
            continue;
        }

        // Match test case
        const testMatch = line.match(/^\s*(✓|✕)\s*(.+?)(?:\s+\(\d+\s*ms\))?$/);
        if (testMatch && currentSuite) {
            const passed = testMatch[1] === '✓';
            currentSuite.tests.push({
                name: testMatch[2].trim(),
                passed
            });
            passed ? results.passed++ : results.failed++;
            results.totalTests++;
        }

    }

    return results;
}

// Parse gas report from the markdown file
function parseGasReport(content) {
    const lines = content.split('\n');
    const gasData = {
        contracts: []
    };

    let currentContract = null;
    let isInMethodsSection = false;

    for (const line of lines) {
        // Skip header and separator lines
        if (line.includes('Solc version') || 
            line.includes('Methods') ||
            line.includes('Contract  ·  Method') ||
            line.includes('·-') ||
            !line.includes('·')) {
            continue;
        }

        // Split by the middle dot and clean up
        const parts = line.split('·').map(part => {
            // Clean up the part by removing special characters and extra whitespace
            return part.replace(/[|·]/g, '').trim();
        }).filter(part => part && !part.includes('---'));

        // We need at least contract name and method name
        if (parts.length >= 2) {
            const contractName = parts[0];
            const methodName = parts[1];

            // Skip if either name is missing or if it's a header row
            if (!contractName || !methodName || methodName === 'Method') {
                continue;
            }

            // Find existing contract or create new one
            let contract = gasData.contracts.find(c => c.name === contractName);
            if (!contract) {
                contract = {
                    name: contractName,
                    methods: []
                };
                gasData.contracts.push(contract);
            }

            // Parse gas values
            const gasNumbers = parts.slice(2).map(p => parseInt(p.replace(/\D/g, '')) || 0);
            if (gasNumbers.length >= 3) {
                const methodData = {
                    name: methodName,
                    minGas: gasNumbers[0],
                    maxGas: gasNumbers[1],
                    avgGas: gasNumbers[2],
                    calls: gasNumbers[3] || 0
                };

                // Only add methods with valid gas values
                if (methodData.minGas > 0 || methodData.maxGas > 0 || methodData.avgGas > 0) {
                    contract.methods.push(methodData);
                }
            }
        }

        // Clean up empty contracts
        gasData.contracts = gasData.contracts.filter(contract => contract.methods.length > 0);

        // End of contract section
        if (line.trim() === '' && currentContract) {
            isInMethodsSection = false;
            currentContract = null;
        }
    }

    return gasData;
}

// Main function to process and combine all results
async function processResults() {
    try {
        // Read test results
        const testContent = fs.readFileSync(TEST_RESULTS_PATH, 'utf8');
        const testResults = parseTestResults(testContent);

        // Read gas report
        const gasContent = fs.readFileSync(GAS_REPORT_PATH, 'utf8');
        const gasResults = parseGasReport(gasContent);

        // Combine results
        const combinedResults = {
            timestamp: new Date().toISOString(),
            testResults,
            gasReport: gasResults
        };

        // Save combined results
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(combinedResults, null, 2));
        console.log('Test results processed and saved successfully');

    } catch (error) {
        console.error('Error processing test results:', error);
        process.exit(1);
    }
}

// Execute the processing
processResults();
