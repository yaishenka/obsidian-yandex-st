import { SearchColumn } from "../interfaces/settingsInterfaces";
import { Issue } from "../interfaces/trackerInterfaces";
import { issueFieldText } from "./issueFields";
import RC from "./renderingCommon";

export function renderTableColumn(column: SearchColumn, issue: Issue, row: HTMLTableRowElement): void {
  const cell = row.insertCell();
  if (column.type === "KEY") {
    RC.renderIssueKey(cell, issue.key, "");
    return;
  }
  cell.textContent = issueFieldText(issue, column.type);
}
