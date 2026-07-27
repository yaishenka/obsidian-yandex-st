import { SearchView } from "../src/searchView";

describe("SearchView", () => {
  it("parses raw query", () => {
    const view = SearchView.fromString("Assignee: me()");
    expect(view.query).toBe("Assignee: me()");
    expect(view.limit).toBeUndefined();
    expect(view.columns.map((column) => column.type)).toEqual([]);
  });

  it("preserves Tracker Type filters as raw query text", () => {
    const view = SearchView.fromString("Type: Bug");
    expect(view.query).toBe("Type: Bug");
  });

  it("parses configured table query", () => {
    const view = SearchView.fromString([
      "type: TABLE",
      "limit: 15",
      "columns: KEY, SUMMARY, STATUS",
      "query: Assignee: me()"
    ].join("\n"));
    expect(view.type).toBe("TABLE");
    expect(view.limit).toBe(15);
    expect(view.columns.map((column) => column.type)).toEqual(["KEY", "SUMMARY", "STATUS"]);
    expect(view.query).toBe("Assignee: me()");
  });
});
