import { Extension } from "@codemirror/state";
import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { TrackerClient } from "./client/trackerClient";
import ObjectsCache from "./objectsCache";
import { createCountFenceRenderer } from "./rendering/countFenceRenderer";
import { createInlineIssueRenderer } from "./rendering/inlineIssueRenderer";
import { createInlineIssueViewPlugin } from "./rendering/inlineIssueViewPlugin";
import { createIssueFenceRenderer } from "./rendering/issueFenceRenderer";
import { createSearchFenceRenderer } from "./rendering/searchFenceRenderer";
import { loadSettings, resolveToken, SettingsData, STSettingTab } from "./settings";

export default class STPlugin extends Plugin {
  private client: TrackerClient;
  private readonly inlineIssueExtensions: Extension[] = [];

  async onload(): Promise<void> {
    await loadSettings(this);
    ObjectsCache.setTtl(SettingsData.cacheTime);

    this.client = new TrackerClient(async () => {
      const token = await resolveToken(SettingsData);
      return token ? { apiUrl: SettingsData.apiUrl, token, language: SettingsData.language } : undefined;
    });

    this.addSettingTab(new STSettingTab(this.app, this, () => {
      ObjectsCache.setTtl(SettingsData.cacheTime);
      ObjectsCache.clear();
      this.refreshInlineIssueViews();
    }));

    this.registerMarkdownCodeBlockProcessor("st-issue", createIssueFenceRenderer(this.client));
    this.registerMarkdownCodeBlockProcessor("st-search", createSearchFenceRenderer(this.client));
    this.registerMarkdownCodeBlockProcessor("st-count", createCountFenceRenderer(this.client));
    this.registerMarkdownPostProcessor(createInlineIssueRenderer(this.client));
    this.inlineIssueExtensions.push(createInlineIssueViewPlugin(this.client));
    this.registerEditorExtension(this.inlineIssueExtensions);

    this.addCommand({
      id: "st-clear-cache",
      name: "Clear ST cache",
      callback: () => {
        ObjectsCache.clear();
        new Notice("ST: cache cleared");
      }
    });
    this.addCommand({
      id: "st-insert-issue-template",
      name: "Insert ST issue block",
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        editor.replaceRange("```st-issue\n\n```", editor.getCursor());
      }
    });
    this.addCommand({
      id: "st-insert-search-template",
      name: "Insert ST search block",
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        editor.replaceRange("```st-search\nAssignee: me() AND Resolution: empty() \"Sort by\": Updated DESC\n```", editor.getCursor());
      }
    });
    this.addCommand({
      id: "st-insert-count-template",
      name: "Insert ST count block",
      editorCallback: (editor: Editor, _view: MarkdownView) => {
        editor.replaceRange("```st-count\nAssignee: me() AND Resolution: empty()\n```", editor.getCursor());
      }
    });
  }

  private refreshInlineIssueViews(): void {
    this.inlineIssueExtensions.splice(0, this.inlineIssueExtensions.length, createInlineIssueViewPlugin(this.client));
    this.app.workspace.updateOptions();
  }
}
