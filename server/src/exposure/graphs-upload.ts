import { pathToFileURL } from "node:url";

import { adapterFactories } from "../adapters/registry";

import { putJsonToBlob } from "./blob";
import { graphProtocolBlobPath, searchIndexBlobPath } from "./paths";
import { buildProtocolGraphGroups } from "./protocolGraphs";
import { buildSearchIndexFromProtocolGroups } from "./searchIndex";

interface UploadGraphsResult {
  assetCount: number;
  protocolCount: number;
  protocols: {
    protocol: string;
    path: string;
    url: string;
    count: number;
  }[];
  searchIndexPath: string;
  searchIndexUrl: string;
}

export const uploadGraphs = async (): Promise<UploadGraphsResult> => {
  const factories = Object.values(adapterFactories);
  const { assetCount, groupedSnapshots } =
    await buildProtocolGraphGroups(factories);

  const protocols = await Promise.all(
    Array.from(groupedSnapshots.entries()).map(
      async ([protocol, snapshots]) => {
        const path = graphProtocolBlobPath(protocol);
        const url = await putJsonToBlob(path, snapshots);

        return {
          protocol,
          path,
          url,
          count: Object.keys(snapshots).length,
        };
      },
    ),
  );

  const searchIndex = buildSearchIndexFromProtocolGroups(
    groupedSnapshots.values(),
  );
  const searchIndexPath = searchIndexBlobPath();
  const searchIndexUrl = await putJsonToBlob(searchIndexPath, searchIndex);

  return {
    assetCount,
    protocolCount: protocols.length,
    protocols,
    searchIndexPath,
    searchIndexUrl,
  };
};

const main = async (): Promise<void> => {
  await uploadGraphs();
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main();
}
