export interface EntityRef {
  self?: string;
  id: string;
  key?: string;
  display?: string;
}

export interface UserRef {
  self?: string;
  id?: string;
  login?: string;
  display?: string;
  email?: string;
}

export interface Issue {
  self?: string;
  id?: string;
  key: string;
  summary: string;
  description?: string;
  status?: EntityRef;
  type?: EntityRef;
  priority?: EntityRef;
  queue?: EntityRef;
  resolution?: EntityRef;
  assignee?: UserRef;
  createdBy?: UserRef;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}

export interface Myself {
  login: string;
  display?: string;
  uid?: number;
  email?: string;
}

export interface TrackerSearchResult {
  issues: Issue[];
  total?: number;
}
