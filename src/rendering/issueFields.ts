import { SEARCH_COLUMN_LABELS, SearchColumnType } from "../interfaces/settingsInterfaces";
import { Issue } from "../interfaces/trackerInterfaces";

const PLACEHOLDER = /\{\{\s*([A-Za-z]+)\s*\}\}/g;

export function issueFieldText(issue: Issue, type: SearchColumnType): string {
  switch (type) {
    case "KEY":
      return issue.key;
    case "SUMMARY":
      return issue.summary ?? "";
    case "STATUS":
      return issue.status?.display ?? issue.status?.key ?? "";
    case "ASSIGNEE":
      return issue.assignee?.display ?? issue.assignee?.login ?? "";
    case "UPDATED":
      return formatDate(issue.updatedAt);
    case "PRIORITY":
      return issue.priority?.display ?? issue.priority?.key ?? "";
    case "TYPE":
      return issue.type?.display ?? issue.type?.key ?? "";
  }
}

export function formatIssueTemplate(template: string, issue: Issue): string {
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const type = name.toUpperCase();
    return isSearchColumnType(type) ? issueFieldText(issue, type) : match;
  });
}

function isSearchColumnType(value: string): value is SearchColumnType {
  return value in SEARCH_COLUMN_LABELS;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
