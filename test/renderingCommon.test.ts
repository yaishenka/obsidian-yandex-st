import RC from "../src/rendering/renderingCommon";
import { renderTableColumn } from "../src/rendering/renderTableColumns";
import { DEFAULT_SETTINGS, SettingsData } from "../src/settings";

function installDomHelpers(): void {
  const create = (tag: string, options: any = {}): HTMLElement => {
    const el = document.createElement(tag);
    if (options.cls) el.className = options.cls;
    if (options.text !== undefined) el.textContent = options.text;
    if (options.href) el.setAttribute("href", options.href);
    options.parent?.appendChild(el);
    return el;
  };

  (globalThis as any).createDiv = (options?: any) => create("div", options);
  (globalThis as any).createSpan = (options?: any) => create("span", options);
  (globalThis as any).createEl = create;
}

beforeAll(installDomHelpers);

describe("renderingCommon", () => {
  beforeEach(() => {
    Object.assign(SettingsData, DEFAULT_SETTINGS);
  });

  it("renders issue chip with key summary and status", () => {
    const el = RC.renderIssue({
      key: "YT-1",
      summary: "Fix it",
      status: { id: "open", display: "Open" },
      assignee: { display: "Alice" }
    });
    expect(el.textContent).toContain("YT-1");
    expect(el.textContent).toContain("Fix it");
    expect(el.textContent).toContain("Open");
    expect(el.querySelector("a")).toBeNull();
  });

  it("links issue chips when web URL is configured", () => {
    SettingsData.webUrl = "https://tracker.yandex.ru";
    const el = RC.renderIssue({
      key: "YT-1",
      summary: "Fix it",
      status: { id: "open", display: "Open" }
    });
    expect(el.querySelector("a")?.getAttribute("href")).toBe("https://tracker.yandex.ru/YT-1");
  });

  it("renders a raw inline issue as a regular link from the template", () => {
    SettingsData.webUrl = "https://tracker.yandex.ru";
    SettingsData.inlineIssueRawLink = true;
    SettingsData.inlineIssueRawLinkTemplate = "{{ key }} {{ summary }} ({{ status }})";
    const el = RC.renderInlineIssue({
      key: "YT-1",
      summary: "Fix it",
      status: { id: "open", display: "Open" }
    });
    expect(el.tagName).toBe("A");
    expect(el.className).toBe("st-inline-issue-raw");
    expect(el.getAttribute("href")).toBe("https://tracker.yandex.ru/YT-1");
    expect(el.getAttribute("target")).toBe("_blank");
    expect(el.textContent).toBe("YT-1 Fix it (Open)");
    expect(el.querySelector(".st-tag")).toBeNull();
  });

  it("keeps chip rendering for fence issues when raw inline links are enabled", () => {
    SettingsData.inlineIssueRawLink = true;
    const el = RC.renderIssue({
      key: "YT-1",
      summary: "Fix it",
      status: { id: "open", display: "Open" }
    });
    expect(el.className).toContain("st-issue-chip");
    expect(el.textContent).toContain("Fix it");
  });

  it("renders compact issue without summary", () => {
    const el = RC.renderIssue({ key: "YT-1", summary: "Fix it", status: { id: "open", display: "Open" } }, true);
    expect(el.textContent).toContain("YT-1");
    expect(el.textContent).not.toContain("Fix it");
  });

  it("renders loading items and containers", () => {
    const child = RC.renderLoadingItem("Issues");
    const container = RC.renderContainer([child]);
    expect(container.className).toBe("st-container");
    expect(container.textContent).toBe("IssuesLoading ...");
    expect(RC.renderLoadingItem("Issue", true).tagName).toBe("SPAN");
  });

  it("renders errors and count chips", () => {
    const error = RC.renderIssueError("YT-1", new Error("Not found"));
    const count = RC.renderCountChip("Queue: YT", 3);
    expect(error.textContent).toBe("YT-1Not found");
    expect(count.textContent).toBe("3Queue: YT");
  });

  it("renders configured table columns", () => {
    SettingsData.webUrl = "https://tracker.yandex.ru";
    const issue = {
      key: "YT-1",
      summary: "Fix it",
      status: { id: "open", display: "Open" },
      assignee: { login: "alice" },
      updatedAt: "not-a-date",
      priority: { id: "high", display: "High" },
      type: { id: "bug", display: "Bug" }
    };
    const row = document.createElement("tr");
    ["KEY", "SUMMARY", "STATUS", "ASSIGNEE", "UPDATED", "PRIORITY", "TYPE"].forEach((type) => {
      renderTableColumn({ type: type as any, compact: false }, issue, row);
    });
    expect(row.cells).toHaveLength(7);
    expect(row.cells[0].querySelector("a")?.getAttribute("href")).toBe("https://tracker.yandex.ru/YT-1");
    expect(Array.from(row.cells).map((cell) => cell.textContent)).toEqual([
      "YT-1", "Fix it", "Open", "alice", "not-a-date", "High", "Bug"
    ]);
  });

  it("normalizes a trailing slash in the issue URL", () => {
    SettingsData.webUrl = "https://tracker.yandex.ru/";
    expect(RC.issueUrl("YT-1")).toBe("https://tracker.yandex.ru/YT-1");
  });
});
