import { App, Platform, Plugin, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { INLINE_ISSUE_TEMPLATE_PLACEHOLDERS, SEARCH_COLUMN_LABELS, STLanguage, STOrgIdHeader, STPluginSettings } from "./interfaces/settingsInterfaces";
import { parseColumns } from "./searchView";

type STSettingKey = keyof STPluginSettings;

export const DEFAULT_SETTINGS: STPluginSettings = {
  apiUrl: "",
  webUrl: "",
  token: "",
  tokenPath: "~/.tracker_token",
  orgId: "",
  orgIdHeader: "X-Org-ID",
  language: "ru",
  cacheTime: "15m",
  searchResultsLimit: 10,
  inlinePrefix: "ST:",
  inlineIssueUrlToTag: true,
  inlineIssueRawLink: false,
  inlineIssueRawLinkTemplate: "{{ key }} {{ summary }} ({{ status }})",
  searchColumns: [
    { type: "KEY", compact: false },
    { type: "SUMMARY", compact: false },
    { type: "STATUS", compact: false },
    { type: "ASSIGNEE", compact: false },
    { type: "UPDATED", compact: false }
  ],
  logRequestsResponses: false
};

export let SettingsData: STPluginSettings = mergeSettings();

export function mergeSettings(saved: Partial<STPluginSettings> | null | undefined = undefined): STPluginSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(saved ?? {}),
    searchColumns: cloneSearchColumns(saved?.searchColumns?.length ? saved.searchColumns : DEFAULT_SETTINGS.searchColumns)
  };
}

export async function loadSettings(plugin: Plugin): Promise<void> {
  SettingsData = mergeSettings((await plugin.loadData()) as Partial<STPluginSettings>);
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(SettingsData);
}

export function resolveTokenFromText(text: string): string | undefined {
  const token = text.trim();
  return token === "" ? undefined : token;
}

export async function resolveToken(
  settings: STPluginSettings = SettingsData,
  platform: Pick<typeof Platform, "isMobileApp"> = Platform,
  readDesktopTokenFile: (filePath: string) => Promise<string | undefined> = resolveDesktopTokenFile
): Promise<string | undefined> {
  const configured = resolveTokenFromText(settings.token);
  if (configured) {
    return configured;
  }
  if (platform.isMobileApp) {
    return undefined;
  }
  return readDesktopTokenFile(settings.tokenPath);
}

function cloneSearchColumns(columns: STPluginSettings["searchColumns"]): STPluginSettings["searchColumns"] {
  return columns.map((column) => ({ ...column }));
}

async function resolveDesktopTokenFile(filePath: string): Promise<string | undefined> {
  const desktopRequire = Platform.isDesktop ? window.require : undefined;
  if (!desktopRequire) {
    return undefined;
  }
  try {
    const { readFileSync } = desktopRequire("fs") as { readFileSync: (path: string, encoding: "utf8") => string };
    const { homedir } = desktopRequire("os") as { homedir: () => string };
    const expandedPath = filePath === "~" || filePath.startsWith("~/") ? `${homedir()}${filePath.slice(1)}` : filePath;
    return resolveTokenFromText(readFileSync(expandedPath, "utf8"));
  } catch {
    return undefined;
  }
}

export class STSettingTab extends PluginSettingTab {
  private showToken = false;

  constructor(app: App, private readonly plugin: Plugin, private readonly onChange: () => void) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<STSettingKey>[] {
    const availableColumns = Object.entries(SEARCH_COLUMN_LABELS).map(([type, label]) => `${type} (${label})`).join(", ");
    return [
      {
        type: "group",
        heading: "Connection",
        items: [
          {
            name: "API URL",
            desc: "Tracker API base URL. Configure it from your Tracker API access settings.",
            control: { type: "text", key: "apiUrl" }
          },
          {
            name: "Web URL",
            desc: "Tracker web URL used for issue links.",
            control: { type: "text", key: "webUrl" }
          },
          {
            name: "OAuth token",
            desc: "Stored in Obsidian plugin data. Leave empty to use token file.",
            render: (setting) => this.configureTextSetting(setting, "OAuth token", "Stored in Obsidian plugin data. Leave empty to use token file.", SettingsData.token, (value) => {
              SettingsData.token = value.trim();
            }, true)
          },
          {
            name: "Token file",
            desc: "Used when OAuth token is empty. Desktop only.",
            control: { type: "text", key: "tokenPath" }
          },
          {
            name: "Organization ID",
            desc: "Sent on every Tracker API request. Find it in Tracker: Administration → Organizations.",
            control: { type: "text", key: "orgId" }
          },
          {
            name: "Organization header",
            desc: "X-Org-ID for Yandex 360, X-Cloud-Org-ID for Yandex Cloud.",
            control: {
              type: "dropdown",
              key: "orgIdHeader",
              options: { "X-Org-ID": "X-Org-ID", "X-Cloud-Org-ID": "X-Cloud-Org-ID" }
            }
          },
          {
            name: "Language",
            desc: "Localized Tracker fields.",
            control: {
              type: "dropdown",
              key: "language",
              options: { ru: "ru", en: "en" }
            }
          },
          {
            name: "Cache TTL",
            desc: "Examples: 30s, 15m, 1h.",
            control: { type: "text", key: "cacheTime" }
          },
          {
            name: "Search result limit",
            desc: "Default number of search rows.",
            control: {
              type: "number",
              key: "searchResultsLimit",
              min: 1,
              defaultValue: DEFAULT_SETTINGS.searchResultsLimit
            }
          },
          {
            name: "Inline prefix",
            desc: "Prefix for inline issue tags.",
            control: { type: "text", key: "inlinePrefix" }
          },
          {
            name: "Convert Tracker URLs",
            desc: "Render Tracker issue URLs as inline issue tags.",
            control: { type: "toggle", key: "inlineIssueUrlToTag" }
          },
          {
            name: "Raw inline issue link",
            desc: "Render inline issues as a regular link instead of a bordered chip.",
            control: { type: "toggle", key: "inlineIssueRawLink" }
          },
          {
            name: "Raw link template",
            desc: `Used when raw inline issue link is enabled. Placeholders: ${INLINE_ISSUE_TEMPLATE_PLACEHOLDERS}.`,
            control: { type: "text", key: "inlineIssueRawLinkTemplate" }
          },
          {
            name: "Default search columns",
            desc: `Comma-separated columns. Available: ${availableColumns}.`,
            render: (setting) => this.configureSearchColumnsSetting(setting, availableColumns)
          }
        ]
      }
    ];
  }

  getControlValue(key: STSettingKey): unknown {
    if (key === "searchColumns") {
      return SettingsData.searchColumns.map((column) => column.type).join(", ");
    }
    return SettingsData[key];
  }

  async setControlValue(key: STSettingKey, value: unknown): Promise<void> {
    switch (key) {
      case "apiUrl":
      case "webUrl":
      case "token":
      case "tokenPath":
      case "orgId":
      case "cacheTime":
        SettingsData[key] = String(value ?? "").trim();
        break;
      case "inlinePrefix":
        SettingsData.inlinePrefix = String(value ?? "");
        break;
      case "inlineIssueRawLinkTemplate":
        SettingsData.inlineIssueRawLinkTemplate = String(value ?? "");
        break;
      case "orgIdHeader":
        SettingsData.orgIdHeader = value === "X-Cloud-Org-ID" ? "X-Cloud-Org-ID" : "X-Org-ID";
        break;
      case "language":
        SettingsData.language = value === "en" ? "en" : "ru";
        break;
      case "searchResultsLimit": {
        const parsed = Number(value);
        SettingsData.searchResultsLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS.searchResultsLimit;
        break;
      }
      case "inlineIssueUrlToTag":
      case "inlineIssueRawLink":
      case "logRequestsResponses":
        SettingsData[key] = Boolean(value);
        break;
      case "searchColumns":
        SettingsData.searchColumns = parseColumns(String(value ?? ""));
        break;
    }
    await saveSettings(this.plugin);
    this.onChange();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName("Connection").setHeading();

    this.text("API URL", "Tracker API base URL. Configure it from your Tracker API access settings.", SettingsData.apiUrl, (value) => {
      SettingsData.apiUrl = value.trim();
    });
    this.text("Web URL", "Tracker web URL used for issue links.", SettingsData.webUrl, (value) => {
      SettingsData.webUrl = value.trim();
    });
    this.text("OAuth token", "Stored in Obsidian plugin data. Leave empty to use token file.", SettingsData.token, (value) => {
      SettingsData.token = value.trim();
    }, true);
    this.text("Token file", "Used when OAuth token is empty. Desktop only.", SettingsData.tokenPath, (value) => {
      SettingsData.tokenPath = value.trim();
    });
    this.text("Organization ID", "Sent on every Tracker API request. Find it in Tracker: Administration → Organizations.", SettingsData.orgId, (value) => {
      SettingsData.orgId = value.trim();
    });
    new Setting(containerEl)
      .setName("Organization header")
      .setDesc("X-Org-ID for Yandex 360, X-Cloud-Org-ID for Yandex Cloud.")
      .addDropdown((dropdown) => dropdown
        .addOptions({ "X-Org-ID": "X-Org-ID", "X-Cloud-Org-ID": "X-Cloud-Org-ID" })
        .setValue(SettingsData.orgIdHeader)
        .onChange(async (value: STOrgIdHeader) => {
          SettingsData.orgIdHeader = value === "X-Cloud-Org-ID" ? "X-Cloud-Org-ID" : "X-Org-ID";
          await saveSettings(this.plugin);
          this.onChange();
        }));

    new Setting(containerEl)
      .setName("Language")
      .setDesc("Localized Tracker fields.")
      .addDropdown((dropdown) => dropdown
        .addOptions({ ru: "ru", en: "en" })
        .setValue(SettingsData.language)
        .onChange(async (value: STLanguage) => {
          SettingsData.language = value;
          await saveSettings(this.plugin);
          this.onChange();
        }));

    this.text("Cache TTL", "Examples: 30s, 15m, 1h.", SettingsData.cacheTime, (value) => {
      SettingsData.cacheTime = value.trim();
    });
    this.text("Search result limit", "Default number of search rows.", String(SettingsData.searchResultsLimit), (value) => {
      const parsed = Number(value);
      SettingsData.searchResultsLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS.searchResultsLimit;
    });
    this.text("Inline prefix", "Prefix for inline issue tags.", SettingsData.inlinePrefix, (value) => {
      SettingsData.inlinePrefix = value;
    });
    new Setting(containerEl)
      .setName("Convert Tracker URLs")
      .setDesc("Render Tracker issue URLs as inline issue tags.")
      .addToggle((toggle) => toggle
        .setValue(SettingsData.inlineIssueUrlToTag)
        .onChange(async (value) => {
          SettingsData.inlineIssueUrlToTag = value;
          await saveSettings(this.plugin);
          this.onChange();
        }));
    new Setting(containerEl)
      .setName("Raw inline issue link")
      .setDesc("Render inline issues as a regular link instead of a bordered chip.")
      .addToggle((toggle) => toggle
        .setValue(SettingsData.inlineIssueRawLink)
        .onChange(async (value) => {
          SettingsData.inlineIssueRawLink = value;
          await saveSettings(this.plugin);
          this.onChange();
          this.display();
        }));
    if (SettingsData.inlineIssueRawLink) {
      this.text(
        "Raw link template",
        `Placeholders: ${INLINE_ISSUE_TEMPLATE_PLACEHOLDERS}.`,
        SettingsData.inlineIssueRawLinkTemplate,
        (value) => {
          SettingsData.inlineIssueRawLinkTemplate = value;
        }
      );
    }
    const availableColumns = Object.entries(SEARCH_COLUMN_LABELS).map(([type, label]) => `${type} (${label})`).join(", ");
    this.searchColumns(availableColumns);
  }

  private searchColumns(availableColumns: string): void {
    this.configureSearchColumnsSetting(new Setting(this.containerEl), availableColumns);
  }

  private configureSearchColumnsSetting(setting: Setting, availableColumns: string): void {
    setting.setName("Default search columns")
      .setDesc(`Comma-separated columns. Available: ${availableColumns}.`)
      .addText((text) => text
        .setValue(SettingsData.searchColumns.map((column) => column.type).join(", "))
        .onChange(async (value: string) => {
          try {
            const columns = parseColumns(value);
            if (columns.length === 0) {
              throw new Error("At least one search column is required.");
            }
            SettingsData.searchColumns = columns;
            text.inputEl.removeClass("is-invalid");
            await saveSettings(this.plugin);
            this.onChange();
          } catch {
            text.inputEl.addClass("is-invalid");
          }
        }));
  }

  private text(name: string, desc: string, value: string, onChange: (value: string) => void, password = false): void {
    this.configureTextSetting(new Setting(this.containerEl), name, desc, value, onChange, password);
  }

  private configureTextSetting(setting: Setting, name: string, desc: string, value: string, onChange: (value: string) => void, password = false): void {
    setting.setName(name)
      .setDesc(desc)
      .addText((text) => {
        text.setValue(value).onChange(async (next: string) => {
          onChange(next);
          await saveSettings(this.plugin);
          this.onChange();
        });
        if (password) {
          text.inputEl.setAttr("type", this.showToken ? "text" : "password");
        }
      });
  }
}
