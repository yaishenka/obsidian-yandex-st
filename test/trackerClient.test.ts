import { requestUrl } from "obsidian";
import { TrackerApiError, TrackerClient } from "../src/client/trackerClient";

const mockedRequestUrl = requestUrl as jest.Mock;

describe("TrackerClient", () => {
  beforeEach(() => {
    mockedRequestUrl.mockReset();
  });

  it("sends OAuth and language headers", async () => {
    mockedRequestUrl.mockResolvedValue({
      status: 200,
      json: { key: "YT-1", summary: "One", status: { id: "open", display: "Open" } },
      headers: {}
    });
    const client = new TrackerClient(() => ({
      apiUrl: "https://api.tracker.yandex.net",
      token: "secret",
      language: "ru"
    }));

    await client.getIssue("YT-1");

    expect(mockedRequestUrl).toHaveBeenCalledWith(expect.objectContaining({
      method: "GET",
      url: "https://api.tracker.yandex.net/v3/issues/YT-1",
      throw: false,
      headers: expect.objectContaining({
        Authorization: "OAuth secret",
        "Accept-Language": "ru"
      })
    }));
  });

  it("posts search query with paging", async () => {
    mockedRequestUrl.mockResolvedValue({ status: 200, json: [], headers: { "x-total-count": "7" } });
    const client = new TrackerClient(async () => ({
      apiUrl: "https://api.tracker.yandex.net/",
      token: "secret",
      language: "en"
    }));

    const result = await client.searchIssues("Assignee: me()", { limit: 5, page: 2 });

    expect(result.total).toBe(7);
    expect(mockedRequestUrl).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      url: "https://api.tracker.yandex.net/v3/issues/_search?perPage=5&page=2",
      body: JSON.stringify({ query: "Assignee: me()" })
    }));
  });

  it("throws a readable auth error", async () => {
    mockedRequestUrl.mockResolvedValue({ status: 401, json: {}, text: "", headers: {} });
    const client = new TrackerClient(() => ({
      apiUrl: "https://api.tracker.yandex.net",
      token: "bad",
      language: "ru"
    }));

    await expect(client.getIssue("YT-1")).rejects.toThrow("authentication failed");
  });

  it("throws when no token is configured", async () => {
    const client = new TrackerClient(() => undefined);
    await expect(client.getIssue("YT-1")).rejects.toBeInstanceOf(TrackerApiError);
  });

  it("throws when no API URL is configured", async () => {
    const client = new TrackerClient(() => ({ apiUrl: "", token: "secret", language: "ru" }));
    await expect(client.getIssue("YT-1")).rejects.toThrow("No Tracker API URL configured");
  });
});
