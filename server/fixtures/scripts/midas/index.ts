import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { adapterFactories } from "../../../src/adapters/registry.js";
import { getMidasDeploymentNodeIds } from "../../../src/adapters/midas/deployments.js";
import type { GraphSnapshot } from "../../../src/types.js";
import { buildDraftGraphsByAsset } from "../../../src/orchestrator.js";
import {
  cloneSnapshotWithRootId,
  resolveFixtureOutputPath,
  writeJsonFile,
} from "../core/io.js";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, "..", "..", "..");

export const run = async (argv: string[]): Promise<void> => {
  const root = serverDir;
  const draftGraphs = await buildDraftGraphsByAsset([adapterFactories.midas]);

  for (const [asset, store] of draftGraphs) {
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
