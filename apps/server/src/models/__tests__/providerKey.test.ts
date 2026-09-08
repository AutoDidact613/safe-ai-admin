import { describe, it, expect } from "@jest/globals";
import { ProviderKey } from "../providerKey";

describe("ProviderKey model (#277)", () => {
  it("does not define a plaintext apiKey field in the schema", () => {
    expect(ProviderKey.schema.path("apiKey")).toBeUndefined();
  });

  it("never exposes apiKeyEncrypted via toJSON", () => {
    const doc = new ProviderKey({
      provider: "openai",
      apiKeyEncrypted: "encrypted-value",
      keyPrefix: "sk-***",
    });

    const json = doc.toJSON() as any;

    expect(json.apiKeyEncrypted).toBeUndefined();
    expect(json.apiKey).toBeUndefined();
  });
});
