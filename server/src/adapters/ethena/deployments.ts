import { normalizeNodeId, toDeploymentNodeIds } from "../deployments.js";

const PROTOCOL = "ethena" as const;

const USDE_CANONICAL_ROOT_ID =
  "eth:ethena:0x4c9edd5852cd905f086c759e8383e09bff1e68b3" as const;

const USDE_DEPLOYMENTS = {
  eth: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3",
  arb: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  base: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  bera: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  blast: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  bnb: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  fraxtal: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  kava: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  linea: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  manta: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  metis: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  mode: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  morph: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  mnt: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  op: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  plasma: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  scroll: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  swell: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  xlayer: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  zircuit: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
  zksync: "0x39fe7a0dacce31bd90418e3e659fb0b5f0b3db0d",
} as const;

const SUSDE_CANONICAL_ROOT_ID =
  "eth:ethena:0x9d39a5de30e57443bff2a8307a4256c8797a3497" as const;

const SUSDE_DEPLOYMENTS = {
  eth: "0x9d39a5de30e57443bff2a8307a4256c8797a3497",
  arb: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  base: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  bera: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  blast: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  bnb: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  fraxtal: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  kava: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  linea: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  manta: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  metis: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  mode: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  morph: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  mnt: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  op: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  plasma: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  scroll: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  swell: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  xlayer: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  zircuit: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
  zksync: "0xad17da2f6ac76746ef261e835c50b2651ce36da0",
} as const;

const DEPLOYMENT_CONFIGS = [
  { canonicalRootId: USDE_CANONICAL_ROOT_ID, chainToAddress: USDE_DEPLOYMENTS },
  {
    canonicalRootId: SUSDE_CANONICAL_ROOT_ID,
    chainToAddress: SUSDE_DEPLOYMENTS,
  },
] as const;

export const getEthenaDeploymentNodeIds = (rootNodeId: string): string[] => {
  const canonical = normalizeNodeId(rootNodeId);

  for (const config of DEPLOYMENT_CONFIGS) {
    if (canonical !== normalizeNodeId(config.canonicalRootId)) continue;

    return toDeploymentNodeIds(
      PROTOCOL,
      config.canonicalRootId,
      config.chainToAddress,
    );
  }

  return [];
};
