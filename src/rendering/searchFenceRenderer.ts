import { MarkdownPostProcessorContext } from "obsidian";
import { TrackerClient } from "../client/trackerClient";
import { SearchColumn } from "../interfaces/settingsInterfaces";
import { TrackerSearchResult } from "../interfaces/trackerInterfaces";
import ObjectsCache from "../objectsCache";
import { SearchView } from "../searchView";
import { SettingsData } from "../settings";
import { renderTableColumn } from "./renderTableColumns";
import RC from "./renderingCommon";

export function createSearchFenceRenderer(client: Pick<TrackerClient, "searchIssues">) {
  return async (source: string, el: HTMLElement, _ctx: MarkdownPostProcessorContext): Promise<void> => {
    try {
      const view = SearchView.fromString(source);
      const limit = view.limit ?? SettingsData.searchResultsLimit;
      const cacheKey = view.getCacheKey(SettingsData.searchResultsLimit);
      const cached = ObjectsCache.get<TrackerSearchResult | Error>(cacheKey);
      if (cached) {
        cached.isError ? renderError(el, cached.data) : renderSearch(el, cached.data as TrackerSearchResult, view);
        return;
      }
      el.replaceChildren(RC.renderContainer([RC.renderLoadingItem("Loading search")]));
      try {
        const result = await client.searchIssues(view.query, { limit });
        renderSearch(el, ObjectsCache.add(cacheKey, result).data, view);
      } catch (error) {
        renderError(el, ObjectsCache.add(cacheKey, error, true).data);
      }
    } catch (error) {
      renderError(el, error);
    }
  };
}

function renderSearch(el: HTMLElement, result: TrackerSearchResult, view: SearchView): void {
  const table = createEl("table", { cls: "st-table" });
  const columns: SearchColumn[] = view.columns.length > 0 ? view.columns : SettingsData.searchColumns;
  const header = table.createEl("thead").createEl("tr");
  columns.forEach((column) => header.createEl("th", { text: column.type }));
  const body = table.createEl("tbody");
  result.issues.forEach((issue) => {
    const row = body.createEl("tr");
    columns.forEach((column) => renderTableColumn(column, issue, row));
  });
  el.replaceChildren(RC.renderContainer([table]));
}

function renderError(el: HTMLElement, error: unknown): void {
  el.replaceChildren(RC.renderContainer([RC.renderIssueError("ST search", error)]));
}
