# Architecture and data

What the Focus uses Chrome Manifest V3 and bundled JavaScript and CSS. The extension runs in the regular desktop Chrome profile on WhatsApp Web. The public demo uses a mock Chrome API and a fictional WhatsApp interface.

## Components

| Source | Responsibility |
| --- | --- |
| `extension/manifest.json` | Declares Chrome 120+, runtime permissions, the single site match and the extension-only home panel resource. |
| `extension/content.js` and `build_rules.py` | Apply reversible hiding, status-ring and tab icon or title changes. `build_rules.py` generates `extension/rules.css`. |
| `extension/popup.js`, `focus-popup.js` and `preference-controls.js` | Render Distractions, Time and Focus. Manage theme, language, state feedback and confirmations. |
| `extension/home.js` and `home-panel.js` | Add the sidebar shortcut and mount the same controls in an extension frame. Fall back to the Chrome popup if the panel cannot load. |
| `extension/focus-page.js` and `runtime-client.js` | Report visibility and focus, draw the counter and session overlay, and request the current state from the worker. |
| `extension/background.js` | Handles Chrome events and verifies message origin, frame and command before forwarding to the controller. |
| `extension/focus-core.js` and `focus-controller.js` | Normalize preferences, calculate active time, serialize state changes and recover sessions after reload or restart. |
| `scripts/locales.py`, `scripts/focus_locales.py` and `scripts/icons.py` | Generate the localized manifest messages, UI dictionary and brand image formats. |
| `site/`, `preview/` and `tests/` | Provide source for the embedded product pages, a synthetic demo and automated or browser fixtures. |

## Active time

The worker counts one eligible tab at a time. A report from the WhatsApp Web content script must be recent, and the tab must be visible, active and in the focused Chrome window. The device must be active and a focus session cannot be running. The idle threshold is 120 seconds. Intervals longer than 30 seconds are discarded to avoid counting gaps such as suspension.

Totals are divided at local midnight. Weeks start on Monday and months follow the calendar. The Time view shows up to seven recent daily entries and totals for the current day, week and month. The counter in the WhatsApp Web header may be hidden when there is too little space. Tracking and display have independent switches. Turning tracking off keeps existing totals, and **Clear history** deletes them.

## Local storage

All persistent extension values use `chrome.storage.local` in the current profile.

| Key | Contents |
| --- | --- |
| `whatsappFocus` and `whatsappFocusAppearance` | Visual preferences, language and appearance. |
| `whatTheFocusPreferences` | Time recording, on-page counter and optional notification preferences. |
| `whatTheFocusUsage` | Date-to-duration totals, retained for up to 365 days. |
| `whatTheFocusSession` | The end time and temporary information needed to recover the session and restore mute state, including affected tab IDs. |

There is no account, remote translation, analytics or server storage. Message text, contacts, visited URLs and page titles are not stored. Existing supported preferences are normalized when read.

## Permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Keep preferences, aggregates and temporary session state. |
| `alarms` | Wake the worker when a timed session ends. |
| `idle` | Detect when the computer is idle or locked and pause time accounting. |
| `https://web.whatsapp.com/*` | Apply the chosen changes, add the panel and place the counter and focus overlay. |
| `contentSettings` (optional) | Set and remove a browser notification rule for WhatsApp Web. |

The permission prompt happens after the user selects a feature that needs it. Without permission, the timed overlay and tab audio mute still work. The continuous notification option starts off in a fresh installation. During a session, browser notification silencing starts selected but only takes effect with Chrome permission.

## Session recovery

The worker stores the deadline before applying session effects, tracks audio changes it made, and reconstructs the alarm if the worker restarts. The same origin-scoped browser notification rule serves the session and continuous preferences. When both are off, the extension removes its rule so the prior Chrome setting takes effect. It preserves tabs muted independently by the user. If cleanup fails, the worker keeps the recovery information and the popup provides feedback so cleanup can be retried.

The session applies to WhatsApp Web tabs in the current regular Chrome profile. Messages continue arriving. Other devices and browser profiles keep their own notification settings. The session provides a personal cue and can be ended through the extension.

## Build outputs

`python3 scripts/build.py` regenerates icons, translations, CSS, the home panel, packaged product pages and two HTML test fixtures. It writes the installable ZIP to `site/downloads/`. The extension ZIP and the source checkout are independent of the public landing deployment. The CI workflow runs the same build and tests with a read-only repository token.
