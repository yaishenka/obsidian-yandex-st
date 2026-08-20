import { DEFAULT_SETTINGS, mergeSettings, resolveTokenFromText } from "../src/settings";

describe("settings", () => {
  it("uses the public Tracker endpoints as defaults", () => {
    expect(DEFAULT_SETTINGS.apiUrl).toBe("https://api.tracker.yandex.net");
    expect(DEFAULT_SETTINGS.webUrl).toBe("https://tracker.yandex.ru");
    expect(DEFAULT_SETTINGS.tokenPath).toBe("~/.tracker_token");
    expect(DEFAULT_SETTINGS.orgId).toBe("");
    expect(DEFAULT_SETTINGS.orgIdHeader).toBe("X-Org-ID");
    expect(DEFAULT_SETTINGS.inlinePrefix).toBe("ST:");
    expect(DEFAULT_SETTINGS.inlineIssueRawLink).toBe(false);
    expect(DEFAULT_SETTINGS.inlineIssueRawLinkTemplate).toBe("{{ key }} {{ summary }} ({{ status }})");
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

  it("keeps saved URLs, including a cleared web URL", () => {
    expect(mergeSettings({ webUrl: "https://tracker.example.com" }).webUrl).toBe("https://tracker.example.com");
    expect(mergeSettings({ webUrl: "" }).webUrl).toBe("");
  });

  it("trims token text and ignores empty content", () => {
    expect(resolveTokenFromText("  token-value\n")).toBe("token-value");
    expect(resolveTokenFromText("  \n")).toBeUndefined();
  });
});
