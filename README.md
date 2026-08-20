# Unofficial Yandex Tracker ST for Obsidian

Render [Yandex Tracker](https://tracker.yandex.ru) issues and queries directly in Obsidian notes.

This is an unofficial community plugin. It is not affiliated with, endorsed by, maintained by, or supported by Yandex.

Public Tracker API access documentation: <https://yandex.ru/support/tracker/ru/api-ref/access>.

## Installation

Install from the Obsidian community plugin directory after approval, or install a GitHub release manually by copying these files into `.obsidian/plugins/yandex-tracker-st/`:

- `manifest.json`
- `main.js`
- `styles.css`

## Settings

Configure these values in plugin settings before rendering issues:

- API URL: your Tracker API base URL
- Web URL: your Tracker web URL
- Token file fallback: `~/.tracker_token`
- Organization ID: sent as `X-Org-ID` or `X-Cloud-Org-ID` on every Tracker API request
- Organization header: `X-Org-ID` for Yandex 360 (default), `X-Cloud-Org-ID` for Yandex Cloud
- Language: `ru` by default; supported values: `ru`, `en`

Paste an OAuth token into settings, or leave it empty and keep the token in the configured token file. Follow the public API access docs for OAuth, IAM token, and organization requirements. Find the organization ID in Tracker: Administration → Organizations.

## Supported MVP Syntax

```st-issue
YT-123
https://tracker.yandex.ru/YT-456
```

```st-search
type: TABLE
limit: 15
columns: KEY, SUMMARY, STATUS, ASSIGNEE, UPDATED
query: Assignee: me() AND Resolution: empty() "Sort by": Updated DESC
```

```st-count
Assignee: me() AND Resolution: empty()
```

Inline:

```markdown
ST:YT-123
ST:-YT-123
```

Real Tracker API calls are made only by Obsidian rendering after you configure credentials.
