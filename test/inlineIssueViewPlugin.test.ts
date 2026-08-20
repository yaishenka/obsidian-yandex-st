import { EditorSelection, EditorState } from "@codemirror/state";
import { DecorationSet, EditorView } from "@codemirror/view";
import ObjectsCache from "../src/objectsCache";
import { createInlineIssueViewPlugin, InlineIssueWidget } from "../src/rendering/inlineIssueViewPlugin";
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

function createClient(key = "YT-1") {
  return { getIssue: jest.fn().mockResolvedValue({ key, summary: "Fix it", status: { id: "open", display: "Open" } }) };
}

async function renderWidget(widget: InlineIssueWidget): Promise<HTMLElement> {
  const dom = widget.toDOM();
  await Promise.resolve();
  return dom;
}

function pointerEventOn(type: string, target: Element): Event {
  return { type, target } as unknown as Event;
}

function createView(doc: string, cursor: number, client = createClient()) {
  const plugin = createInlineIssueViewPlugin(client as any);
  const view = new EditorView({
    state: EditorState.create({ doc, selection: EditorSelection.single(cursor), extensions: [plugin] }),
    parent: document.body
  });
  const specs = (): { from: number; to: number; spec: any }[] => {
    const decorations: DecorationSet = (view.plugin(plugin) as any).decorations;
    const ranges: { from: number; to: number; spec: any }[] = [];
    decorations.between(0, doc.length, (from, to, value) => {
      ranges.push({ from, to, spec: value.spec });
    });
    return ranges;
  };
  return { view, specs };
}

function decorationsAt(doc: string, cursor: number): { from: number; to: number; spec: any }[] {
  const { view, specs } = createView(doc, cursor);
  const ranges = specs();
  view.destroy();
  return ranges;
}

beforeAll(installDomHelpers);

describe("inline issue view plugin", () => {
  beforeEach(() => {
    ObjectsCache.clear();
    Object.assign(SettingsData, DEFAULT_SETTINGS);
  });

  it("renders a raw inline issue as a standard external link", async () => {
    SettingsData.inlineIssueRawLink = true;
    const dom = await renderWidget(new InlineIssueWidget("YT-1", false, createClient() as any));

    const link = dom.querySelector("a");
    expect(link?.className).toBe("st-inline-issue-raw external-link");
    expect(link?.getAttribute("href")).toBe("https://tracker.yandex.ru/YT-1");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("opens the link on click without letting the editor move the caret", async () => {
    SettingsData.inlineIssueRawLink = true;
    const open = jest.spyOn(window, "open").mockReturnValue(null);
    const dom = await renderWidget(new InlineIssueWidget("YT-1", false, createClient() as any));
    const link = dom.querySelector("a") as HTMLAnchorElement;

    const mousedown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(mousedown);
    link.dispatchEvent(click);

    expect(mousedown.defaultPrevented).toBe(true);
    expect(click.defaultPrevented).toBe(true);
    expect(open).toHaveBeenCalledWith("https://tracker.yandex.ru/YT-1", "_blank");
    open.mockRestore();
  });

  it("hides link clicks from the editor and forwards other clicks to it", async () => {
    const widget = new InlineIssueWidget("YT-1", false, createClient() as any);
    const dom = await renderWidget(widget);
    const link = dom.querySelector("a.st-key") as HTMLAnchorElement;
    const summary = dom.querySelector(".st-summary") as HTMLElement;

    expect(widget.ignoreEvent(pointerEventOn("mousedown", link))).toBe(true);
    expect(widget.ignoreEvent(pointerEventOn("click", link))).toBe(true);
    expect(widget.ignoreEvent(pointerEventOn("mousedown", summary))).toBe(false);
    expect(widget.ignoreEvent(new KeyboardEvent("keydown"))).toBe(true);
  });

  it("reuses the rendered link until the issue or the settings change", () => {
    const client = createClient() as any;
    const widget = new InlineIssueWidget("YT-1", false, client);

    expect(widget.eq(new InlineIssueWidget("YT-1", false, client))).toBe(true);
    expect(widget.eq(new InlineIssueWidget("YT-2", false, client))).toBe(false);
    expect(widget.eq(new InlineIssueWidget("YT-1", true, client))).toBe(false);

    SettingsData.inlineIssueRawLink = true;
    expect(widget.eq(new InlineIssueWidget("YT-1", false, client))).toBe(false);
  });

  it("replaces an inline issue tag with the rendered widget", () => {
    const ranges = decorationsAt("See ST:YT-1 now", 0);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ from: 4, to: 11 });
    expect(ranges[0].spec.widget).toBeInstanceOf(InlineIssueWidget);
  });

  it("shows the source text when the cursor touches the end of the tag", () => {
    const ranges = decorationsAt("See ST:YT-1 now", 11);

    expect(ranges).toHaveLength(1);
    expect(ranges[0].spec.widget).toBeUndefined();
    expect(ranges[0].spec.class).toBe("st-inline-source");
  });

  it("keeps the widget when the cursor stands clear of the tag", () => {
    const ranges = decorationsAt("See ST:YT-1 now", 13);

    expect(ranges[0].spec.widget).toBeInstanceOf(InlineIssueWidget);
  });

  it("renders a clickable link in live preview with default settings", async () => {
    SettingsData.inlinePrefix = "YT:";
    SettingsData.inlineIssueRawLink = true;
    const open = jest.spyOn(window, "open").mockReturnValue(null);
    const { view } = createView("Task YT:PUI-42 is open", 0, createClient("PUI-42"));
    await Promise.resolve();

    const link = view.dom.querySelector("a.st-inline-issue-raw") as HTMLAnchorElement;
    expect(link.className).toBe("st-inline-issue-raw external-link");
    expect(link.textContent).toBe("PUI-42 Fix it (Open)");

    link.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(open).toHaveBeenCalledWith("https://tracker.yandex.ru/PUI-42", "_blank");
    open.mockRestore();
    view.destroy();
  });

  it("renders the widget without a link when the web URL is cleared", async () => {
    SettingsData.webUrl = "";
    SettingsData.inlineIssueRawLink = true;
    const dom = await renderWidget(new InlineIssueWidget("YT-1", false, createClient() as any));

    expect(dom.querySelector("a")).toBeNull();
    expect(dom.textContent).toBe("YT-1 Fix it (Open)");
  });

  it("opens the link from inside the editor without revealing the source text", async () => {
    SettingsData.inlineIssueRawLink = true;
    const open = jest.spyOn(window, "open").mockReturnValue(null);
    const { view, specs } = createView("See ST:YT-1 now", 0);
    await Promise.resolve();

    const link = view.dom.querySelector("a.st-inline-issue-raw") as HTMLAnchorElement;
    link.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(open).toHaveBeenCalledWith("https://tracker.yandex.ru/YT-1", "_blank");
    expect(view.state.selection.main.from).toBe(0);
    expect(specs()[0].spec.widget).toBeInstanceOf(InlineIssueWidget);
    open.mockRestore();
    view.destroy();
  });
});
