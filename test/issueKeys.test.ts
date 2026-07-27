import { findInlineIssueTags, parseIssueKeyLine } from "../src/parsing/issueKeys";

describe("issue key parsing", () => {
  it("parses plain keys and ST URLs", () => {
    expect(parseIssueKeyLine("YT-123")).toBe("YT-123");
    expect(parseIssueKeyLine("https://tracker.yandex.ru/YT-456", "https://tracker.yandex.ru")).toBe("YT-456");
  });

  it("does not parse URLs when no web URL is configured", () => {
    expect(parseIssueKeyLine("https://tracker.yandex.ru/YT-456")).toBeNull();
  });

  it("ignores comments and false positives", () => {
    expect(parseIssueKeyLine("# YT-123")).toBeNull();
    expect(parseIssueKeyLine("UTF-8")).toBeNull();
  });

  it("finds inline full and compact tags", () => {
    expect(findInlineIssueTags("See ST:YT-1 and ST:-ABC-22", "ST:")).toEqual([
      { raw: "ST:YT-1", key: "YT-1", compact: false, index: 4 },
      { raw: "ST:-ABC-22", key: "ABC-22", compact: true, index: 16 }
    ]);
  });

  it("escapes metacharacter prefixes", () => {
    expect(findInlineIssueTags(".YT-1", ".")).toEqual([
      { raw: ".YT-1", key: "YT-1", compact: false, index: 0 }
    ]);
    expect(findInlineIssueTags("*ABC-2", "*")).toEqual([
      { raw: "*ABC-2", key: "ABC-2", compact: false, index: 0 }
    ]);
    expect(findInlineIssueTags("[DEF-3", "[")).toEqual([
      { raw: "[DEF-3", key: "DEF-3", compact: false, index: 0 }
    ]);
  });

  it("requires inline tag boundaries", () => {
    expect(findInlineIssueTags("pasteST:YT-1 ST:ABC-2x ST:DEF-3", "ST:")).toEqual([
      { raw: "ST:DEF-3", key: "DEF-3", compact: false, index: 23 }
    ]);
  });
});
