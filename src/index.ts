import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { exec } from "@actions/exec";
import { spawn } from "child_process";
import axios from "axios";

type Inputs = {
  releaseTag: string;
  target: string;
  mode: string;
  forkUrl?: string;
  forkBlockNumber?: string;
  forkTransactionHash?: string;
  port: string;
  host: string;
  chainId?: string;
  showStorageLogs?: string;
  showVmDetails?: string;
  showGasDetails?: string;
  log?: string;
  logFilePath?: string;
  offline: boolean;
  healthCheckEndpoint: boolean;
  configOut?: string;
  l1GasPrice?: string;
  l2GasPrice?: string;
  l1PubdataPrice?: string;
  priceScaleFactor?: string;
  limitScaleFactor?: string;
  overrideBytecodesDir?: string;
  devSystemContracts?: string;
  evmInterpreter: boolean;
  cache?: string;
  resetCache: boolean;
  cacheDir?: string;
  accounts?: string;
  balance?: string;
  mnemonic?: string;
  mnemonicRandom?: string;
  mnemonicSeedUnsafe?: string;
  derivationPath?: string;
  autoImpersonate: boolean;
  blockTime?: string;
  protocolVersion?: string;
  enforceBytecodeCompression: boolean;
  systemContractsPath?: string;
  showNodeConfig: boolean;
  verbosity: number;
  timestamp?: string;
  initFile?: string;
  state?: string;
  stateInterval?: string;
  dumpState?: string;
  preserveHistoricalStates: boolean;
  loadState?: string;
  noMining: boolean;
  allowOrigin?: string;
  noCors: boolean;
  order?: string;
  spawnL1?: string;
  externalL1?: string;
  autoExecuteL1: boolean;
  baseTokenSymbol?: string;
  baseTokenRatio?: string;
  extraArgs?: string;
};

const DEFAULTS = {
  releaseTag: "latest",
  target: "x86_64-unknown-linux-gnu",
  mode: "run",
  port: "8011",
  host: "127.0.0.1",
};

async function run() {
  try {
    const inputs = getInputs();
    validateInputs(inputs);

    const toolPath = await setupTool(inputs.releaseTag, inputs.target);

    const args = constructArgs(inputs);
    spawnProcess(toolPath, args);

    await performHealthCheck(inputs.host, inputs.port);

    core.info(`anvil-zksync started successfully on ${inputs.host}:${inputs.port}`);
  } catch (error: any) {
    core.setFailed(error.message || String(error));
  }
}

function getInputs(): Inputs {
  const getBool = (name: string, fallback: boolean) => {
    const v = core.getInput(name);
    return v === "" ? fallback : v === "true";
  };

  return {
    releaseTag: core.getInput("releaseTag") || DEFAULTS.releaseTag,
    target: core.getInput("target") || DEFAULTS.target,
    mode: core.getInput("mode") || DEFAULTS.mode,
    forkUrl: core.getInput("forkUrl") || undefined,
    forkBlockNumber: core.getInput("forkBlockNumber") || undefined,
    forkTransactionHash: core.getInput("forkTransactionHash") || undefined,
    port: core.getInput("port") || DEFAULTS.port,
    host: core.getInput("host") || DEFAULTS.host,
    chainId: core.getInput("chainId") || undefined,
    showStorageLogs: core.getInput("showStorageLogs") || undefined,
    showVmDetails: core.getInput("showVmDetails") || undefined,
    showGasDetails: core.getInput("showGasDetails") || undefined,
    log: core.getInput("log") || undefined,
    logFilePath: core.getInput("logFilePath") || undefined,
    offline: getBool("offline", false),
    healthCheckEndpoint: getBool("healthCheckEndpoint", false),
    configOut: core.getInput("configOut") || undefined,
    l1GasPrice: core.getInput("l1GasPrice") || undefined,
    l2GasPrice: core.getInput("l2GasPrice") || undefined,
    l1PubdataPrice: core.getInput("l1PubdataPrice") || undefined,
    priceScaleFactor: core.getInput("priceScaleFactor") || undefined,
    limitScaleFactor: core.getInput("limitScaleFactor") || undefined,
    overrideBytecodesDir: core.getInput("overrideBytecodesDir") || undefined,
    devSystemContracts: core.getInput("devSystemContracts") || undefined,
    evmInterpreter: getBool("evmInterpreter", false),
    cache: core.getInput("cache") || undefined,
    resetCache: getBool("resetCache", false),
    cacheDir: core.getInput("cacheDir") || undefined,
    accounts: core.getInput("accounts") || undefined,
    balance: core.getInput("balance") || undefined,
    mnemonic: core.getInput("mnemonic") || undefined,
    mnemonicRandom: core.getInput("mnemonicRandom") || undefined,
    mnemonicSeedUnsafe: core.getInput("mnemonicSeedUnsafe") || undefined,
    derivationPath: core.getInput("derivationPath") || undefined,
    autoImpersonate: getBool("autoImpersonate", false),
    blockTime: core.getInput("blockTime") || undefined,
    protocolVersion: core.getInput("protocolVersion") || undefined,
    enforceBytecodeCompression: core.getInput("enforceBytecodeCompression") === "true",
    systemContractsPath: core.getInput("systemContractsPath") || undefined,
    showNodeConfig: core.getInput("showNodeConfig") === "true",
    verbosity: parseInt(core.getInput("verbosity") || "0", 10),
    timestamp: core.getInput("timestamp") || undefined,
    initFile: core.getInput("init") || undefined,
    state: core.getInput("state") || undefined,
    stateInterval: core.getInput("stateInterval") || undefined,
    dumpState: core.getInput("dumpState") || undefined,
    preserveHistoricalStates: core.getInput("preserveHistoricalStates") === "true",
    loadState: core.getInput("loadState") || undefined,
    noMining: core.getInput("noMining") === "true",
    allowOrigin: core.getInput("allowOrigin") || undefined,
    noCors: core.getInput("noCors") === "true",
    order: core.getInput("order") || undefined,
    spawnL1: core.getInput("spawnL1") || undefined,
    externalL1: core.getInput("externalL1") || undefined,
    autoExecuteL1: core.getInput("autoExecuteL1") === "true",
    baseTokenSymbol: core.getInput("baseTokenSymbol") || undefined,
    baseTokenRatio: core.getInput("baseTokenRatio") || undefined,
    extraArgs: core.getInput("extra-args") || undefined,
  };
}

function validateInputs(inputs: Inputs) {
  const validModes = ["run", "fork"];
  if (!validModes.includes(inputs.mode)) {
    throw new Error(
      `Invalid mode '${inputs.mode}'. Valid options: ${validModes.join(", ")}`
    );
  }
  const port = parseInt(inputs.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port '${inputs.port}'. Must be between 1 and 65535.`
    );
  }
  if (inputs.mode === "fork" && !inputs.forkUrl) {
    throw new Error("forkUrl is required when mode is set to 'fork'.");
  }
}

async function setupTool(releaseTag: string, target: string): Promise<string> {
  let toolPath = tc.find("anvil-zksync", releaseTag);
  if (!toolPath) {
    const downloadUrl = await getDownloadUrl(releaseTag, target);
    core.info(`Downloading anvil-zksync from ${downloadUrl}`);
    const tarFile = await tc.downloadTool(downloadUrl);
    const extractedDir = await tc.extractTar(tarFile);
    toolPath = await tc.cacheDir(extractedDir, "anvil-zksync", releaseTag);
    core.info(`anvil-zksync cached at ${toolPath}`);
  } else {
    core.info(`Found cached anvil-zksync at ${toolPath}`);
  }
  core.addPath(toolPath);
  await exec("chmod", ["+x", `${toolPath}/anvil-zksync`]);
  core.info(`Set execute permissions for ${toolPath}/anvil-zksync`);
  return toolPath;
}

function constructArgs(inputs: Inputs): string[] {
  const args: string[] = [];

  // All mapped CLI options
  if (inputs.offline) args.push("--offline");
  if (inputs.healthCheckEndpoint) args.push("--health-check-endpoint");
  if (inputs.configOut) args.push("--config-out", inputs.configOut);
  if (inputs.protocolVersion) args.push("--protocol-version", inputs.protocolVersion);

  if (inputs.port) args.push("--port", inputs.port);
  if (inputs.host) args.push("--host", inputs.host);
  if (inputs.chainId) args.push("--chain-id", inputs.chainId);

  if (inputs.blockTime) args.push("--block-time", inputs.blockTime);

  if (inputs.showStorageLogs) args.push("--show-storage-logs", inputs.showStorageLogs);
  if (inputs.showVmDetails) args.push("--show-vm-details", inputs.showVmDetails);
  if (inputs.showGasDetails) args.push("--show-gas-details", inputs.showGasDetails);

  if (inputs.l1GasPrice) args.push("--l1-gas-price", inputs.l1GasPrice);
  if (inputs.l2GasPrice) args.push("--l2-gas-price", inputs.l2GasPrice);
  if (inputs.l1PubdataPrice) args.push("--l1-pubdata-price", inputs.l1PubdataPrice);
  if (inputs.priceScaleFactor) args.push("--price-scale-factor", inputs.priceScaleFactor);
  if (inputs.limitScaleFactor) args.push("--limit-scale-factor", inputs.limitScaleFactor);

  if (inputs.overrideBytecodesDir) args.push("--override-bytecodes-dir", inputs.overrideBytecodesDir);
  if (inputs.devSystemContracts) args.push("--dev-system-contracts", inputs.devSystemContracts);
  if (inputs.evmInterpreter) args.push("--evm-interpreter");

  if (inputs.log) args.push("--log", inputs.log);
  if (inputs.logFilePath) args.push("--log-file-path", inputs.logFilePath);

  if (inputs.cache) args.push("--cache", inputs.cache);
  if (inputs.resetCache) args.push("--reset-cache");
  if (inputs.cacheDir) args.push("--cache-dir", inputs.cacheDir);

  if (inputs.accounts) args.push("--accounts", inputs.accounts);
  if (inputs.balance) args.push("--balance", inputs.balance);
  if (inputs.mnemonic) args.push("--mnemonic", inputs.mnemonic);
  if (inputs.mnemonicRandom) args.push("--mnemonic-random", inputs.mnemonicRandom);
  if (inputs.mnemonicSeedUnsafe) args.push("--mnemonic-seed-unsafe", inputs.mnemonicSeedUnsafe);
  if (inputs.derivationPath) args.push("--derivation-path", inputs.derivationPath);
  if (inputs.autoImpersonate) args.push("--auto-impersonate");

  // System & bytecode
  if (inputs.enforceBytecodeCompression)   args.push("--enforce-bytecode-compression");
  if (inputs.systemContractsPath)          args.push("--system-contracts-path", inputs.systemContractsPath);

  // Debugging & verbosity
  if (inputs.showNodeConfig)               args.push("--show-node-config");
  if (inputs.verbosity > 0)                args.push("-".repeat(inputs.verbosity + 1)); // e.g. -vvv

  // State / snapshot
  if (inputs.timestamp)                    args.push("--timestamp", inputs.timestamp);
  if (inputs.initFile)                     args.push("--init", inputs.initFile);
  if (inputs.state)                        args.push("--state", inputs.state);
  if (inputs.stateInterval)                args.push("--state-interval", inputs.stateInterval);
  if (inputs.dumpState)                    args.push("--dump-state", inputs.dumpState);
  if (inputs.preserveHistoricalStates)     args.push("--preserve-historical-states");
  if (inputs.loadState)                    args.push("--load-state", inputs.loadState);

  // Mining / server
  if (inputs.noMining)                     args.push("--no-mining");
  if (inputs.allowOrigin)                  args.push("--allow-origin", inputs.allowOrigin);
  if (inputs.noCors)                       args.push("--no-cors");
  if (inputs.order)                        args.push("--order", inputs.order);

  // L1 support
  if (inputs.spawnL1)                      args.push("--spawn-l1", inputs.spawnL1);
  if (inputs.externalL1)                   args.push("--external-l1", inputs.externalL1);
  if (inputs.autoExecuteL1)                args.push("--auto-execute-l1");

  // Custom base token
  if (inputs.baseTokenSymbol)              args.push("--base-token-symbol", inputs.baseTokenSymbol);
  if (inputs.baseTokenRatio)               args.push("--base-token-ratio", inputs.baseTokenRatio);

  // Pass any extra raw args (advanced users)
  if (inputs.extraArgs && inputs.extraArgs.trim().length > 0) {
    args.push(...inputs.extraArgs.trim().split(/\s+/));
  }

  if (inputs.mode === "fork") {
    args.push("fork");
    if (inputs.forkUrl) args.push("--fork-url", inputs.forkUrl);
    if (inputs.forkBlockNumber) args.push("--fork-block-number", inputs.forkBlockNumber);
    if (inputs.forkTransactionHash) args.push("--fork-transaction-hash", inputs.forkTransactionHash);
  } else {
    args.push("run");
  }

  core.debug(`Constructed command-line arguments: ${args.join(" ")}`);
  return args;
}

function spawnProcess(toolPath: string, args: string[]): void {
  core.info(`Starting anvil-zksync with args: ${args.join(" ")}`);

  const child = spawn(`${toolPath}/anvil-zksync`, args, {
    detached: true,
    stdio: "ignore",
  });

  child.stdout?.on("data", (chunk) => core.info(chunk.toString()));
  child.stderr?.on("data", (chunk) => core.error(chunk.toString()));

  // run in background
  child.unref();
}

async function performHealthCheck(host: string, port: string): Promise<void> {
  const HEALTH_CHECK_RETRIES = 3;
  const HEALTH_CHECK_DELAY = 8000;

  // Wait before the first health check
  await delay(HEALTH_CHECK_DELAY);
  for (let attempt = 1; attempt <= HEALTH_CHECK_RETRIES; attempt++) {
    if (await isNodeRunning(host, port)) {
      core.info(`Health check passed on attempt ${attempt}`);
      return;
    }
    if (attempt < HEALTH_CHECK_RETRIES) {
      core.info(
        `Health check attempt ${attempt} failed. Retrying in ${HEALTH_CHECK_DELAY}ms...`
      );
      await delay(HEALTH_CHECK_DELAY);
    }
  }
  throw new Error(
    `Health check failed: anvil-zksync is not running on ${host}:${port}.`
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isNodeRunning(host: string, port: string): Promise<boolean> {
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
      { timeout: 3000 }
    );
    return response.data && response.data.result !== undefined;
  } catch (error: any) {
    core.debug(`Health check failed for ${host}:${port} - ${error.message}`);
    return false;
  }
}

async function getDownloadUrl(releaseTag: string, arch: string): Promise<string> {
  const apiUrl =
    releaseTag === "latest"
      ? "https://api.github.com/repos/matter-labs/anvil-zksync/releases/latest"
      : `https://api.github.com/repos/matter-labs/anvil-zksync/releases/tags/${releaseTag}`;
  core.info(`Fetching release information from ${apiUrl}`);
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
  const assetInfo = releaseInfo.assets.find((asset: any) =>
    asset.name.includes(arch)
  );
  if (!assetInfo) {
    throw new Error(
      `Asset with architecture ${arch} not found for tag ${releaseTag}.`
    );
  }
  core.info(`Found asset: ${assetInfo.name}`);
  return assetInfo.browser_download_url;
}

run();
