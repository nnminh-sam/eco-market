import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const childProcesses = [];
let isShuttingDown = false;

function spawnProcess(name, args) {
  const child = spawn(npmCommand, args, {
    stdio: "inherit",
    env: process.env,
  });

  childProcesses.push(child);

  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    shutdown();
    const exitReason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(`${name} stopped unexpectedly (${exitReason}).`);
    process.exit(code ?? 1);
  });
}

function shutdown() {
  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  shutdown();
  process.exit(0);
});

spawnProcess("API server", ["run", "dev:server"]);
spawnProcess("Vite client", ["run", "dev:client"]);
