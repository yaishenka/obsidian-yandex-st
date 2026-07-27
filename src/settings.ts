import { App, Platform, Plugin, PluginSettingTab, Setting } from "obsidian";
import { SEARCH_COLUMN_LABELS, STLanguage, STPluginSettings } from "./interfaces/settingsInterfaces";
import { parseColumns } from "./searchView";

export const DEFAULT_SETTINGS: STPluginSettings = {
  apiUrl: "",
  webUrl: "",
  token: "",
  tokenPath: "~/.tracker_token",
  language: "ru",
  cacheTime: "15m",
  searchResultsLimit: 10,
  inlinePrefix: "ST:",
  inlineIssueUrlToTag: true,
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
  try {
    const [{ readFileSync }, { homedir }] = await Promise.all([import("fs"), import("os")]);
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

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Yandex Tracker ST" });

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
    const availableColumns = Object.entries(SEARCH_COLUMN_LABELS).map(([type, label]) => `${type} (${label})`).join(", ");
    this.searchColumns(availableColumns);
  }

  private searchColumns(availableColumns: string): void {
    new Setting(this.containerEl)
      .setName("Default search columns")
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
    new Setting(this.containerEl)
      .setName(name)
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
