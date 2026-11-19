# Troubleshooting

## A shortcut or status ring is visible

Open **Distractions** and check both the main switch and the individual option. For the tab icon and title, enable **Fixed icon and title without unread count**. After updating an unpacked installation, reload the extension in `chrome://extensions` and refresh WhatsApp Web. If the problem persists, WhatsApp Web may have changed the control's markup.

## The counter is missing or slow

Check **Record time spent** and **Show counter in WhatsApp** in **Time**. Keep the WhatsApp Web tab active in a focused Chrome window. A background tab, device idle time, or a running focus session pauses accounting. The in-page counter needs space in the chat header. Totals are also available from the Chrome toolbar.

## Notifications still get through

Confirm that Chrome granted the optional permission and that the notification came from WhatsApp Web in this Chrome profile. Session audio is muted separately. The extension does not silence messages or calls on the native app or a different device.

If you ended a session and still see a mute or permission warning, open the extension again so it can retry cleanup. If **continuous** notification silencing is still on, disable it to restore the prior notification behavior.

## The WhatsApp sidebar panel does not open

Refresh WhatsApp Web after installing or updating. Use the icon in the Chrome toolbar if the WhatsApp sidebar layout changed. Both interfaces manage the same preferences.

## Report an issue

Include your Chrome version, OS, extension version, installation source, the options you used and specific steps. A minimal synthetic example helps. Omit chat contents, contact information, screenshots with real message data and browser credentials.
