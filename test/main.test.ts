import STPlugin from "../src/main";

describe("STPlugin", () => {
  it("loads without throwing", async () => {
    const plugin = new STPlugin({} as any, {} as any);

    await expect(plugin.onload()).resolves.toBeUndefined();
  });
});
