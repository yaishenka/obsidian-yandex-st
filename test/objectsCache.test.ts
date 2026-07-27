import ObjectsCache from "../src/objectsCache";

describe("ObjectsCache", () => {
  beforeEach(() => ObjectsCache.clear());

  it("returns cached values before ttl expires", () => {
    ObjectsCache.setTtl("15m");
    ObjectsCache.add("issue:YT-1", { key: "YT-1" });
    expect(ObjectsCache.get("issue:YT-1")?.data).toEqual({ key: "YT-1" });
  });

  it("stores error entries", () => {
    ObjectsCache.add("issue:YT-1", "failed", true);
    expect(ObjectsCache.get("issue:YT-1")?.isError).toBe(true);
  });
});
