# createDAO

A comprehensive DAO creation and management platform built on Ethereum. This platform allows users to easily deploy and manage Decentralized Autonomous Organizations (DAOs) with features like governance, token management, staking, and presale capabilities.

### Test Reports

View the latest test results, coverage reports, and gas usage analysis at:
https://reports.createdao.org

The reports include:
- Test execution results and statistics
- Code coverage analysis
- Gas usage optimization data
- Contract deployment costs

## Features

- **DAO Factory**: Create new DAOs with customizable parameters
- **Upgradeable Contracts**: All contracts are upgradeable using UUPS pattern
- **Token Management**: Built-in ERC20 token creation and management
- **Governance**: Proposal creation and voting system
- **Staking**: Token staking with configurable multipliers
- **Treasury**: Secure fund management
- **Presale**: Customizable token presale functionality

## Architecture

The system consists of several core components:

1. **DAO Factory**: Central factory contract for deploying new DAOs
2. **Core Contracts**:
   - DAO: Main governance contract
   - Token: ERC20 token contract
   - Treasury: Fund management
   - Staking: Token staking functionality
   - Presale: Token presale management

## Installation

```bash
# Clone the repository
git clone https://github.com/createDAO/v1-core.git
cd createDAO/hardhat

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Network RPC URLs
POLYGON_RPC_URL=https://rpc.ankr.com/polygon
BASE_RPC_URL=https://rpc.ankr.com/base
SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia

# API Keys for contract verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# Deployment wallet
PRIVATE_KEY=your_wallet_private_key
```

## Usage

### Testing

Run the comprehensive test suite:

```bash
npx hardhat test
```

### Deployment

1. Deploy Factory and Implementation Contracts:
```bash
npx hardhat run scripts/flows/test.js
```

2. Create a New DAO:
```bash
npx hardhat run scripts/core/dao/create.js
```

### Scripts Structure

- `scripts/core/`: Core deployment and management scripts
  - `factory/`: Factory-related scripts
  - `dao/`: DAO-related scripts
- `scripts/utils/`: Utility functions
- `scripts/flows/`: Complete workflow scripts

## Testing

The project includes extensive tests covering all major functionality:

- Factory creation and management
- DAO initialization and governance
- Token distribution and management
- Staking mechanics
- Presale functionality
- Proxy implementations
- Edge cases and security considerations

### Running Tests Locally

```bash
# Run the test suite
npx hardhat test

# Run tests with coverage report
npx hardhat coverage
```

### Continuous Integration

The project uses GitHub Actions for automated testing. On every push and pull request to the main/master branch:
- Runs the full test suite on the Hardhat network
- Verifies contract compilation and functionality

The workflow configuration can be found in `.github/workflows/test.yml`.

## License

This project is licensed under the Business Source License 1.1 (MIT). See the [LICENSE](LICENSE) file for details.

The license terms include:
- 4-year commercial use restriction (until 2028-02-11)
- Non-production use allowed
- Converts to GPLv2 after the restriction period

## Contact

- Website: https://createdao.org
- Email: info@createdao.org
- Author: Diko

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Make sure to read the license terms before contributing.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
