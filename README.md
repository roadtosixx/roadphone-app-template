# RoadPhone Custom App Demo

A demo/template custom app for **RoadPhone-Pro** that showcases the `window.roadphone` API **v1.3.0**.

## Features

- 🎨 **Theme-Aware** — Auto-adapts to the phone's dark/light mode
- 📱 **Player Info** — Name, phone number, job, identifier, language
- ⚙️ **Settings Display** — Brightness, flight mode, dark mode (live-updating)
- 💾 **Storage Demo** — Both `localStorage` and **phone-metadata** backends (v1.3.0)
- 🔐 **Permission Flow** — iOS-style consent prompt for sensitive APIs (v1.3.0)
- 📇 **Phone Data Access** — Read contacts, bank balance through permission-gated APIs (v1.3.0)
- 🔄 **Version Negotiation** — Fails loudly on Phones too old to run the demo (v1.3.0)
- 🆔 **App Identity** — Sets a stable namespace so storage doesn't collide with other apps (v1.3.0)
- 📡 **Lua Integration** — `roadphone.post()` example with NUI callback handler
- 📋 **Live Event Log** — All API events streamed in real time (incl. new lifecycle events)

## What's new in this template (v1.3.0)

This template was rewritten against the **RoadPhone v1.3.0 Custom App API**. If
you're upgrading from the older v1.0 template, the key additions are:

- `roadphone.minVersion('1.3.0')` and `roadphone.requireFeature('storage')` at startup
- `roadphone.app.setName(...)` + `roadphone.app.setNamespace(...)` for identity
- `roadphone.storage.*` (localStorage backend, sync) and `roadphone.storage.metadata.*` (phone-metadata backend, async, survives phone trades)
- `roadphone.contacts.list()`, `roadphone.bank.getBalance()` — permission-gated reads
- New event listeners: `appOpened`, `appClosed`, `incomingCall`, `callEnded`, `notificationReceived`, `languageChanged`

## Installation

### 1. Copy the Resource

Copy the `roadphone-customapp-demo` folder to your FiveM server's `resources` directory:

```
resources/
└── roadphone-customapp-demo/
    ├── fxmanifest.lua
    ├── html/
    │   └── index.html
    ├── client/
    │   └── client.lua
    └── server/
        └── server.lua
```

### 2. Add to server.cfg

```cfg
ensure roadphone-customapp-demo
```

### 3. Configure RoadPhone

In `public/static/config/config.json`, set the CustomApp URL:

```json
{
  "AppStore": {
    "CustomApp": {
      "url": "nui://roadphone-customapp-demo/html/index.html",
      "darkmode": true
    }
  }
}
```

### 4. Restart Server

`refresh` then `ensure roadphone-customapp-demo`, or restart the server.

### 5. Open the App

In-game, open the phone and tap the Custom App icon.

## API Usage

The template demonstrates all major surfaces of the v1.3.0 API:

```javascript
// Access API from iframe (we're inside the phone's <iframe>)
const roadphone = window.parent.roadphone

// ─── Recommended startup ──────────────────────────────────────────────
roadphone.minVersion('1.3.0')               // throws if Phone too old
roadphone.requireFeature('storage')         // throws if feature missing
roadphone.app.setName('My App')             // shown in permission prompts
roadphone.app.setNamespace('my-app')        // isolates your data

// ─── Getters ──────────────────────────────────────────────────────────
roadphone.isDarkMode()        // boolean
roadphone.getPlayerName()     // string
roadphone.getPhoneNumber()    // string
roadphone.getJob()            // string
roadphone.getIdentifier()     // string
roadphone.getBrightness()     // number 10-100
roadphone.isFlightMode()      // boolean
roadphone.getLanguage()       // 1.3.0 — locale code, e.g. "de_DE"

// ─── Storage (1.3.0) ──────────────────────────────────────────────────
// localStorage backend — sync, survives reload
roadphone.storage.set('city', 'Berlin')
roadphone.storage.get('city')                        // → 'Berlin'
roadphone.storage.delete('city')
roadphone.storage.keys()                             // → ['city', ...]
roadphone.storage.clear()

// Metadata backend — async, survives phone trades / character switches
await roadphone.storage.metadata.set('city', 'Berlin')
const city = await roadphone.storage.metadata.get('city')
await roadphone.storage.metadata.delete('city')

// ─── Permissions (1.3.0) ──────────────────────────────────────────────
const ok = await roadphone.permissions.request('contacts.read')
roadphone.permissions.has('contacts.read')           // boolean
roadphone.permissions.revoke('contacts.read')
roadphone.permissions.list()                         // all decisions

// ─── Phone data (1.3.0, permission-gated) ─────────────────────────────
const contacts = await roadphone.contacts.list()     // [{ id, firstname, ... }]
const c = await roadphone.contacts.find('1234567')
const count = await roadphone.contacts.count()

await roadphone.messages.send('1234567', 'Hi!')
const msgs = await roadphone.messages.list('1234567')

const balance = await roadphone.bank.getBalance()
const iban = await roadphone.bank.getIban()
const accounts = await roadphone.bank.getAccounts()

const alarms = await roadphone.alarms.list()
await roadphone.alarms.create({ time: '07:30', label: 'Wake up' })
await roadphone.alarms.delete(id)

// ─── Native UI ────────────────────────────────────────────────────────
roadphone.showNotification({ appTitle, title, message, icon })
const photo = await roadphone.takePhoto({ allowVideo: false })
const choice = await roadphone.showBottomSheet({ groups: [...] })
const emoji = await roadphone.pickEmoji()
roadphone.copyToClipboard('text')

// ─── Lua bridge ───────────────────────────────────────────────────────
roadphone.post('eventName', { data })

// ─── Events ───────────────────────────────────────────────────────────
roadphone.on('darkModeChanged', (isDark) => {})
roadphone.on('brightnessChanged', (value) => {})
roadphone.on('flightModeChanged', (isEnabled) => {})
roadphone.on('phoneOpened', () => {})
roadphone.on('phoneClosed', () => {})

// 1.3.0 lifecycle events:
roadphone.on('languageChanged', (lang) => {})
roadphone.on('appOpened', ({ app, path }) => {})
roadphone.on('appClosed', ({ app, path }) => {})
roadphone.on('incomingCall', ({ number, isAnonym }) => {})
roadphone.on('callEnded', ({ number }) => {})
roadphone.on('notificationReceived', (notif) => {})
```

## Permission Scopes

Sensitive APIs are gated behind permission scopes. The user is prompted with an
iOS-style action sheet on first use; their decision is remembered.

| Scope | Required by |
|-------|-------------|
| `contacts.read` | `contacts.list/find/count` |
| `messages.read` | `messages.list/conversations` |
| `messages.send` | `messages.send` |
| `bank.read` | `bank.getBalance/getIban/getAccounts` |
| `alarms.read` | `alarms.list` |
| `alarms.write` | `alarms.create/delete` |
| `storage.metadata` | `storage.metadata.*` |

If the user denies, the gated call **rejects** with
`Error: Permission '<scope>' denied by user`. Always wrap in `try/catch`:

```javascript
try {
  const contacts = await roadphone.contacts.list()
  render(contacts)
} catch (e) {
  // user denied — show a fallback UI
}
```

## Important Notes

⚠️ **Do NOT use `ui_page` in fxmanifest.lua!**

The custom app runs inside RoadPhone's iframe. `ui_page` will cause the app to
render fullscreen instead of inside the phone.

```lua
-- ❌ WRONG - Don't do this!
ui_page 'html/index.html'

-- ✅ CORRECT - Only declare files
files {
    'html/index.html'
}
```

## Customization

Modify `html/index.html` as a starting point for your own app. The script
section is heavily commented and structured by feature area.

### Storage isolation

Always set a unique namespace at startup:

```javascript
roadphone.app.setNamespace('your-stable-app-id')
```

Without this, your data lands in the shared `default` namespace and may
collide with other custom apps.

### Styling Tips

- Use `px` units (the iframe has its own viewport — `vh` would be too small)
- Add `padding-top: 45px` for the phone status bar
- Hide the scrollbar with CSS for a native feel
- Support both light and dark themes — listen to `darkModeChanged` and toggle a body class

### Version-gating

Always declare the minimum API version you depend on, so older Phones fail
loudly instead of silently misbehaving:

```javascript
try {
  roadphone.minVersion('1.3.0')
} catch (e) {
  // show a "please update" screen instead of letting the app crash mid-flow
}
```

## Documentation

For full API reference: [docs.roadshop.org](https://docs.roadshop.org)

## License

MIT — feel free to use this as the basis for your own custom apps.
