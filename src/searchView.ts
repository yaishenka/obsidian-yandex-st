import { SearchColumn, SearchColumnType } from "./interfaces/settingsInterfaces";

export type SearchRenderingType = "TABLE";

const VALID_COLUMNS = new Set<SearchColumnType>(["KEY", "SUMMARY", "STATUS", "ASSIGNEE", "UPDATED", "PRIORITY", "TYPE"]);

export class SearchView {
  constructor(
    readonly query: string,
    readonly type: SearchRenderingType = "TABLE",
    readonly limit?: number,
    readonly columns: SearchColumn[] = []
  ) {}

  static fromString(source: string): SearchView {
    const lines = source.split("\n").map((line) => line.trim()).filter(Boolean);
    const values = new Map<string, string>();
    const queryLines: string[] = [];
    const metadataEnabled = lines.some((line) => /^(limit|columns|query):\s*/i.test(line));

    for (const line of lines) {
      const keyValue = /^(type|limit|columns|query):\s*(.*)$/i.exec(line);
      if (metadataEnabled && keyValue) {
        values.set(keyValue[1].toLowerCase(), keyValue[2]);
      } else if (!line.startsWith("#")) {
        queryLines.push(line);
      }
    }

    const query = values.get("query") ?? queryLines.join("\n").trim();
    const type = ((values.get("type") ?? "TABLE").toUpperCase() === "TABLE" ? "TABLE" : "TABLE") as SearchRenderingType;
    const parsedLimit = values.has("limit") ? Number(values.get("limit")) : undefined;
    const limit = parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
    const columns = parseColumns(values.get("columns"));
    return new SearchView(query, type, limit, columns);
  }

  getCacheKey(defaultLimit: number): string {
    return `search:${this.query}|limit:${this.limit ?? defaultLimit}|columns:${this.columns.map((column) => column.type).join(",")}`;
  }
}

export function parseColumns(source: string | undefined): SearchColumn[] {
  if (!source) {
    return [];
  }
  return source.split(",").map((column) => column.trim().toUpperCase()).filter(Boolean).map((column) => {
    if (!VALID_COLUMNS.has(column as SearchColumnType)) {
      throw new Error(`Unsupported ST search column: ${column}`);
    }
    return { type: column as SearchColumnType, compact: false };
  });
}
