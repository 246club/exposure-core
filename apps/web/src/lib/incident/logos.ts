/**
 * Centralized icn logo paths for all entities.
 * All icons live in /logos/icn/icn-{key}.png.
 */

const ICN = (key: string) => `/logos/icn/icn-${key}.png`;

const PROTOCOL_ICN: Record<string, string> = {
  morpho: ICN("morpho"),
  euler: ICN("euler"),
  midas: ICN("midas"),
  inverse: ICN("inversefinance"),
  fluid: ICN("fluid"),
  gearbox: ICN("gearbox"),
  venus: ICN("venusprotocol"),
  "lista-dao": ICN("listadao"),
  upshift: ICN("upshift"),
  yo: ICN("yo"),
  yields: ICN("yo"),
};

const CHAIN_ICN: Record<string, string> = {
  eth: ICN("ethereum"),
  base: ICN("base"),
  arb: ICN("arbitrum"),
  plasma: ICN("plasma"),
};

const ASSET_ICN: Record<string, string> = {
  usr: ICN("usr"),
  wstusr: ICN("wstusr"),
  rlp: ICN("rlp"),
};

const CURATOR_ICN: Record<string, string> = {
  gauntlet: ICN("gauntlet"),
  "re7-labs": ICN("re7labs"),
  re7: ICN("re7labs"),
  apostro: ICN("apostro"),
  "august-digital": ICN("augustdigital"),
  august: ICN("augustdigital"),
  "mev-capital": ICN("mevcapital"),
  mevcapital: ICN("mevcapital"),
  "9summits": ICN("9summits"),
  extrafi: ICN("extrafi"),
  clearstar: ICN("clearstar"),
  kpk: ICN("kpk"),
  keyrock: ICN("keyrock"),
  seamless: ICN("seamless"),
  steakhouse: ICN("steakhouse"),
};

export function getProtocolIcon(protocol: string): string {
  return PROTOCOL_ICN[protocol] ?? ICN(protocol);
}

export function getChainIcon(chain: string): string {
  return CHAIN_ICN[chain] ?? ICN(chain);
}

export function getAssetIcon(symbol: string): string | null {
  return ASSET_ICN[symbol.toLowerCase()] ?? null;
}

export function getCuratorIcon(curator: string): string | null {
  const key = curator.trim().toLowerCase().replace(/\s+/g, "");
  return CURATOR_ICN[key] ?? null;
}

/** @deprecated Use getCuratorIcon instead */
export function getCuratorLogoKey(displayName: string): string | null {
  const normalized = displayName.trim().toLowerCase().replace(/\s+/g, "");
  const mapping: Record<string, string> = {
    gauntlet: "gauntlet",
    re7: "re7-labs",
    re7labs: "re7-labs",
    mevcapital: "mev-capital",
    apostro: "apostro",
    august: "august-digital",
    augustdigital: "august-digital",
    clearstar: "clearstar",
    kpk: "kpk",
    keyrock: "keyrock",
    "9summits": "9summits",
    ninesummits: "9summits",
  };
  return mapping[normalized] ?? null;
}
