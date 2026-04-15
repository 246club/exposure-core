import { describe, expect, it } from "vitest";

import { canonicalizeNodeId, extractAddressKeyFromNodeId } from "./nodeId";

describe("canonicalizeNodeId", () => {
  it("normalizes a decoded graph node id", () => {
    expect(
      canonicalizeNodeId(
        "ETH:Morpho V1:0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2",
      ),
    ).toBe("eth:morpho-v1:0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2");
  });

  it("normalizes a once-encoded route param id", () => {
    expect(
      canonicalizeNodeId(
        "eth%3Amorpho-v1%3A0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2",
      ),
    ).toBe("eth:morpho-v1:0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2");
  });

  it("normalizes a double-encoded route param id", () => {
    expect(
      canonicalizeNodeId(
        "eth%253Amorpho-v1%253A0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2",
      ),
    ).toBe("eth:morpho-v1:0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2");
  });
});

describe("extractAddressKeyFromNodeId", () => {
  it("extracts a chain+address key from an encoded id", () => {
    expect(
      extractAddressKeyFromNodeId(
        "eth%3Amorpho-v1%3A0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2",
      ),
    ).toBe("eth:0x443df5eee3196e9b2dd77cabd3ea76c3dee8f9b2");
  });
});
