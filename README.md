# RoadPhone Custom App Demo

A runnable tour of the `window.roadphone` API (**v1.3.0**). Every tab is a working
example of one part of the API — install it, tap through it, then copy the parts
you need into your own app.

| Tab | Shows |
|-----|-------|
| **Phone** | `getPlayerName/getPhoneNumber/getJob/getIdentifier`, `isDarkMode`, `getBrightness`, `isFlightMode`, `getLanguage`, `copyToClipboard`, version + feature flags, app identity |
| **UI** | **`inputFocus`**, `pickEmoji`, `showBottomSheet`, `takePhoto` + `claimPhoto`, `showNotification`, a server RPC round-trip |
| **Data** | `contacts.*`, `messages.*`, `bank.*`, `alarms.*` — all permission-gated |
| **Storage** | `storage.*` (local) vs `storage.metadata.*` (rides on the phone item), `permissions.*` |
| **Events** | Every event the API fires, live |

## Install

1. Copy `roadphone-customapp-demo` into `resources/`.
2. Set `Config.Framework` in `config.lua` (`esx` / `qbcore` / `qbox` / `standalone`).
   On **Qbox**, also add `'@ox_lib/init.lua'` to `shared_scripts` — the bridge uses `lib.callback`.
3. Add to `server.cfg`, **after** roadphone: `ensure roadphone-customapp-demo`
4. Point the CustomApp slot at it in `public/static/config/config.json`:
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
5. Restart, open the phone, tap the Custom App icon.

## The five things that trip everyone up

### 1. Text input does nothing until you call `inputFocus`

The phone opens with `SetNuiFocusKeepInput(true)` so WASD still drives the game
while the phone is up. The price: **keystrokes do not reach your inputs**. Tap a
field, type, and nothing happens — while your keys steer the player instead.

Delegate it once on the document and every field, present and future, works:

```js
document.addEventListener('focusin',  e => isField(e.target) && rp.inputFocus(true))
document.addEventListener('focusout', e => isField(e.target) && rp.inputFocus(false))
```

### 2. The API lives on the parent window

Your app is an iframe *inside* the phone, so it's `window.parent.roadphone` —
`window.roadphone` is undefined.

### 3. `alert()` / `confirm()` / `prompt()` crash the game

FiveM's CEF has no dialog implementation. Use a toast (see `toast()` in `app.js`)
and `rp.showBottomSheet()` as your `confirm()`.

### 4. The camera reloads your app

Routing to the camera **unmounts the iframe**, so `await rp.takePhoto()` never
resolves — your app reboots from scratch. Persist what you'd lose, fire without
awaiting, and pick the shot back up on boot:

```js
localStorage.setItem('pending', JSON.stringify({ tab, draft }))
rp.takePhoto({ allowVideo: false })      // do NOT await
// …iframe reloads…
const shot = rp.claimPhoto()             // { url, isVideo } | null
```

### 5. Size in `vh`, never `px`

RoadPhone scales the phone with CSS `zoom`, so the iframe's viewport grows and
shrinks with the player's phone-size setting. A `px` layout doesn't follow — at
150% the text stays small while the screen around it grows. `1vh` = 1% of the
phone screen, whatever size it currently is.

## Talking to Lua

A custom app has **no `ui_page`**, so FiveM does not reliably route
`https://<this-resource>/…` fetches — the app may not reach its own NUI callbacks.
Two transports land on the same server callback, and `app.js` tries the direct one
first and falls back to RoadPhone's bridge, so it works either way:

```
a) UI: fetch('https://<resource>/rpc', { name, data })
     → client/client.lua  RegisterNUICallback('rpc')

b) UI: await roadphone.post('customAppRpc', { resource, name, data })
     → RoadPhone's client relay

both → Bridge.TriggerCallback('roadphone:customApp:<resource>', …)
     → server/server.lua  Bridge.RegisterCallback(…) → Handlers[name] → reply(result)
     → resolves the UI's awaited api() call
```

Add a handler in `server/server.lua` and the UI can call it immediately:

```lua
Handlers['myThing'] = function(src, player, data, reply)
    reply({ ok = true, hello = player.name })
end
```

```js
const res = await api('myThing', { some: 'payload' })
```

> **Unwrapping (b):** `roadphone.post()` parses the response, and when Lua replies
> with a *table* the payload ends up at `res.data` instead of on `res` itself.
> Always unwrap (`res.data !== undefined ? res.data : res`) — see `unwrapPost()` in
> `app.js`. Reading `res.ok` off the raw return value is the single most common
> custom-app bug.

### Pushing to the app from the server

`SendNUIMessage()` from this resource has **no document to deliver to** and cannot
reach the iframe. Server → player pushes go through RoadPhone's own NUI:

```lua
TriggerClientEvent('roadphone:sendNotification', src, {
    apptitle = 'My App', title = 'Heads up', message = '…',
    img = '/public/img/Apps/light_mode/custom.webp',
})
```

For live data, have the app refetch when a tab is (re)opened.

## Permissions

Contacts, messages, bank, alarms and metadata storage are gated. The first gated
call pops an iOS-style consent sheet; the answer is remembered **per namespace**,
which is why you set one at startup:

```js
rp.app.setName('My App')          // shown in the prompt
rp.app.setNamespace('my-app')     // scopes storage AND permission answers
```

A denied call **rejects** — always `try/catch` (see `guard()` in `app.js`).

## Docs

Full API reference: [docs.roadshop.org](https://docs.roadshop.org)

## License

MIT — use it as the starting point for your own app.
