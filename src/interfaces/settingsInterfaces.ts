export type STLanguage = "ru" | "en";

export type SearchColumnType =
  | "KEY"
  | "SUMMARY"
  | "STATUS"
  | "ASSIGNEE"
  | "UPDATED"
  | "PRIORITY"
  | "TYPE";

export interface SearchColumn {
  type: SearchColumnType;
  compact: boolean;
}

export interface STPluginSettings {
  apiUrl: string;
  webUrl: string;
  token: string;
  tokenPath: string;
  language: STLanguage;
  cacheTime: string;
  searchResultsLimit: number;
  inlinePrefix: string;
  inlineIssueUrlToTag: boolean;
  searchColumns: SearchColumn[];
  logRequestsResponses: boolean;
}

export const SEARCH_COLUMN_LABELS: Record<SearchColumnType, string> = {
  KEY: "Key",
  SUMMARY: "Summary",
  STATUS: "Status",
  ASSIGNEE: "Assignee",
  UPDATED: "Updated",
  PRIORITY: "Priority",
  TYPE: "Type"
};
