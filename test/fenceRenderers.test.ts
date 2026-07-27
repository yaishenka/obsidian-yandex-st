import { createCountFenceRenderer } from "../src/rendering/countFenceRenderer";
import { createIssueFenceRenderer } from "../src/rendering/issueFenceRenderer";
import { createSearchFenceRenderer } from "../src/rendering/searchFenceRenderer";
import ObjectsCache from "../src/objectsCache";

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
  (HTMLElement.prototype as any).createEl = function(tag: string, options?: any): HTMLElement {
    return create(tag, { ...options, parent: this });
  };
}

beforeAll(installDomHelpers);

function afterTick<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 0));
}

describe("fence renderers", () => {
  beforeEach(() => ObjectsCache.clear());

  it("renders issue fence results", async () => {
    const client = {
      getIssue: jest.fn().mockImplementation(() => afterTick({ key: "YT-1", summary: "One", status: { id: "open", display: "Open" } }))
    };
    const el = document.createElement("div");

    await createIssueFenceRenderer(client as any)("YT-1", el, null as any);

    expect(el.textContent).toContain("YT-1");
    expect(el.textContent).toContain("One");
  });

  it("renders search table results", async () => {
    const client = {
      searchIssues: jest.fn().mockImplementation(() => afterTick({
        issues: [{ key: "YT-1", summary: "One", status: { display: "Open", id: "open" } }],
        total: 1
      }))
    };
    const el = document.createElement("div");

    await createSearchFenceRenderer(client as any)("query: Assignee: me()", el, null as any);

    expect(el.querySelector("table")?.textContent).toContain("YT-1");
  });

  it("renders count results", async () => {
    const client = { countIssues: jest.fn().mockImplementation(() => afterTick(3)) };
    const el = document.createElement("div");

    await createCountFenceRenderer(client as any)("Assignee: me()", el, null as any);

    expect(el.textContent).toContain("3");
  });
});
