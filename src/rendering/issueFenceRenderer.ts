import { MarkdownPostProcessorContext } from "obsidian";
import { TrackerClient } from "../client/trackerClient";
import { Issue } from "../interfaces/trackerInterfaces";
import ObjectsCache from "../objectsCache";
import { parseIssueKeyLine } from "../parsing/issueKeys";
import { SettingsData } from "../settings";
import RC from "./renderingCommon";

export function createIssueFenceRenderer(client: Pick<TrackerClient, "getIssue">) {
  return async (source: string, el: HTMLElement, _ctx: MarkdownPostProcessorContext): Promise<void> => {
    const renderedItems: Record<string, HTMLElement> = {};
    const keys = source.split("\n").map((line) => parseIssueKeyLine(line, SettingsData.webUrl)).filter((key): key is string => Boolean(key));

    if (keys.length === 0) {
      el.replaceChildren(RC.renderContainer([RC.renderIssueError("ST", "No valid issues found")]));
      return;
    }

    const requests: Promise<void>[] = [];
    for (const key of keys) {
      const cacheKey = `issue:${key}`;
      const cached = ObjectsCache.get<Issue | string>(cacheKey);
      if (cached) {
        renderedItems[key] = cached.isError ? RC.renderIssueError(key, cached.data) : RC.renderIssue(cached.data as Issue);
        continue;
      }
      renderedItems[key] = RC.renderLoadingItem(key);
      requests.push(client.getIssue(key).then((issue) => {
        renderedItems[key] = RC.renderIssue(ObjectsCache.add(cacheKey, issue).data);
        update(el, renderedItems);
      }).catch((error) => {
        renderedItems[key] = RC.renderIssueError(key, ObjectsCache.add(cacheKey, error, true).data);
        update(el, renderedItems);
      }));
    }

    update(el, renderedItems);
    await Promise.all(requests);
  };
}

function update(el: HTMLElement, renderedItems: Record<string, HTMLElement>): void {
  el.replaceChildren(RC.renderContainer(Object.values(renderedItems)));
}
