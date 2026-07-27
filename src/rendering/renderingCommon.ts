import { Issue } from "../interfaces/trackerInterfaces";
import { SettingsData } from "../settings";

function issueUrl(issueKey: string): string | undefined {
  const configuredUrl = SettingsData.webUrl.trim();
  if (configuredUrl === "") {
    return undefined;
  }
  const base = configuredUrl.endsWith("/") ? configuredUrl.slice(0, -1) : configuredUrl;
  return `${base}/${issueKey}`;
}

function renderIssueKey(parent: HTMLElement, issueKey: string, className = "st-tag st-key"): void {
  const href = issueUrl(issueKey);
  if (href) {
    createEl("a", { cls: className, href, text: issueKey, parent });
  } else {
    createSpan({ cls: className, text: issueKey, parent });
  }
}

function statusClass(issue: Issue): string {
  const status = (issue.status?.display ?? issue.status?.key ?? "").toLowerCase();
  if (/done|closed|resolved|закрыт|решен|готов/.test(status)) return "st-status-done";
  if (/progress|review|testing|в работе|ревью|тест/.test(status)) return "st-status-progress";
  if (/block|reject|blocked|отклон|блок/.test(status)) return "st-status-danger";
  return "st-status-muted";
}

export default {
  issueUrl,
  renderIssueKey,

  renderContainer(children: HTMLElement[]): HTMLElement {
    const container = createDiv({ cls: "st-container" });
    children.forEach((child) => container.appendChild(child));
    return container;
  },

  renderLoadingItem(label: string, inline = false): HTMLElement {
    const row = inline ? createSpan({ cls: "st-tags" }) : createDiv({ cls: "st-tags" });
    createSpan({ cls: "st-tag st-muted", text: label, parent: row });
    createSpan({ cls: "st-tag", text: "Loading ...", parent: row });
    return row;
  },

  renderIssue(issue: Issue, compact = false): HTMLElement {
    const row = createSpan({ cls: "st-tags st-issue-chip" });
    renderIssueKey(row, issue.key);
    if (!compact) {
      createSpan({ cls: "st-tag st-summary", text: issue.summary, parent: row });
    }
    createSpan({ cls: `st-tag ${statusClass(issue)}`, text: issue.status?.display ?? issue.status?.key ?? "No status", parent: row });
    if (issue.assignee?.display && !compact) {
      createSpan({ cls: "st-tag st-muted", text: issue.assignee.display, parent: row });
    }
    return row;
  },

  renderIssueError(issueKey: string, message: unknown): HTMLElement {
    const row = createSpan({ cls: "st-tags st-error" });
    createSpan({ cls: "st-tag st-danger", text: issueKey, parent: row });
    createSpan({ cls: "st-tag st-danger-strong", text: String((message as Error)?.message ?? message), parent: row });
    return row;
  },

  renderCountChip(query: string, count: number): HTMLElement {
    const row = createSpan({ cls: "st-tags st-count-chip" });
    createSpan({ cls: "st-tag st-key", text: String(count), parent: row });
    createSpan({ cls: "st-tag", text: query, parent: row });
    return row;
  }
};
