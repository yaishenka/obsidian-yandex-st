import { formatIssueTemplate, issueFieldText } from "../src/rendering/issueFields";
import { Issue } from "../src/interfaces/trackerInterfaces";

const issue: Issue = {
  key: "YT-1",
  summary: "Fix it",
  status: { id: "open", display: "Open" },
  assignee: { display: "Alice", login: "alice" },
  updatedAt: "not-a-date",
  priority: { id: "high", display: "High" },
  type: { id: "bug", display: "Bug" }
};

describe("issueFields", () => {
  it("reads the same fields as search columns", () => {
    expect(issueFieldText(issue, "KEY")).toBe("YT-1");
    expect(issueFieldText(issue, "SUMMARY")).toBe("Fix it");
    expect(issueFieldText(issue, "STATUS")).toBe("Open");
    expect(issueFieldText(issue, "ASSIGNEE")).toBe("Alice");
    expect(issueFieldText(issue, "UPDATED")).toBe("not-a-date");
    expect(issueFieldText(issue, "PRIORITY")).toBe("High");
    expect(issueFieldText(issue, "TYPE")).toBe("Bug");
  });

  it("fills known template placeholders and keeps unknown ones", () => {
    expect(formatIssueTemplate("{{ key }} {{ summary }} ({{ status }})", issue)).toBe("YT-1 Fix it (Open)");
    expect(formatIssueTemplate("{{KEY}} / {{ unknown }} / {{ type }}", issue)).toBe("YT-1 / {{ unknown }} / Bug");
  });

  it("falls back to login when assignee has no display name", () => {
    expect(issueFieldText({ ...issue, assignee: { login: "alice" } }, "ASSIGNEE")).toBe("alice");
  });
});
