import { createInlineIssueRenderer } from "../src/rendering/inlineIssueRenderer";
import ObjectsCache from "../src/objectsCache";
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

  (globalThis as any).createSpan = (options?: any) => create("span", options);
  (globalThis as any).createEl = create;
}

beforeAll(installDomHelpers);

describe("inline issue renderer", () => {
  beforeEach(() => {
    ObjectsCache.clear();
    Object.assign(SettingsData, DEFAULT_SETTINGS);
  });

  it("replaces ST tags in reading mode", async () => {
    const client = { getIssue: jest.fn().mockResolvedValue({ key: "YT-1", summary: "One", status: { display: "Open", id: "open" } }) };
    const el = document.createElement("p");
    el.textContent = "See ST:YT-1 now";

    await createInlineIssueRenderer(client as any)(el, null as any);
    await Promise.resolve();

    expect(el.textContent).toContain("YT-1");
    expect(el.textContent).toContain("One");
  });

  it("replaces Tracker issue URLs in reading mode when enabled", async () => {
    SettingsData.webUrl = "https://tracker.yandex.ru";
    const client = { getIssue: jest.fn().mockResolvedValue({ key: "YT-123", summary: "From URL", status: { display: "Open", id: "open" } }) };
    const el = document.createElement("p");
    el.textContent = "See https://tracker.yandex.ru/YT-123 now";

    await createInlineIssueRenderer(client as any)(el, null as any);
    await Promise.resolve();

    expect(client.getIssue).toHaveBeenCalledWith("YT-123");
    expect(el.textContent).toContain("YT-123");
    expect(el.textContent).toContain("From URL");
  });

  it("replaces auto-linked Tracker URLs without nesting links", async () => {
    SettingsData.webUrl = "https://tracker.yandex.ru";
    const client = { getIssue: jest.fn().mockResolvedValue({ key: "YT-123", summary: "From URL", status: { display: "Open", id: "open" } }) };
    const el = document.createElement("p");
    el.innerHTML = '<a href="https://tracker.yandex.ru/YT-123">https://tracker.yandex.ru/YT-123</a>';

    await createInlineIssueRenderer(client as any)(el, null as any);
    await Promise.resolve();

    expect(el.querySelectorAll("a")).toHaveLength(1);
    expect(el.querySelector("a")?.textContent).toBe("YT-123");
  });

  it("prefers a whole Tracker URL over an inline tag inside its query", async () => {
    SettingsData.webUrl = "https://tracker.yandex.ru";
    const client = {
      getIssue: jest.fn().mockImplementation((key: string) => Promise.resolve({ key, summary: key, status: { display: "Open", id: "open" } }))
    };
    const el = document.createElement("p");
    el.textContent = "See https://tracker.yandex.ru/YT-123?next=ST:ABC-22 now";

    await createInlineIssueRenderer(client as any)(el, null as any);
    await Promise.resolve();

    expect(client.getIssue).toHaveBeenCalledTimes(1);
    expect(client.getIssue).toHaveBeenCalledWith("YT-123");
    expect(el.textContent).not.toContain("ABC-22");
  });

  it("leaves Tracker issue URLs unchanged when disabled", async () => {
    SettingsData.webUrl = "https://tracker.yandex.ru";
    SettingsData.inlineIssueUrlToTag = false;
    const client = { getIssue: jest.fn() };
    const el = document.createElement("p");
    el.textContent = "See https://tracker.yandex.ru/YT-123 now";

    await createInlineIssueRenderer(client as any)(el, null as any);

    expect(client.getIssue).not.toHaveBeenCalled();
    expect(el.textContent).toBe("See https://tracker.yandex.ru/YT-123 now");
  });

  it("leaves code, preformatted text, rendered issues, and custom links unchanged", async () => {
    const client = { getIssue: jest.fn().mockResolvedValue({ key: "GHI-4", summary: "Only plain text", status: { display: "Open", id: "open" } }) };
    const el = document.createElement("div");
    el.innerHTML = [
      "<code>ST:YT-1</code>",
      "<pre>ST:ABC-2</pre>",
      '<span class="st-inline-issue">ST:DEF-3</span>',
      '<a href="https://example.com">ST:XYZ-4</a>',
      "ST:GHI-4"
    ].join(" ");

    await createInlineIssueRenderer(client as any)(el, null as any);
    await Promise.resolve();

    expect(client.getIssue).toHaveBeenCalledTimes(1);
    expect(client.getIssue).toHaveBeenCalledWith("GHI-4");
    expect(el.querySelector("code")?.textContent).toBe("ST:YT-1");
    expect(el.querySelector("pre")?.textContent).toBe("ST:ABC-2");
    expect(el.querySelector(".st-inline-issue")?.textContent).toBe("ST:DEF-3");
    expect(el.querySelector("a")?.textContent).toBe("ST:XYZ-4");
  });
});
