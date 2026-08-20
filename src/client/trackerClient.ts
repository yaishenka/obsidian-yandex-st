import { requestUrl, RequestUrlParam, RequestUrlResponse } from "obsidian";
import { STOrgIdHeader } from "../interfaces/settingsInterfaces";
import { Issue, Myself, TrackerSearchResult } from "../interfaces/trackerInterfaces";

export interface TrackerClientOptions {
  apiUrl: string;
  token: string;
  language: "ru" | "en";
  orgId?: string;
  orgIdHeader?: STOrgIdHeader;
}

export class TrackerApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "TrackerApiError";
  }
}

interface RequestOptions {
  query?: Record<string, string>;
  body?: unknown;
}

type OptionsProvider = () => TrackerClientOptions | undefined | Promise<TrackerClientOptions | undefined>;

export class TrackerClient {
  constructor(private readonly getOptions: OptionsProvider) {}

  async myself(): Promise<Myself> {
    return this.request<Myself>("GET", "/v3/myself");
  }

  async getIssue(key: string): Promise<Issue> {
    return this.request<Issue>("GET", `/v3/issues/${encodeURIComponent(key)}`);
  }

  async searchIssues(query: string, options: { limit?: number; page?: number } = {}): Promise<TrackerSearchResult> {
    const limit = options.limit ?? 50;
    const page = options.page ?? 1;
    const response = await this.requestRaw("POST", "/v3/issues/_search", {
      query: { perPage: String(limit), page: String(page) },
      body: { query }
    });
    return {
      issues: Array.isArray(response.json) ? response.json as Issue[] : [],
      total: parseTotal(response.headers)
    };
  }

  async countIssues(query: string): Promise<number> {
    const result = await this.searchIssues(query, { limit: 1, page: 1 });
    return result.total ?? result.issues.length;
  }

  private async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.requestRaw(method, path, options);
    return response.json as T;
  }

  private async requestRaw(method: string, path: string, options: RequestOptions = {}): Promise<RequestUrlResponse> {
    const clientOptions = await this.getOptions();
    if (!clientOptions || !clientOptions.token) {
      throw new TrackerApiError(401, "No OAuth token configured");
    }
    if (clientOptions.apiUrl.trim() === "") {
      throw new TrackerApiError(400, "No Tracker API URL configured");
    }

    const url = new URL(path, normalizeBaseUrl(clientOptions.apiUrl));
    Object.entries(options.query ?? {}).forEach(([name, value]) => url.searchParams.set(name, value));

    const request: RequestUrlParam = {
      method,
      url: url.toString(),
      throw: false,
      headers: {
        Authorization: `OAuth ${clientOptions.token}`,
        "Accept-Language": clientOptions.language,
        Accept: "application/json",
        ...orgIdHeaders(clientOptions),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {})
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      contentType: "application/json"
    };

    let response: RequestUrlResponse;
    try {
      response = await requestUrl(request);
    } catch (error) {
      throw new TrackerApiError(0, `Tracker API request failed: ${(error as Error).message}`);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new TrackerApiError(response.status, extractErrorMessage(response));
    }
    return response;
  }
}

function orgIdHeaders(options: TrackerClientOptions): Record<string, string> {
  const orgId = options.orgId?.trim() ?? "";
  if (orgId === "") {
    return {};
  }
  const header = options.orgIdHeader === "X-Cloud-Org-ID" ? "X-Cloud-Org-ID" : "X-Org-ID";
  return { [header]: orgId };
}

function normalizeBaseUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim();
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function parseTotal(headers: Record<string, string> | undefined): number | undefined {
  const value = headers?.["x-total-count"] ?? headers?.["X-Total-Count"];
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractErrorMessage(response: RequestUrlResponse): string {
  const payload = response.json as { errorMessages?: string[]; errors?: Record<string, string>; message?: string } | undefined;
  if (response.status === 401) {
    return "Tracker authentication failed";
  }
  if (response.status === 403) {
    return "Tracker permission denied";
  }
  if (response.status === 404) {
    return "Tracker issue not found";
  }
  const messages = [
    ...(payload?.errorMessages ?? []),
    ...Object.entries(payload?.errors ?? {}).map(([field, message]) => `${field}: ${message}`)
  ];
  return messages.join("; ") || payload?.message || `Tracker API request failed with HTTP ${response.status}`;
}
