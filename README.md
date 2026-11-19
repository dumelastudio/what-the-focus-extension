# What the Focus

An independent Chrome extension by Dumela for reducing distractions in WhatsApp Web. Hide the shortcuts you rarely use, see how much active time you spend, and set aside time to focus.

[Português do Brasil](docs/README.pt-BR.md) · [Interactive demo](https://app.dumela.tv/what-the-focus/) · [Privacy policy](https://app.dumela.tv/what-the-focus/privacy.html) · [Support](https://app.dumela.tv/what-the-focus/support.html)

## Install from source

Requires desktop Google Chrome 120 or later and an account already connected to WhatsApp Web.

1. Clone this repository or download its source ZIP and extract it.
2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` directory. It already contains the generated files.
4. Open or reload WhatsApp Web. Open What the Focus in the Chrome toolbar or from the icon in the WhatsApp Web sidebar.
5. To update an unpacked installation, update the files in the same directory, then click **Reload** on the extension card and reload WhatsApp Web.

Use [GitHub Releases](https://github.com/dumelastudio/what-the-focus-extension/releases) for versioned downloads. The ZIP contains the extension files at its root. Extract it and select that folder in **Load unpacked**.

## Controls

| Tab | What you can do |
| --- | --- |
| **Distractions** | Hide Status and profile rings, Channels, Communities, Meta AI, Archived and Locked Chats shortcuts, media and calls shortcuts. Keep a fixed tab icon and remove the unread prefix from the tab title. Pause the visual changes together or control each one. |
| **Time** | See active time for the day, week and month and a breakdown of the last seven days. Recording and the page counter start enabled in new installations. Turn either off or clear the history here. |
| **Focus** | Start a session for 30 minutes, 1 hour, 2 hours or 4 hours. The overlay covers WhatsApp Web and Chrome mutes its tab audio. You can end early or separately silence WhatsApp Web browser notifications between sessions. |

Theme and language follow the device initially. Use the theme icon to cycle between System, Light and Dark. Open the globe with the pointer, touch or keyboard to choose a language. The interface includes Arabic, Brazilian Portuguese, English, French, German, Hindi, Indonesian, Japanese, Simplified Chinese and Spanish.

## Data and permissions

Preferences and daily usage totals stay in the current Chrome profile. The extension has no account, ads, analytics or server, and it does not store messages, contacts, visited URLs or page titles. The timer estimates active use while the WhatsApp Web tab is visible, active and in a focused Chrome window. It pauses when the device is idle or locked or a focus session is running. Daily totals are kept for up to 365 days.

Chrome permissions include `storage`, `alarms`, `idle` and access to `https://web.whatsapp.com/*`. Browser notification silencing requires optional `contentSettings`, requested when you start a session with that option selected or turn on continuous silencing. The extension applies its rule only to WhatsApp Web. Messages still arrive during a session, and notifications on other devices follow their own settings.

Read [how it works](docs/ARCHITECTURE.md) for the extension's components, data, permissions and recovery behavior. WhatsApp Web changes can affect what is hidden or where the counter appears. See [troubleshooting](docs/TROUBLESHOOTING.md) for checks and what to include in a report.

## Build and contribute

Use Node.js 22 or later and Python 3.12 or later. No package install is needed.

```sh
python3 scripts/build.py
node scripts/check.mjs
node --test tests/focus.test.mjs
```

The build generates the files in `extension/` and an installable ZIP with the license and attribution notices in `site/downloads/`. See [Contributing](CONTRIBUTING.md) to run the browser fixtures or update a selector or translation. Use [Security](SECURITY.md) to report a vulnerability or privacy concern privately.

[Changelog](CHANGELOG.md) · [License](LICENSE) · [Attribution and brand use](NOTICE.md)

What the Focus is developed by Dumela and is independent of WhatsApp and Meta.
