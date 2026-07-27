import { MarkdownPostProcessorContext } from "obsidian";
import { TrackerClient } from "../client/trackerClient";
import ObjectsCache from "../objectsCache";
import RC from "./renderingCommon";

export function createCountFenceRenderer(client: Pick<TrackerClient, "countIssues">) {
  return async (source: string, el: HTMLElement, _ctx: MarkdownPostProcessorContext): Promise<void> => {
    const query = source.trim();
    if (query === "") {
      el.replaceChildren(RC.renderContainer([RC.renderIssueError("ST count", "Query is empty")]));
      return;
    }
    const cacheKey = `count:${query}`;
    const cached = ObjectsCache.get<number | Error>(cacheKey);
    if (cached) {
      el.replaceChildren(RC.renderContainer([cached.isError ? RC.renderIssueError("ST count", cached.data) : RC.renderCountChip(query, cached.data as number)]));
      return;
    }
    el.replaceChildren(RC.renderContainer([RC.renderLoadingItem("Loading count")]));
    try {
      const count = await client.countIssues(query);
      el.replaceChildren(RC.renderContainer([RC.renderCountChip(query, ObjectsCache.add(cacheKey, count).data)]));
    } catch (error) {
      el.replaceChildren(RC.renderContainer([RC.renderIssueError("ST count", ObjectsCache.add(cacheKey, error, true).data)]));
    }
  };
}
