import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const appRoot = process.cwd();
const scannerRoot = process.env.IDE_SCANNER_ROOT || path.resolve(appRoot, "../ide-scanner");
const scannerSrc = path.join(scannerRoot, "src");

export async function runPythonBridge<T>(command: "inventory" | "scan" | "benchmark" | "sandbox", payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand(), ["-m", "ide_scanner.web_bridge", command], {
      cwd: scannerRoot,
      env: {
        ...process.env,
        PYTHONPATH: [scannerSrc, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python bridge exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout || "{}") as T);
      } catch (error) {
        reject(error);
      }
    });

    if (payload !== undefined) {
      child.stdin.write(JSON.stringify(payload));
    }
    child.stdin.end();
  });
}

function pythonCommand(): string {
  return process.env.IDE_SCANNER_PYTHON || (process.platform === "win32" ? "python" : "python3");
}
