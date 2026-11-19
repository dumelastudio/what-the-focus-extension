# Contributing

Bug reports, translation fixes and small pull requests are welcome. Use a GitHub issue for reproducible bugs. For vulnerabilities or sensitive details, use the private channel in [SECURITY.md](SECURITY.md).

## Run the checks

Use Python 3.12+ and Node.js 22+. From the repository root:

```sh
python3 scripts/build.py
node scripts/check.mjs
node --test tests/focus.test.mjs
python3 -m http.server 8846 --bind 127.0.0.1
```

- [Demo](http://127.0.0.1:8846/preview/) uses a fictional WhatsApp interface.
- [UI fixtures](http://127.0.0.1:8846/tests/) exercise the popup with a mock Chrome API.
- [Time and Focus](http://127.0.0.1:8846/tests/focus.html) exercises the time controls, focus timer and confirmation flow.
- [Content fixtures](http://127.0.0.1:8846/tests/content.html) exercise hiding, restoration and changes to the chat-list structure.

The demo and fixtures use synthetic data. To verify the real extension, load it unpacked, reload the extension after a build and refresh WhatsApp Web. Use a test account and avoid sending messages for UI checks. The [architecture guide](docs/ARCHITECTURE.md) describes the build inputs and files it generates.

## Update a WhatsApp Web selector

1. Note the options and Chrome/extension versions that reproduce the issue.
2. Use a small synthetic fixture with the necessary tag, role, test ID or icon. Avoid real user content, contact names, profile images and copied conversation markup.
3. Prefer stable UI markers such as `data-testid` or an established icon. Change `build_rules.py` for CSS rules and `extension/content.js` when a behavior requires JavaScript.
4. Verify the option in both states and with the global Distractions switch off. Check for controls recreated after navigation and that adjacent chat actions still work.
5. Rebuild and include the relevant generated files. State what passed and whether you tested a real WhatsApp Web session in the pull request.

## Update a translation

Edit `scripts/locales.py` or `scripts/focus_locales.py`, then run the build. English is the fallback language. Test longer strings, keyboard navigation, and RTL when translating Arabic. Chrome manifest catalogs use `pt_BR` and `zh_CN`. The interface uses `pt` and `zh-CN` internally.

## Submit a change

Keep each pull request focused and describe how to test it. Keep the extension's host access and stored data narrow. Confirm you can contribute your changes under the project's license. See [NOTICE.md](NOTICE.md) for brand use and attribution.
