# anvil-zksync Action 🚀

This repository has been renamed from `era-test-node-action` to `anvil-zksync-action`. All references to the previous name have been updated to reflect this change.

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
        uses: dutterbutter/anvil-zksync-action@v1.1.0
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
        uses: dutterbutter/anvil-zksync-action@v1.1.0
        with:
          mode: 'fork'
          forkUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID'
          forkBlockNumber: '12345678'
          port: '8545'
          chainId: '1'
          debugMode: 'true'
          showCalls: 'all'
          showStorageLogs: 'write'
          showVmDetails: 'all'
          showGasDetails: 'all'
          resolveHashes: 'true'
          log: 'debug'
          logFilePath: 'logs/anvil_zksync.log'
          target: 'x86_64-unknown-linux-gnu'
          releaseTag: 'latest'
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
        uses: dutterbutter/anvil-zksync-action@v1.1.0
        with:
          mode: 'fork'
          forkUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID'
          showCalls: 'user'
          showStorageLogs: 'read'
          showVmDetails: 'all'
          showGasDetails: 'all'
          resolveHashes: 'true'
          log: 'info'
          logFilePath: 'anvil_zksync.log'
          target: 'x86_64-unknown-linux-gnu'
          releaseTag: 'latest'

      - name: Install Dependencies
        run: yarn install
      
      - name: Run Tests
        run: |
          yarn test:contracts

      - name: Upload Anvil ZKSYNC Log
        uses: actions/upload-artifact@v3
        with:
          name: anvil_zksync-log
          path: anvil_zksync.log
```

### Using Custom Accounts

Run `anvil-zksync` with custom account configurations.

```yml
name: Run Anvil ZKSYNC Action

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
          log: 'debug'
          logFilePath: 'anvil_zksync.log'
          target: 'x86_64-unknown-linux-gnu'
          releaseTag: 'latest'
```

---

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
- **Example:** `v1.0.0`

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
The network URL to fork from (e.g., `https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID`). **Must be used alongside `mode` set to `fork`.**

- **Required:** No

---

### `forkBlockNumber`

**Description:**  
Fetch state from a specific block number over a remote endpoint. **Must be used alongside `mode` set to `fork`.**

- **Required:** No
- **Example:** `12345678`

---

### `forkTransactionHash`

**Description:**  
Fetch state from a specific transaction hash over a remote endpoint. **Must be used alongside `mode` set to `fork`.**

- **Required:** No
- **Example:** `0xabcdef123456...`

---

### `port`

**Description:**  
Port to listen on.

- **Required:** No
- **Default:** `8011`
- **Example:** `8545`

---

### `host`

**Description:**  
The host IP address to listen on.

- **Required:** No
- **Default:** `127.0.0.1`
- **Example:** `0.0.0.0`

---

### `chainId`

**Description:**  
Specify the chain ID.

- **Required:** No
- **Default:** `260`
- **Example:** `1`

---

### `debugMode`

**Description:**  
Enable debug mode for more verbose logging.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `showCalls`

**Description:**  
Show call debug information.

- **Required:** No
- **Default:** `none`
- **Options:** 
  - `none`
  - `user`
  - `system`
  - `all`

---

### `showOutputs`

**Description:**  
Show call output information.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `showStorageLogs`

**Description:**  
Show storage log information.

- **Required:** No
- **Default:** `none`
- **Options:** 
  - `none`
  - `read`
  - `write`
  - `paid`
  - `all`

---

### `showVmDetails`

**Description:**  
Show VM details information.

- **Required:** No
- **Default:** `none`
- **Options:** 
  - `none`
  - `all`

---

### `showGasDetails`

**Description:**  
Show gas details information.

- **Required:** No
- **Default:** `none`
- **Options:** 
  - `none`
  - `all`

---

### `resolveHashes`

**Description:**  
Enable ABI and topic name resolution for better readability.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `log`

**Description:**  
Log filter level.

- **Required:** No
- **Default:** `info`
- **Options:** 
  - `debug`
  - `info`
  - `warn`
  - `error`

---

### `logFilePath`

**Description:**  
Path to the log file.

- **Required:** No
- **Default:** `anvil_zksync.log`
- **Example:** `logs/anvil_zksync.log`

---

### `offline`

**Description:**  
Run in offline mode.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `healthCheckEndpoint`

**Description:**  
Enable health check endpoint.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `configOut`

**Description:**  
Output config file path.

- **Required:** No
- **Default:** Not set
- **Example:** `config.json`

---

### `l1GasPrice`

**Description:**  
Custom L1 gas price (in wei).

- **Required:** No
- **Default:** Not set
- **Example:** `20000000000`

---

### `l2GasPrice`

**Description:**  
Custom L2 gas price (in wei).

- **Required:** No
- **Default:** Not set
- **Example:** `1000000000`

---

### `l1PubdataPrice`

**Description:**  
Custom L1 pubdata price (in wei).

- **Required:** No
- **Default:** Not set
- **Example:** `1000000000`

---

### `priceScaleFactor`

**Description:**  
Gas price estimation scale factor.

- **Required:** No
- **Default:** Not set
- **Example:** `1.2`

---

### `limitScaleFactor`

**Description:**  
Gas limit estimation scale factor.

- **Required:** No
- **Default:** Not set
- **Example:** `1.1`

---

### `overrideBytecodesDir`

**Description:**  
Directory to override bytecodes.

- **Required:** No
- **Default:** Not set
- **Example:** `bytecodes/`

---

### `devSystemContracts`

**Description:**  
Option for system contracts.

- **Required:** No
- **Default:** Not set
- **Options:** 
  - `built-in`
  - `local`
  - `built-in-without-security`

---

### `emulateEvm`

**Description:**  
Enable EVM emulation.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `cache`

**Description:**  
Cache type.

- **Required:** No
- **Default:** `disk`
- **Options:** 
  - `none`
  - `memory`
  - `disk`

---

### `resetCache`

**Description:**  
Reset the local disk cache.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `cacheDir`

**Description:**  
Cache directory location for disk cache.

- **Required:** No
- **Default:** `.cache`
- **Example:** `/tmp/cache`

---

### `accounts`

**Description:**  
Number of dev accounts to generate and configure.

- **Required:** No
- **Default:** `10`
- **Example:** `20`

---

### `balance`

**Description:**  
The balance of every dev account in Ether.

- **Required:** No
- **Default:** `10000`
- **Example:** `5000`

---

### `mnemonic`

**Description:**  
BIP39 mnemonic phrase for generating accounts.

- **Required:** No
- **Default:** Not set
- **Example:** `test test test test test test test test test test test junk`

---

### `mnemonicRandom`

**Description:**  
Automatically generate a BIP39 mnemonic phrase.

- **Required:** No
- **Default:** `12` (number of words)
- **Example:** `24`

---

### `mnemonicSeedUnsafe`

**Description:**  
Generate a BIP39 mnemonic from a given seed (unsafe for production).

- **Required:** No
- **Default:** Not set
- **Example:** `0x123456789abcdef...`

---

### `derivationPath`

**Description:**  
Derivation path of the child key to be derived.

- **Required:** No
- **Default:** `m/44'/60'/0'/0/`
- **Example:** `m/44'/60'/0'/0/1`

---

### `autoImpersonate`

**Description:**  
Enable automatic impersonation on startup.

- **Required:** No
- **Default:** `false`
- **Options:** `true`, `false`

---

### `blockTime`

**Description:**  
Block time in seconds for interval sealing.

- **Required:** No
- **Default:** Not set
- **Example:** `15`

---

### Support

If you encounter issues not covered in the troubleshooting section, feel free to [open an issue](https://github.com/dutterbutter/anvil-zksync-action/issues) in the repository.

## Contributing 🤝

Feel free to open issues or PRs if you find any problems or have suggestions for improvements. Your contributions are more than welcome!

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Happy Testing! 🚀**