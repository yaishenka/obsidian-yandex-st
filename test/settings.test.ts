import { DEFAULT_SETTINGS, mergeSettings, resolveTokenFromText } from "../src/settings";

describe("settings", () => {
  it("uses public plugin defaults without organization-specific URLs", () => {
    expect(DEFAULT_SETTINGS.apiUrl).toBe("");
    expect(DEFAULT_SETTINGS.webUrl).toBe("");
    expect(DEFAULT_SETTINGS.tokenPath).toBe("~/.tracker_token");
    expect(DEFAULT_SETTINGS.orgId).toBe("");
    expect(DEFAULT_SETTINGS.orgIdHeader).toBe("X-Org-ID");
    expect(DEFAULT_SETTINGS.inlinePrefix).toBe("ST:");
    expect(DEFAULT_SETTINGS.language).toBe("ru");
  });

  it("fills missing saved settings with defaults", () => {
    const merged = mergeSettings({ searchResultsLimit: 25, token: "abc" });
    expect(merged.searchResultsLimit).toBe(25);
    expect(merged.token).toBe("abc");
    expect(merged.apiUrl).toBe(DEFAULT_SETTINGS.apiUrl);
    expect(merged.orgId).toBe("");
    expect(merged.orgIdHeader).toBe("X-Org-ID");
    expect(merged.searchColumns.map((column) => column.type)).toEqual(["KEY", "SUMMARY", "STATUS", "ASSIGNEE", "UPDATED"]);
  });

  it("keeps a saved organization ID and header", () => {
    const merged = mergeSettings({ orgId: "123456", orgIdHeader: "X-Cloud-Org-ID" });
    expect(merged.orgId).toBe("123456");
    expect(merged.orgIdHeader).toBe("X-Cloud-Org-ID");
  });

  it("clones default search columns for every settings merge", () => {
    const first = mergeSettings({});
    const second = mergeSettings({});

    first.searchColumns[0].type = "TYPE";

    expect(second.searchColumns[0].type).toBe("KEY");
    expect(DEFAULT_SETTINGS.searchColumns[0].type).toBe("KEY");
  });

  it("trims token text and ignores empty content", () => {
    expect(resolveTokenFromText("  token-value\n")).toBe("token-value");
    expect(resolveTokenFromText("  \n")).toBeUndefined();
  });
});
