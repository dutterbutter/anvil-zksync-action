// index.cjs

const { getInput, setFailed, addPath, info, debug } = require("@actions/core");
const { exec } = require("@actions/exec");
const tc = require("@actions/tool-cache");
const { spawn } = require("child_process");
const axios = require("axios");

// Constants
const DEFAULT_RELEASE_TAG = "latest";
const DEFAULT_ARCH = "x86_64-unknown-linux-gnu";
const DEFAULT_MODE = "run";
const DEFAULT_PORT = "8011";
const DEFAULT_HOST = "127.0.0.1";
const HEALTH_CHECK_RETRIES = 3;
const HEALTH_CHECK_DELAY = 2000; // in milliseconds

(async () => {
  try {
    const inputs = getInputs();
    validateInputs(inputs);

    const toolPath = await setupTool(inputs.releaseTag, inputs.target);

    const args = constructArgs(inputs);
    spawnProcess(toolPath, args);

    await performHealthCheck(inputs.host, inputs.port);

    info(`anvil-zksync started successfully on ${inputs.host}:${inputs.port}`);
  } catch (error) {
    setFailed(error.message);
  }
})();

/**
 * Fetches all necessary inputs for the action.
 * @returns {Object} - An object containing all inputs.
 */
function getInputs() {
  return {
    releaseTag: getInput("releaseTag") || DEFAULT_RELEASE_TAG,
    target: getInput("target") || DEFAULT_ARCH,
    mode: getInput("mode") || DEFAULT_MODE,
    forkUrl: getInput("forkUrl"),
    forkTransactionHash: getInput("forkTransactionHash"),
    forkBlockNumber: getInput("forkBlockNumber"),
    port: getInput("port") || DEFAULT_PORT,
    host: getInput("host") || DEFAULT_HOST,
    chainId: getInput("chainId"),
    debugMode: getInput("debugMode") === "true",
    showCalls: getInput("showCalls"),
    showOutputs: getInput("showOutputs"),
    showStorageLogs: getInput("showStorageLogs"),
    showVmDetails: getInput("showVmDetails"),
    showGasDetails: getInput("showGasDetails"),
    resolveHashes: getInput("resolveHashes") === "true",
    log: getInput("log") || "info",
    logFilePath: getInput("logFilePath") || "era_test_node.log",
    offline: getInput("offline") === "true",
    healthCheckEndpoint: getInput("healthCheckEndpoint") === "true",
    configOut: getInput("configOut"),
    l1GasPrice: getInput("l1GasPrice"),
    l2GasPrice: getInput("l2GasPrice"),
    l1PubdataPrice: getInput("l1PubdataPrice"),
    priceScaleFactor: getInput("priceScaleFactor"),
    limitScaleFactor: getInput("limitScaleFactor"),
    overrideBytecodesDir: getInput("overrideBytecodesDir"),
    devSystemContracts: getInput("devSystemContracts"),
    emulateEvm: getInput("emulateEvm") === "true",
    cache: getInput("cache") || "disk",
    resetCache: getInput("resetCache") === "true",
    cacheDir: getInput("cacheDir") || ".cache",
    accounts: getInput("accounts") || "10",
    balance: getInput("balance") || "10000",
    mnemonic: getInput("mnemonic"),
    mnemonicRandom: getInput("mnemonicRandom"),
    mnemonicSeedUnsafe: getInput("mnemonicSeedUnsafe"),
    derivationPath: getInput("derivationPath") || "m/44'/60'/0'/0/",
    autoImpersonate: getInput("autoImpersonate") === "true",
    blockTime: getInput("blockTime"),
  };
}

/**
 * Validates the inputs to ensure they meet expected formats and constraints.
 * @param {Object} inputs - The inputs to validate.
 */
function validateInputs(inputs) {
  const validModes = ["run", "fork"];
  if (!validModes.includes(inputs.mode)) {
    throw new Error(
      `Invalid mode '${inputs.mode}'. Valid options are: ${validModes.join(
        ", "
      )}`
    );
  }
  if (inputs.port) {
    const portNumber = parseInt(inputs.port, 10);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      throw new Error(
        `Invalid port '${inputs.port}'. It must be a number between 1 and 65535.`
      );
    }
  }
  if (inputs.mode === "fork" && !inputs.forkUrl) {
    throw new Error("forkUrl is required when mode is set to 'fork'.");
  }
}

/**
 * Downloads and sets up the anvil-zksync tool.
 * @param {string} releaseTag - The release tag to download.
 * @param {string} target - The target architecture.
 * @returns {Promise<string>} - The path to the tool.
 */
async function setupTool(releaseTag, target) {
  let toolPath = tc.find("anvil-zksync", releaseTag);

  if (!toolPath) {
    const downloadUrl = await getDownloadUrl(releaseTag, target);
    info(`Downloading anvil-zksync from ${downloadUrl}`);
    const tarFile = await tc.downloadTool(downloadUrl);
    const extractedDir = await tc.extractTar(tarFile);
    toolPath = await tc.cacheDir(extractedDir, "anvil-zksync", releaseTag);
    info(`anvil-zksync cached at ${toolPath}`);
  } else {
    info(`Found cached anvil-zksync at ${toolPath}`);
  }

  addPath(toolPath);

  // Make the anvil-zksync binary executable
  await exec("chmod", ["+x", `${toolPath}/anvil-zksync`]);
  info(`Set execute permissions for ${toolPath}/anvil-zksync`);

  return toolPath;
}

/**
 * Constructs the command-line arguments based on inputs.
 * @param {Object} inputs - The action inputs.
 * @returns {Array} - The array of command-line arguments.
 */
function constructArgs(inputs) {
  const args = [];

  // General Options
  if (inputs.offline) args.push("--offline");
  if (inputs.healthCheckEndpoint) args.push("--health-check-endpoint");
  if (inputs.configOut) args.push("--config-out", inputs.configOut);

  // Network Options
  if (inputs.port) args.push("--port", inputs.port);
  if (inputs.host) args.push("--host", inputs.host);
  if (inputs.chainId) args.push("--chain-id", inputs.chainId);

  // Block Sealing
  if (inputs.blockTime) args.push("--block-time", inputs.blockTime);

  // Debugging Options
  if (inputs.debugMode) args.push("--debug-mode");
  if (inputs.showCalls) args.push("--show-calls", inputs.showCalls);
  if (inputs.showOutputs) args.push("--show-outputs", inputs.showOutputs);
  if (inputs.showStorageLogs)
    args.push("--show-storage-logs", inputs.showStorageLogs);
  if (inputs.showVmDetails)
    args.push("--show-vm-details", inputs.showVmDetails);
  if (inputs.showGasDetails)
    args.push("--show-gas-details", inputs.showGasDetails);
  if (inputs.resolveHashes) args.push("--resolve-hashes");

  // Gas Configuration
  if (inputs.l1GasPrice) args.push("--l1-gas-price", inputs.l1GasPrice);
  if (inputs.l2GasPrice) args.push("--l2-gas-price", inputs.l2GasPrice);
  if (inputs.l1PubdataPrice)
    args.push("--l1-pubdata-price", inputs.l1PubdataPrice);
  if (inputs.priceScaleFactor)
    args.push("--price-scale-factor", inputs.priceScaleFactor);
  if (inputs.limitScaleFactor)
    args.push("--limit-scale-factor", inputs.limitScaleFactor);

  // System Configuration
  if (inputs.overrideBytecodesDir)
    args.push("--override-bytecodes-dir", inputs.overrideBytecodesDir);
  if (inputs.devSystemContracts)
    args.push("--dev-system-contracts", inputs.devSystemContracts);
  if (inputs.emulateEvm) args.push("--emulate-evm");

  // Logging Configuration
  if (inputs.log) args.push("--log", inputs.log);
  if (inputs.logFilePath) args.push("--log-file-path", inputs.logFilePath);

  // Cache Options
  if (inputs.cache) args.push("--cache", inputs.cache);
  if (inputs.resetCache) args.push("--reset-cache");
  if (inputs.cacheDir) args.push("--cache-dir", inputs.cacheDir);

  // Account Configuration
  if (inputs.accounts) args.push("--accounts", inputs.accounts);
  if (inputs.balance) args.push("--balance", inputs.balance);
  if (inputs.mnemonic) args.push("--mnemonic", inputs.mnemonic);
  if (inputs.mnemonicRandom)
    args.push("--mnemonic-random", inputs.mnemonicRandom);
  if (inputs.mnemonicSeedUnsafe)
    args.push("--mnemonic-seed-unsafe", inputs.mnemonicSeedUnsafe);
  if (inputs.derivationPath)
    args.push("--derivation-path", inputs.derivationPath);
  if (inputs.autoImpersonate) args.push("--auto-impersonate");

  // Mode Handling
  if (inputs.mode === "fork") {
    args.push("fork");
    args.push("--fork-url", inputs.forkUrl);
    if (inputs.forkBlockNumber)
      args.push("--fork-block-number", inputs.forkBlockNumber);
    if (inputs.forkTransactionHash)
      args.push("--fork-transaction-hash", inputs.forkTransactionHash);
  } else {
    args.push("run");
  }

  debug(`Constructed command-line arguments: ${args.join(" ")}`);
  return args;
}

/**
 * Spawns the anvil-zksync process with the given arguments.
 * @param {string} toolPath - The path to the tool.
 * @param {Array} args - The command-line arguments.
 * @returns {ChildProcess} - The spawned child process.
 */
function spawnProcess(toolPath, args) {
  info(`Starting anvil-zksync with args: ${args.join(" ")}`);

  const child = spawn(`${toolPath}/anvil-zksync`, args, {
    detached: true,
    stdio: "ignore",
  });

  child.on("error", (error) => {
    console.error(`Failed to start child process: ${error}`);
    setFailed(`Failed to start anvil-zksync: ${error.message}`);
  });

  child.on("exit", (code, signal) => {
    if (code) {
      info(`Child process exited with code ${code}`);
    } else if (signal) {
      info(`Child process killed with signal ${signal}`);
    } else {
      info("Child process exited");
    }
  });

  child.unref();
  return child;
}

/**
 * Performs a health check to verify if the node is running.
 * Implements retries for robustness.
 * @param {string} host - The host address.
 * @param {string} port - The port number.
 */
async function performHealthCheck(host, port) {
  for (let attempt = 1; attempt <= HEALTH_CHECK_RETRIES; attempt++) {
    if (await isNodeRunning(host, port)) {
      info(`Health check passed on attempt ${attempt}`);
      return;
    }
    if (attempt < HEALTH_CHECK_RETRIES) {
      info(
        `Health check attempt ${attempt} failed. Retrying in ${HEALTH_CHECK_DELAY}ms...`
      );
      await delay(HEALTH_CHECK_DELAY);
    }
  }
  throw new Error(
    `Health check failed: anvil-zksync is not running on ${host}:${port}.`
  );
}

/**
 * Delays execution for a specified duration.
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if the anvil-zksync node is running by sending a JSON-RPC request.
 * @param {string} host - The host address.
 * @param {string|number} port - The port number.
 * @returns {Promise<boolean>} - True if running, else false.
 */
async function isNodeRunning(host, port) {
  try {
    const url = `http://${host}:${port}`;
    const response = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      },
      {
        timeout: 3000, // 3 seconds
      }
    );
    return response.data && response.data.result !== undefined;
  } catch (error) {
    console.log(error);
    debug(`Health check failed for ${host}:${port} - ${error.message}`);
    return false;
  }
}

/**
 * Fetches the download URL for the anvil-zksync tool based on release tag and architecture.
 * @param {string} releaseTag - The release tag.
 * @param {string} arch - The architecture.
 * @returns {Promise<string>} - The download URL.
 */
async function getDownloadUrl(releaseTag, arch) {
  const apiUrl =
    releaseTag === "latest"
      ? "https://api.github.com/repos/dutterbutter/anvil-zksync/releases/latest"
      : `https://api.github.com/repos/dutterbutter/anvil-zksync/releases/tags/${releaseTag}`;

  info(`Fetching release information from ${apiUrl}`);

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch release info for tag ${releaseTag}. HTTP Status: ${response.status}`
    );
  }

  const releaseInfo = await response.json();

  if (!releaseInfo || !releaseInfo.assets || !releaseInfo.assets.length) {
    throw new Error(`No release assets found for tag ${releaseTag}.`);
  }

  const assetInfo = releaseInfo.assets.find((asset) =>
    asset.name.includes(arch)
  );

  if (!assetInfo) {
    throw new Error(
      `Asset with architecture ${arch} not found for tag ${releaseTag}.`
    );
  }

  info(`Found asset: ${assetInfo.name}`);
  return assetInfo.browser_download_url;
}
