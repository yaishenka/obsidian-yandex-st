export type STLanguage = "ru" | "en";

export type STOrgIdHeader = "X-Org-ID" | "X-Cloud-Org-ID";

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
  orgId: string;
  orgIdHeader: STOrgIdHeader;
  language: STLanguage;
  cacheTime: string;
  searchResultsLimit: number;
  inlinePrefix: string;
  inlineIssueUrlToTag: boolean;
  inlineIssueRawLink: boolean;
  inlineIssueRawLinkTemplate: string;
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

export const INLINE_ISSUE_TEMPLATE_PLACEHOLDERS = (Object.keys(SEARCH_COLUMN_LABELS) as SearchColumnType[])
  .map((type) => `{{ ${type.toLowerCase()} }}`)
  .join(", ");
