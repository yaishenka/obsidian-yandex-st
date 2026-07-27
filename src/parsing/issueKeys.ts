export const ISSUE_KEY_REGEX_SOURCE = "[A-Z][A-Z0-9]*-\\d+";
export const ISSUE_KEY_REGEX = new RegExp(`\\b(${ISSUE_KEY_REGEX_SOURCE})\\b`, "g");
export const COMMENT_REGEX = /^\\s*#/;

const GENERIC_PREFIX_BLOCKLIST = new Set(["UTF", "SHA", "ISO", "RFC", "CVE", "ASCII", "MD", "CRC", "BASE"]);

export interface InlineIssueMatch {
  raw: string;
  key: string;
  compact: boolean;
  index: number;
}

export function createInlineIssueTagRegex(prefix: string): RegExp | null {
  if (prefix === "") {
    return null;
  }
  return new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(prefix)}(-?)(${ISSUE_KEY_REGEX_SOURCE})(?![A-Za-z0-9_])`, "g");
}

export function createInlineIssueUrlRegex(webUrl: string): RegExp | null {
  const baseUrl = webUrl.replace(/\/$/, "");
  if (baseUrl === "") {
    return null;
  }
  return new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(baseUrl)}/(${ISSUE_KEY_REGEX_SOURCE})(?=$|[/?#]|[^A-Za-z0-9_])(?:[/?#][^\\s]*)?`, "g");
}

export function parseIssueKeyLine(line: string, webUrl = ""): string | null {
  const trimmed = line.trim();
  if (trimmed === "" || COMMENT_REGEX.test(trimmed)) {
    return null;
  }
  const plain = new RegExp(`^(${ISSUE_KEY_REGEX_SOURCE})$`).exec(trimmed);
  if (plain && isLinkableKey(plain[1])) {
    return plain[1];
  }
  if (webUrl.trim() === "") {
    return null;
  }
  const normalizedWebUrl = webUrl.endsWith("/") ? webUrl : `${webUrl}/`;
  if (trimmed.startsWith(normalizedWebUrl)) {
    const key = trimmed.slice(normalizedWebUrl.length).split(/[/?#]/)[0];
    return new RegExp(`^${ISSUE_KEY_REGEX_SOURCE}$`).test(key) && isLinkableKey(key) ? key : null;
  }
  return null;
}

export function findInlineIssueTags(text: string, prefix: string): InlineIssueMatch[] {
  const regex = createInlineIssueTagRegex(prefix);
  if (!regex) {
    return [];
  }
  const matches: InlineIssueMatch[] = [];
  for (const match of text.matchAll(regex)) {
    const key = match[2];
    if (isLinkableKey(key)) {
      matches.push({ raw: match[0], key, compact: match[1] === "-", index: match.index ?? 0 });
    }
  }
  return matches;
}

export function isLinkableKey(key: string, allowedQueues: string[] = []): boolean {
  const queue = key.slice(0, key.indexOf("-")).toUpperCase();
  const allowed = allowedQueues.map((entry) => entry.toUpperCase());
  if (allowed.length > 0) {
    return allowed.includes(queue);
  }
  return !GENERIC_PREFIX_BLOCKLIST.has(queue);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
