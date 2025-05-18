# anvil-zksync Action 🚀

## Description

This GitHub Action runs the [`anvil-zksync`](https://github.com/matter-labs/anvil-zksync) with various options. It offers high configurability, making it easy to integrate `anvil-zksync` into your CI/CD workflows on GitHub Actions.

**anvil-zksync repo**: [matter-labs/anvil-zksync](https://github.com/matter-labs/anvil-zksync).

## Features 🌟

- **Multiple Modes:** Supports `run` and `fork` modes for flexible testing scenarios.
- **Network Forking:** Allows you to fork from any network (e.g., `mainnet`, `sepolia-testnet`) at a specific block height or transaction hash.
- **Detailed Logging:** Configurable options to display calls, storage logs, VM details, and gas details.
- **Hash Resolution:** Enables ABI and topic name resolution for better readability.
- **Customizable Gas Configuration:** Set custom gas prices and scale factors for more accurate simulations.
- **System Configuration:** Override bytecodes and specify system contracts for advanced setups.
- **Caching Mechanism:** Supports in-memory or disk caching with options to reset or specify cache directories.
- **Account Management:** Configure the number of dev accounts, their balances, and derivation paths.

## Example Usage 📝

### Quickstart

Run `anvil-zksync` with default settings.

```yml
name: Run anvil-zksync

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run anvil-zksync
        uses: dutterbutter/anvil-zksync-action@v1.2.0
```

### Forking from Mainnet

Run `anvil-zksync` in fork mode, forking from mainnet at a specific block height.

```yml
name: Run anvil-zksync

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run anvil-zksync with fork
        uses: dutterbutter/anvil-zksync-action@v1.2.0
        with:
          mode: 'fork'
          forkUrl: 'era'
          forkBlockNumber: '12345678'
          port: '3050'
          logFilePath: 'logs/anvil_zksync.log'
          target: 'x86_64-unknown-linux-gnu'
          releaseTag: 'v0.6.1'
```

### Upload Log File to Artifacts

Run `anvil-zksync` and upload the log file as a GitHub Action artifact.

```yml
name: Run anvil-zksync

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v3
      
      - name: Run anvil-zksync
        uses: dutterbutter/anvil-zksync-action@v1.2.0
        with:
          mode: 'fork'
          forkUrl: 'era'
          logFilePath: 'anvil_zksync.log'
          target: 'x86_64-unknown-linux-gnu'
          releaseTag: 'v0.6.1'

      - name: Install Dependencies
        run: yarn install
      
      - name: Run Tests
        run: |
          yarn test:contracts

      - name: Upload Anvil-zksync Log
        uses: actions/upload-artifact@v4
        with:
          name: anvil_zksync-log
          path: anvil_zksync.log
```

### Using Custom Accounts

Run `anvil-zksync` with custom account configurations.

```yml
name: Run Anvil-zksync Action

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run Anvil ZKSync with EVM Emulation
        uses: dutterbutter/anvil-zksync-action@v1.1.0
        with:
          mode: 'run'
          accounts: '20'
          balance: '5000'
          mnemonic: 'test test test test test test test test test test test junk'
          derivationPath: "m/44'/60'/0'/0/"
          autoImpersonate: 'true'
          blockTime: '15'
          logFilePath: 'anvil_zksync.log'
          target: 'x86_64-unknown-linux-gnu'
          releaseTag: 'v0.6.1'
```

## Additional Information

### Handling Sensitive Inputs Securely

Ensure that sensitive inputs like `mnemonic` are stored securely using GitHub Secrets and not exposed in logs. For example, use the `secrets` context to pass sensitive data:

```yml
- name: Run anvil-zksync
  uses: dutterbutter/anvil-zksync-action@v1.1.0
  with:
    mnemonic: ${{ secrets.MNEMONIC }}
    # ... other inputs
```

## Inputs 🛠

### `releaseTag`

**Description:**  
Release tag of `anvil-zksync` to use.

- **Required:** No
- **Default:** `latest`
- **Example:** `v0.6.0`

---

### `target`

**Description:**  
Target architecture for the `anvil-zksync` binary.

- **Required:** No
- **Default:** `x86_64-unknown-linux-gnu`
- **Options:** 
  - `x86_64-unknown-linux-gnu`
  - `x86_64-apple-darwin`
  - `aarch64-apple-darwin`

---

### `mode`

**Description:**  
Mode to run `anvil-zksync` in.

- **Required:** No
- **Default:** `run`
- **Options:** 
  - `run`
  - `fork`

---

### `forkUrl`

**Description:**  
The network URL to fork from (e.g., `era`, `abstract`). **Must be used alongside `mode` set to `fork`.**

- **Required:** No

---

`anvil-zksync-action` supports all CLI options and subcommands as [matter-labs/anvil-zksync](https://github.com/matter-labs/anvil-zksync). Check out the repo for additional CLI support.

### Support

If you encounter issues not covered in the troubleshooting section, feel free to [open an issue](https://github.com/dutterbutter/anvil-zksync-action/issues) in the repository.

## Contributing 🤝

Feel free to open issues or PRs if you find any problems or have suggestions for improvements. Your contributions are more than welcome!

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Happy Testing! 🚀**
