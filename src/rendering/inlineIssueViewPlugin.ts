import { RangeSet } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, MatchDecorator, PluginSpec, PluginValue, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { TrackerClient } from "../client/trackerClient";
import { Issue } from "../interfaces/trackerInterfaces";
import ObjectsCache from "../objectsCache";
import { createInlineIssueTagRegex, createInlineIssueUrlRegex } from "../parsing/issueKeys";
import { SettingsData } from "../settings";
import RC from "./renderingCommon";

class InlineIssueWidget extends WidgetType {
  private readonly container = createSpan({ cls: "st-inline-issue" });

  constructor(private readonly key: string, private readonly compact: boolean, private readonly client: Pick<TrackerClient, "getIssue">) {
    super();
    this.render();
  }

  toDOM(): HTMLElement {
    return this.container;
  }

  private render(): void {
    const cacheKey = `issue:${this.key}`;
    const cached = ObjectsCache.get<Issue | Error>(cacheKey);
    if (cached) {
      this.container.replaceChildren(cached.isError ? RC.renderIssueError(this.key, cached.data) : RC.renderIssue(cached.data as Issue, this.compact));
      return;
    }
    this.container.replaceChildren(RC.renderLoadingItem(this.key, true));
    this.client.getIssue(this.key).then((issue) => {
      this.container.replaceChildren(RC.renderIssue(ObjectsCache.add(cacheKey, issue).data, this.compact));
    }).catch((error) => {
      this.container.replaceChildren(RC.renderIssueError(this.key, ObjectsCache.add(cacheKey, error, true).data));
    });
  }
}

export function createInlineIssueViewPlugin(client: Pick<TrackerClient, "getIssue">): ViewPlugin<PluginValue> {
  class InlineIssuePluginValue implements PluginValue {
    private matchers: InlineIssueMatchers;
    private settingsSignature: string;
    private tagDecorations: DecorationSet;
    private urlDecorations: DecorationSet | null;
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.settingsSignature = getInlineIssueSettingsSignature();
      this.matchers = createInlineIssueMatchers(client);
      this.tagDecorations = this.matchers.tagDecorator?.createDeco(view) ?? Decoration.none;
      this.urlDecorations = this.matchers.urlDecorator?.createDeco(view) ?? null;
      this.decorations = combineDecorations(this.tagDecorations, this.urlDecorations);
    }

    update(update: ViewUpdate): void {
      const nextSignature = getInlineIssueSettingsSignature();
      if (update.selectionSet || this.settingsSignature !== nextSignature) {
        this.settingsSignature = nextSignature;
        this.matchers = createInlineIssueMatchers(client);
        this.tagDecorations = this.matchers.tagDecorator?.createDeco(update.view) ?? Decoration.none;
        this.urlDecorations = this.matchers.urlDecorator?.createDeco(update.view) ?? null;
      } else {
        this.tagDecorations = this.matchers.tagDecorator?.updateDeco(update, this.tagDecorations) ?? Decoration.none;
        this.urlDecorations = this.matchers.urlDecorator ? this.matchers.urlDecorator.updateDeco(update, this.urlDecorations!) : null;
      }
      this.decorations = combineDecorations(this.tagDecorations, this.urlDecorations);
    }
  }

  const spec: PluginSpec<InlineIssuePluginValue> = {
    decorations: (value) => value.decorations
  };
  return ViewPlugin.fromClass(InlineIssuePluginValue, spec);
}

interface InlineIssueMatchers {
  tagDecorator: MatchDecorator | null;
  urlDecorator: MatchDecorator | null;
}

function createInlineIssueMatchers(client: Pick<TrackerClient, "getIssue">): InlineIssueMatchers {
  const tagRegex = createInlineIssueTagRegex(SettingsData.inlinePrefix);
  const urlRegex = SettingsData.inlineIssueUrlToTag ? createInlineIssueUrlRegex(SettingsData.webUrl) : null;
  return {
    tagDecorator: tagRegex ? new MatchDecorator({
      regexp: tagRegex,
      decoration: (match, view, pos) => {
        if (urlRegex && isInsideTrackerUrl(view, pos, urlRegex)) {
          return null;
        }
        return issueDecoration(match[2], match[1] === "-", view, pos, match[0].length, client);
      }
    }) : null,
    urlDecorator: urlRegex ? new MatchDecorator({
      regexp: urlRegex,
      decoration: (match, view, pos) => issueDecoration(match[1], false, view, pos, match[0].length, client)
    }) : null
  };
}

function getInlineIssueSettingsSignature(): string {
  return JSON.stringify([SettingsData.inlinePrefix, SettingsData.inlineIssueUrlToTag, SettingsData.webUrl]);
}

function issueDecoration(key: string, compact: boolean, view: EditorView, start: number, length: number, client: Pick<TrackerClient, "getIssue">): Decoration {
  if (!isLivePreview(view) || cursorTouchesTag(view, start, length)) {
    return Decoration.mark({ tagName: "span", class: "st-inline-source" });
  }
  return Decoration.replace({ widget: new InlineIssueWidget(key, compact, client) });
}

function combineDecorations(tagDecorations: DecorationSet, urlDecorations: DecorationSet | null): DecorationSet {
  return urlDecorations ? RangeSet.join([tagDecorations, urlDecorations]) : tagDecorations;
}

function isInsideTrackerUrl(view: EditorView, pos: number, pattern: RegExp): boolean {
  const line = view.state.doc.lineAt(pos);
  const positionInLine = pos - line.from;
  for (const match of line.text.matchAll(new RegExp(pattern.source, pattern.flags))) {
    const start = match.index ?? 0;
    if (positionInLine >= start && positionInLine < start + match[0].length) {
      return true;
    }
  }
  return false;
}

function isLivePreview(view: EditorView): boolean {
  return view.state.field(editorLivePreviewField, false) ?? true;
}

function cursorTouchesTag(view: EditorView, start: number, length: number): boolean {
  const selection = view.state.selection.main;
  return selection.to > start - 1 && selection.from < start + length + 1;
}
