import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { adapterFactories } from "../../../src/adapters/registry.js";
import { getMidasDeploymentNodeIds } from "../../../src/adapters/midas/deployments.js";
import type { GraphSnapshot } from "../../../src/types.js";
import { buildDraftGraphsByAsset } from "../../../src/orchestrator.js";
import {
  cloneSnapshotWithRootId,
  readJson,
  resolveFixtureOutputPath,
  writeJsonFile,
} from "../core/io.js";

interface Scenario {
  name: string;
  assets: string[];
}

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, "..", "..", "..");

const getFlagValue = (argv: string[], flag: string): string | null => {
  const idx = argv.indexOf(flag);
  const value = idx >= 0 ? argv[idx + 1] : null;
  return value && !value.startsWith("--") ? value : null;
};

const loadScenarios = async (argv: string[]): Promise<Scenario[]> => {
  const root = serverDir;
  const scenariosDir = resolve(root, "fixtures", "scenarios");

  const scenarioName = getFlagValue(argv, "--scenario");
  if (scenarioName) {
    const scenarioPath = resolve(scenariosDir, `${scenarioName}.json`);
    const scenario = await readJson<Scenario>(scenarioPath);
    return [scenario];
  }

  const shouldAll = argv.includes("--all") || argv.length === 0;
  if (!shouldAll) return [];

  const files = (await readdir(scenariosDir, { withFileTypes: true }))
    .filter((ent) => ent.isFile() && ent.name.endsWith(".json"))
    .map((ent) => resolve(scenariosDir, ent.name));

  const scenarios: Scenario[] = [];
  for (const file of files) {
    const scenario = await readJson<Scenario>(file);
    if (!scenario?.name || !Array.isArray(scenario.assets)) continue;
    if (!scenario.name.startsWith("m")) continue;
    scenarios.push(scenario);
  }

  return scenarios;
};

const collectScenarioAssets = (scenarios: Scenario[]): Set<string> => {
  const requestedAssets = new Set<string>();

  for (const scenario of scenarios) {
    for (const asset of scenario.assets) requestedAssets.add(asset);
  }

  return requestedAssets;
};

export const run = async (argv: string[]): Promise<void> => {
  const root = serverDir;
  const scenarios = await loadScenarios(argv);
  const requestedAssets = collectScenarioAssets(scenarios);
  const draftGraphs = await buildDraftGraphsByAsset([adapterFactories.midas]);

  for (const [asset, store] of draftGraphs) {
    if (requestedAssets.size > 0 && !requestedAssets.has(asset)) continue;

    const snapshot: GraphSnapshot = store.toSnapshot({ sources: ["midas"] });
    const rootNodeId = snapshot.nodes[0]?.id;
    if (!rootNodeId) {
      throw new Error(`Missing root node id for asset: ${asset}`);
    }

    const persistSnapshot = async (
      nextRootId: string,
      payload: GraphSnapshot,
    ): Promise<void> => {
      const outPath = resolveFixtureOutputPath(
        root,
        "midas",
        `${nextRootId}.json`,
        argv,
      );

      await writeJsonFile(outPath, payload);
    };

    const deploymentNodeIds = getMidasDeploymentNodeIds(asset);

    if (deploymentNodeIds.length > 0) {
      for (const nextRootId of deploymentNodeIds) {
        const depSnapshot = cloneSnapshotWithRootId(snapshot, nextRootId);

        await persistSnapshot(nextRootId, depSnapshot);
      }
    }

    if (!deploymentNodeIds.includes(rootNodeId)) {
      await persistSnapshot(rootNodeId, snapshot);
    }
  }
};

void run(process.argv.slice(2));
