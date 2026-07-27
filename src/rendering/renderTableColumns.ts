import { SearchColumn } from "../interfaces/settingsInterfaces";
import { Issue } from "../interfaces/trackerInterfaces";
import RC from "./renderingCommon";

export function renderTableColumn(column: SearchColumn, issue: Issue, row: HTMLTableRowElement): void {
  const cell = row.insertCell();
  switch (column.type) {
    case "KEY": {
      RC.renderIssueKey(cell, issue.key, "");
      break;
    }
    case "SUMMARY":
      cell.textContent = issue.summary;
      break;
    case "STATUS":
      cell.textContent = issue.status?.display ?? issue.status?.key ?? "";
      break;
    case "ASSIGNEE":
      cell.textContent = issue.assignee?.display ?? issue.assignee?.login ?? "";
      break;
    case "UPDATED":
      cell.textContent = formatDate(issue.updatedAt);
      break;
    case "PRIORITY":
      cell.textContent = issue.priority?.display ?? issue.priority?.key ?? "";
      break;
    case "TYPE":
      cell.textContent = issue.type?.display ?? issue.type?.key ?? "";
      break;
  }
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
