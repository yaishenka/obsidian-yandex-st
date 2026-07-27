import { MarkdownPostProcessorContext } from "obsidian";
import { TrackerClient } from "../client/trackerClient";
import { Issue } from "../interfaces/trackerInterfaces";
import ObjectsCache from "../objectsCache";
import { createInlineIssueUrlRegex, findInlineIssueTags, isLinkableKey } from "../parsing/issueKeys";
import { SettingsData } from "../settings";
import RC from "./renderingCommon";

export function createInlineIssueRenderer(client: Pick<TrackerClient, "getIssue">) {
  return async (el: HTMLElement, _ctx: MarkdownPostProcessorContext): Promise<void> => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (shouldProcessTextNode(node)) {
        textNodes.push(node);
      }
    }

    textNodes.forEach((node) => replaceTextNode(node, client));
  };
}

function replaceTextNode(node: Text, client: Pick<TrackerClient, "getIssue">): void {
  const text = node.textContent ?? "";
  const matches = findInlineIssueMatches(text);
  if (matches.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  matches.forEach((match) => {
    fragment.append(document.createTextNode(text.slice(cursor, match.index)));
    const container = createSpan({ cls: "st-inline-issue" });
    container.appendChild(RC.renderLoadingItem(match.key, true));
    fragment.append(container);
    fillIssue(container, match.key, match.compact, client);
    cursor = match.index + match.raw.length;
  });
  fragment.append(document.createTextNode(text.slice(cursor)));
  const parent = node.parentElement;
  const replacesWholeLink = matches.length === 1 && matches[0].raw === text && parent?.tagName === "A" && parent.textContent === text;
  (replacesWholeLink ? parent! : node).replaceWith(fragment);
}

function findInlineIssueMatches(text: string) {
  const matches = findInlineIssueTags(text, SettingsData.inlinePrefix);
  if (!SettingsData.inlineIssueUrlToTag) {
    return matches;
  }

  const urlRegex = createInlineIssueUrlRegex(SettingsData.webUrl);
  if (!urlRegex) {
    return matches;
  }
  for (const match of text.matchAll(urlRegex)) {
    const key = match[1];
    if (isLinkableKey(key)) {
      matches.push({ raw: match[0], key, compact: false, index: match.index ?? 0 });
    }
  }
  const sortedMatches = matches.sort((left, right) => left.index - right.index || right.raw.length - left.raw.length);
  let coveredUntil = 0;
  return sortedMatches.filter((match) => {
    if (match.index < coveredUntil) {
      return false;
    }
    coveredUntil = match.index + match.raw.length;
    return true;
  });
}

function shouldProcessTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || parent.closest("code, pre, .st-inline-issue")) {
    return false;
  }
  const link = parent.closest("a");
  return !link || isWholeTrackerAutoLink(link);
}

function isWholeTrackerAutoLink(link: HTMLAnchorElement): boolean {
  if (!SettingsData.inlineIssueUrlToTag) {
    return false;
  }
  const text = link.textContent ?? "";
  const urlRegex = createInlineIssueUrlRegex(SettingsData.webUrl);
  const match = urlRegex?.exec(text);
  return link.getAttribute("href") === text && match?.[0] === text;
}

function fillIssue(container: HTMLElement, key: string, compact: boolean, client: Pick<TrackerClient, "getIssue">): void {
  const cacheKey = `issue:${key}`;
  const cached = ObjectsCache.get<Issue | Error>(cacheKey);
  if (cached) {
    container.replaceChildren(cached.isError ? RC.renderIssueError(key, cached.data) : RC.renderIssue(cached.data as Issue, compact));
    return;
  }
  client.getIssue(key).then((issue) => {
    container.replaceChildren(RC.renderIssue(ObjectsCache.add(cacheKey, issue).data, compact));
  }).catch((error) => {
    container.replaceChildren(RC.renderIssueError(key, ObjectsCache.add(cacheKey, error, true).data));
  });
}
