export class Notice {
  constructor(public message: string) {}
}

export class Plugin {
  app: any = {};
  addSettingTab(): void {}
  addCommand(): void {}
  registerMarkdownCodeBlockProcessor(): void {}
  registerMarkdownPostProcessor(): void {}
  registerEditorExtension(): void {}
  async loadData(): Promise<unknown> { return {}; }
  async saveData(_data: unknown): Promise<void> {}
}

export class PluginSettingTab {
  containerEl: HTMLElement = document.createElement("div");
  constructor(public app: any, public plugin: Plugin) {}
  display(): void {}
}

export class Setting {
  settingEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(parent: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.nameEl = document.createElement("div");
    this.descEl = document.createElement("div");
    this.controlEl = document.createElement("div");
    this.settingEl.append(this.nameEl, this.descEl, this.controlEl);
    parent.appendChild(this.settingEl);
  }

  setName(value: string): this { this.nameEl.textContent = value; return this; }
  setDesc(value: string): this { this.descEl.textContent = value; return this; }
  addText(cb: (component: any) => void): this {
    const input = document.createElement("input");
    const component = {
      inputEl: input,
      setPlaceholder: (_value: string) => component,
      setValue: (value: string) => { input.value = value; return component; },
      onChange: (_handler: (value: string) => void) => component
    };
    cb(component);
    this.controlEl.appendChild(input);
    return this;
  }
  addDropdown(cb: (component: any) => void): this {
    const select = document.createElement("select");
    const component = {
      selectEl: select,
      addOptions: (options: Record<string, string>) => {
        Object.entries(options).forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          select.appendChild(option);
        });
        return component;
      },
      setValue: (value: string) => { select.value = value; return component; },
      onChange: (_handler: (value: string) => void) => component
    };
    cb(component);
    this.controlEl.appendChild(select);
    return this;
  }
}

export const requestUrl = jest.fn();
export const Platform = { isMobileApp: false };
export const editorLivePreviewField = {};
export type MarkdownPostProcessorContext = unknown;
export type Editor = { replaceRange(value: string, position: unknown): void; getCursor(): unknown };
export type MarkdownView = unknown;
