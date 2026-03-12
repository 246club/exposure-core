import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, "..", "..");
const graphsAllScriptPath = resolve(here, "graphs-all.ts");

const main = async (): Promise<void> => {
  const outputDir = await mkdtemp(resolve(tmpdir(), "exposure-graphs-"));

  try {
    const { status } = spawnSync(
      "pnpm",
      [
        "-s",
        "exec",
        "tsx",
        graphsAllScriptPath,
        "--upload",
        "--output-dir",
        outputDir,
      ],
      {
        cwd: serverDir,
        stdio: "inherit",
      },
    );

    if (status) process.exit(status);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
};

void main();
