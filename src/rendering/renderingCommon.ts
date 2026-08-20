import { Issue } from "../interfaces/trackerInterfaces";
import { DEFAULT_SETTINGS, SettingsData } from "../settings";
import { formatIssueTemplate } from "./issueFields";

function issueUrl(issueKey: string): string {
  return `${SettingsData.webUrl.replace(/\/$/, "")}/${issueKey}`;
}

function renderIssueKey(parent: HTMLElement, issueKey: string, className = "st-tag st-key"): void {
  parent.appendChild(createExternalLink(issueKey, issueUrl(issueKey), className));
}

function createExternalLink(text: string, href: string, className: string): HTMLAnchorElement {
  const link = createEl("a", { cls: className, text });
  link.setAttribute("href", href);
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
  link.href = href;
  return link;
}

function statusClass(issue: Issue): string {
  const status = (issue.status?.display ?? issue.status?.key ?? "").toLowerCase();
  if (/done|closed|resolved|закрыт|решен|готов/.test(status)) return "st-status-done";
  if (/progress|review|testing|в работе|ревью|тест/.test(status)) return "st-status-progress";
  if (/block|reject|blocked|отклон|блок/.test(status)) return "st-status-danger";
  return "st-status-muted";
}

function rawIssueLinkText(issue: Issue): string {
  const template = SettingsData.inlineIssueRawLinkTemplate.trim() || DEFAULT_SETTINGS.inlineIssueRawLinkTemplate;
  return formatIssueTemplate(template, issue);
}

function renderRawIssueLink(issue: Issue): HTMLElement {
  return renderRawIssueText(rawIssueLinkText(issue), "st-inline-issue-raw", issue.key);
}

function renderRawIssueText(text: string, className = "st-inline-issue-raw", issueKey?: string): HTMLElement {
  return createExternalLink(text, issueUrl(issueKey ?? text), `${className} external-link`);
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

  renderInlineIssue(issue: Issue, compact = false): HTMLElement {
    return SettingsData.inlineIssueRawLink ? renderRawIssueLink(issue) : this.renderIssue(issue, compact);
  },

  renderInlineLoadingItem(label: string): HTMLElement {
    return SettingsData.inlineIssueRawLink ? renderRawIssueText(label) : this.renderLoadingItem(label, true);
  },

  renderInlineIssueError(issueKey: string, message: unknown): HTMLElement {
    return SettingsData.inlineIssueRawLink
      ? renderRawIssueText(`${issueKey}: ${String((message as Error)?.message ?? message)}`, "st-inline-issue-raw st-danger", issueKey)
      : this.renderIssueError(issueKey, message);
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
