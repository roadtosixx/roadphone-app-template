'use strict'
// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  RoadPhone Custom App Demo — a live tour of the window.roadphone API      ║
// ║                                                                           ║
// ║  Every tab is a runnable example of one part of the API. Read it top to   ║
// ║  bottom, or copy the section you need into your own app.                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// The app runs in an iframe INSIDE the phone, so the API lives on the parent
// window — `window.roadphone` would be undefined here.
const rp = window.parent.roadphone

// The page is served from https://cfx-nui-<resource>/..., but NUI callbacks are
// routed at https://<resource>/... — strip the prefix to get the resource name.
const RES = (window.location.host || '').replace(/^cfx-nui-/, '') || 'roadphone-customapp-demo'

// ── 1. Startup gate & identity ──────────────────────────────────────────────
// Fail loudly on a Phone too old for the API this app uses, then declare who we
// are. setNamespace() decides where storage lands and which app the user's
// permission answers are remembered for — set it BEFORE touching either.
try {
  if (rp) {
    rp.minVersion('1.3.0')
    rp.app.setName('Custom App Demo')
    rp.app.setNamespace('customapp-demo')
  }
} catch (e) {
  console.warn('[demo] version gate failed:', e.message)
}

// ── 2. Theme ────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.body.classList.toggle('dark', !!dark)
  document.body.classList.toggle('light', !dark)
}
applyTheme(rp ? rp.isDarkMode() : false)
if (rp) rp.on('darkModeChanged', applyTheme)

// ── 3. Server RPC ───────────────────────────────────────────────────────────
// Two transports reach the SAME server callback ('roadphone:customApp:<res>'):
//
//   a) own-resource NUI callback — fetch('https://<res>/rpc') → our client.lua
//   b) RoadPhone's host bridge   — rp.post('customAppRpc', {resource,name,data})
//
// (a) is not routed on every server (a custom app has no ui_page), so we try it
// first and fall back to (b), which always works. Your app only needs one — but
// shipping both costs ten lines and never leaves a player with a dead app.
//
// UNWRAPPING (b): rp.post() JSON.parse()s the response and, when Lua replied
// with a TABLE, that parse throws and it hands back the whole axios Response
// instead — the payload then sits at `.data`. Always unwrap; never read fields
// off the raw return value. (Keep a top-level `data` key out of your Lua replies
// and this stays unambiguous.)
function unwrapPost(res) {
  return res && res.data !== undefined ? res.data : res
}

async function api(name, data) {
  const payload = data || {}
  try {
    const resp = await fetch(`https://${RES}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: payload }),
    })
    return await resp.json()
  } catch (e) {
    if (rp && rp.post) {
      const res = unwrapPost(await rp.post('customAppRpc', { resource: RES, name, data: payload }))
      if (res && typeof res === 'object') return res
    }
    console.error('[demo] rpc failed:', name, e)
    return { error: 'network' }
  }
}

// ── 4. NUI keyboard focus ───────────────────────────────────────────────────
// THE most important call for any app with a text field.
//
// The phone opens with SetNuiFocusKeepInput(true) so WASD still drives the game
// while the phone is up. The side effect: keystrokes do NOT reach your inputs.
// Until you call inputFocus(true), typing does nothing (and your keys steer the
// player instead).
//
// Delegating on the document covers every current AND future input/textarea, so
// views rendered later need no per-field wiring.
let focusOn = false

function setInputFocus(on) {
  if (!rp || !rp.inputFocus) return
  rp.inputFocus(on)
  focusOn = on
  renderFocusPill()
}

document.addEventListener('focusin', (e) => {
  if (isTextField(e.target)) setInputFocus(true)
})
document.addEventListener('focusout', (e) => {
  if (isTextField(e.target)) setInputFocus(false)
})

function isTextField(node) {
  return !!node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')
}

// A visible readout so you can SEE the focus flip while testing in-game.
function renderFocusPill() {
  document.querySelectorAll('.focus-pill').forEach((pill) => {
    pill.classList.toggle('on', focusOn)
    const label = pill.querySelector('.focus-label')
    if (label) label.textContent = focusOn ? 'inputFocus(true) — typing works' : 'inputFocus(false) — game has the keys'
  })
}

// ── 5. Tiny helpers ─────────────────────────────────────────────────────────
function el(html) {
  const tpl = document.createElement('template')
  tpl.innerHTML = html.trim()
  return tpl.content.firstChild
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
// NEVER use alert()/confirm()/prompt() — they crash FiveM's CEF. Toast instead.
function toast(msg) {
  let node = document.querySelector('.toast')
  if (!node) {
    node = el('<div class="toast"></div>')
    document.body.appendChild(node)
  }
  node.textContent = msg
  node.classList.add('show')
  clearTimeout(node._h)
  node._h = setTimeout(() => node.classList.remove('show'), 1800)
}
// Gated APIs reject when the user denies the permission — always try/catch.
async function guard(fn, fallback = null) {
  try {
    return await fn()
  } catch (e) {
    toast(e.message)
    return fallback
  }
}

// ── 6. Event log (shared by the Log tab) ────────────────────────────────────
const events = []

function logEvent(name, detail) {
  const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  events.unshift({ time, name, detail: detail === undefined ? '' : detail })
  if (events.length > 40) events.pop()
  if (activeTab === 'log') refresh()
}

// Every event the API can fire (v1.3.0). Subscribe once, at boot — NOT per view,
// or every tab switch would stack another listener on the same event.
if (rp) {
  rp.on('phoneOpened', () => logEvent('phoneOpened'))
  rp.on('phoneClosed', () => logEvent('phoneClosed'))
  rp.on('darkModeChanged', (v) => logEvent('darkModeChanged', v))
  rp.on('brightnessChanged', (v) => logEvent('brightnessChanged', v + '%'))
  rp.on('flightModeChanged', (v) => logEvent('flightModeChanged', v))
  rp.on('languageChanged', (v) => logEvent('languageChanged', v))
  rp.on('appOpened', (d) => logEvent('appOpened', d && d.app))
  rp.on('appClosed', (d) => logEvent('appClosed', d && d.app))
  rp.on('incomingCall', (d) => logEvent('incomingCall', d && (d.isAnonym ? 'anonymous' : d.number)))
  rp.on('callEnded', (d) => logEvent('callEnded', d && d.number))
  rp.on('notificationReceived', (n) => logEvent('notificationReceived', n && `[${n.appTitle}] ${n.title}`))
}

// ── 7. View router ──────────────────────────────────────────────────────────
const screen = document.getElementById('screen')
const Views = {}
let activeTab = 'phone'

function register(name, render) {
  Views[name] = render
}
async function show(name) {
  activeTab = name
  renderTabbar()
  screen.scrollTop = 0
  await refresh()
}
async function refresh() {
  screen.innerHTML = ''
  await Views[activeTab](screen)
  renderFocusPill()
}

const TABS = [
  { name: 'phone', label: 'Phone', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>' },
  { name: 'ui', label: 'UI', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M7 14h6"/></svg>' },
  { name: 'data', label: 'Data', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>' },
  { name: 'store', label: 'Storage', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>' },
  { name: 'log', label: 'Events', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>' },
]

function renderTabbar() {
  const bar = document.getElementById('tabbar')
  bar.innerHTML = ''
  TABS.forEach((tab) => {
    const node = el(`<div class="tab ${tab.name === activeTab ? 'active' : ''}">${tab.icon}<span>${tab.label}</span></div>`)
    node.onclick = () => show(tab.name)
    bar.appendChild(node)
  })
}

// A group that can be refilled later. Returns a setter; replaceWith() detaches
// the old node, so the setter keeps its own reference fresh — otherwise only the
// first call would land and every one after it would write to a dead node.
function swapGroup(parent, rows) {
  let node = groupOf(rows)
  parent.appendChild(node)
  return (newRows) => {
    const fresh = groupOf(newRows)
    node.replaceWith(fresh)
    node = fresh
  }
}

// Build a grouped list of { label, value } rows.
function groupOf(rows) {
  const g = el('<div class="group"></div>')
  rows.forEach((r) => {
    const cell = el(`<div class="cell ${r.onClick ? 'tappable' : ''}">
      <div class="cell-main">
        <div class="cell-title">${esc(r.label)}</div>
        ${r.sub ? `<div class="cell-sub">${esc(r.sub)}</div>` : ''}
      </div>
      ${r.badge ? `<span class="badge ${r.badge.kind}">${esc(r.badge.text)}</span>` : ''}
      ${r.value !== undefined ? `<div class="cell-value ${r.mono ? 'mono' : ''}">${esc(r.value)}</div>` : ''}
      ${r.onClick ? '<span class="cell-chevron">›</span>' : ''}
    </div>`)
    if (r.onClick) cell.onclick = r.onClick
    g.appendChild(cell)
  })
  return g
}

// ═══════════════════════════════════════════════════════════════════════════
//  TAB 1 — Phone: getters, version, feature flags
// ═══════════════════════════════════════════════════════════════════════════
register('phone', async (c) => {
  c.appendChild(el('<div class="lg-title">Custom App Demo</div>'))
  c.appendChild(el(`<div class="subtitle">A live tour of window.roadphone</div>`))

  if (!rp) {
    c.appendChild(el('<div class="banner bad">API not available — open this inside RoadPhone</div>'))
    return
  }
  c.appendChild(el(`<div class="banner ok">API connected — v${esc(rp.version)}</div>`))

  c.appendChild(el('<div class="group-title">Player</div>'))
  c.appendChild(groupOf([
    { label: 'Name', value: rp.getPlayerName() || '—' },
    { label: 'Phone number', value: rp.getPhoneNumber() || '—' },
    { label: 'Job', value: rp.getJob() || '—' },
    { label: 'Identifier', value: rp.getIdentifier() || '—', mono: true },
  ]))

  c.appendChild(el('<div class="group-title">Phone state</div>'))
  c.appendChild(groupOf([
    { label: 'Dark mode', badge: boolBadge(rp.isDarkMode()) },
    { label: 'Brightness', value: rp.getBrightness() + '%' },
    { label: 'Flight mode', badge: boolBadge(rp.isFlightMode()) },
    { label: 'Language', value: rp.getLanguage() },
  ]))

  // Identity is what namespaces your storage and your permission answers.
  c.appendChild(el('<div class="group-title">App identity</div>'))
  c.appendChild(groupOf([
    { label: 'app.getName()', value: rp.app.getName() },
    { label: 'app.getNamespace()', value: rp.app.getNamespace(), mono: true },
  ]))

  // Probe before you call: hasFeature() lets one build run on old and new Phones.
  c.appendChild(el('<div class="group-title">Feature flags</div>'))
  const flags = Object.keys(rp.features || {}).sort()
  c.appendChild(groupOf(flags.map((f) => ({ label: f, badge: boolBadge(rp.hasFeature(f)) }))))
  c.appendChild(el('<div class="group-note">hasFeature(name) probes; requireFeature(name) and minVersion(v) throw instead — use those at startup.</div>'))

  const copy = el('<button class="btn btn-secondary">Copy phone number</button>')
  copy.onclick = () => {
    rp.copyToClipboard(rp.getPhoneNumber())
    toast('Copied to clipboard')
  }
  c.appendChild(copy)
})

function boolBadge(v) {
  return { kind: v ? 'on' : 'off', text: v ? 'ON' : 'OFF' }
}

// ═══════════════════════════════════════════════════════════════════════════
//  TAB 2 — UI: inputFocus, emoji picker, bottom sheet, camera, notification
// ═══════════════════════════════════════════════════════════════════════════
const DRAFT_KEY = 'demo_draft'      // survives the camera round-trip
const PENDING_KEY = 'demo_pending_photo'
const PENDING_TTL = 120000          // a camera trip is seconds; older = stale leftover

let draft = ''
let lastShot = null

register('ui', async (c) => {
  if (!rp) {
    c.appendChild(el('<div class="empty">API not available</div>'))
    return
  }
  c.appendChild(el('<div class="lg-title">UI</div>'))

  // ── inputFocus ────────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title">Text input · inputFocus</div>'))
  const pill = el('<div class="focus-pill"><span class="focus-dot"></span><span class="focus-label"></span></div>')
  c.appendChild(pill)

  const row = el('<div class="field-row"></div>')
  const input = el(`<input class="field" placeholder="Tap here and type…" value="${esc(draft)}">`)
  input.oninput = () => { draft = input.value }
  const emoji = el('<button class="emoji-btn">🙂</button>')
  // pickEmoji() opens the phone's own emoji panel and resolves with the pick.
  emoji.onclick = async () => {
    const picked = await rp.pickEmoji()
    if (!picked) return
    draft = input.value + picked.native
    input.value = draft
    logEvent('pickEmoji', picked.native)
  }
  row.appendChild(input)
  row.appendChild(emoji)
  c.appendChild(row)
  c.appendChild(el('<div class="group-note" style="margin-top:1.36vh">Focus the field: the app calls inputFocus(true) so keystrokes reach it, and inputFocus(false) on blur so WASD drives the game again. Without it, typing silently does nothing.</div>'))

  // Round-trip whatever was typed through the server — proves the RPC path.
  const send = el('<button class="btn btn-primary">Send to server (echo)</button>')
  send.onclick = async () => {
    if (!input.value.trim()) return toast('Type something first')
    send.disabled = true
    const res = await api('echo', { text: input.value.trim() })
    send.disabled = false
    if (!res || res.error) return toast('RPC failed: ' + ((res && res.error) || 'unknown'))
    logEvent('rpc echo', res.echo)
    toast(`Server (${res.playerName}) echoed: ${res.echo}`)
  }
  c.appendChild(send)

  // ── notification ──────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title" style="margin-top:2.46vh">Notification</div>'))
  const notify = el('<button class="btn btn-secondary">Show a notification</button>')
  notify.onclick = () => {
    // appTitle defaults to app.getName() when omitted.
    rp.showNotification({ title: 'Hello!', message: draft || 'Sent from the Custom App Demo.' })
    logEvent('showNotification')
  }
  c.appendChild(notify)

  const notifyServer = el('<button class="btn btn-secondary">Notification from the server</button>')
  notifyServer.onclick = async () => {
    // A custom app's own client CANNOT SendNUIMessage into RoadPhone's iframe.
    // Server → player pushes go through RoadPhone's own event instead.
    const res = await api('notify', { text: draft })
    if (!res || res.error) return toast('RPC failed')
    logEvent('rpc notify')
  }
  c.appendChild(notifyServer)

  // ── bottom sheet ──────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title" style="margin-top:2.46vh">Bottom sheet</div>'))
  const sheet = el('<button class="btn btn-secondary">Open action sheet</button>')
  sheet.onclick = async () => {
    const choice = await rp.showBottomSheet({
      groups: [
        { rows: [
          { key: 'edit', icon: 'solar:pen-2-linear', label: 'Edit' },
          { key: 'share', icon: 'solar:share-linear', label: 'Share' },
          { key: 'delete', icon: 'solar:trash-bin-trash-linear', label: 'Delete', variant: 'danger' },
        ] },
        { rows: [{ key: 'cancel', label: 'Cancel', strong: true }] },
      ],
    })
    logEvent('showBottomSheet', choice === null ? 'dismissed' : choice)
    toast(choice === null ? 'Dismissed' : `Picked: ${choice}`)
  }
  c.appendChild(sheet)
  c.appendChild(el('<div class="group-note" style="margin-top:1.36vh">Resolves with the row key, or null if dismissed. This is also your confirm() replacement — window.confirm crashes CEF.</div>'))

  // ── camera ────────────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title">Camera</div>'))
  if (lastShot) c.appendChild(el(`<img class="shot" src="${esc(lastShot)}">`))
  const cam = el('<button class="btn btn-secondary">Take a photo</button>')
  cam.onclick = () => {
    // Routing to the camera UNMOUNTS this iframe, so `await rp.takePhoto()` never
    // resolves in this realm — the app reboots from scratch. Persist what you'd
    // lose, fire without awaiting, and reclaim the shot on boot (see below).
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ tab: activeTab, ts: Date.now() }))
      localStorage.setItem(DRAFT_KEY, draft)
    } catch (e) { /* private mode — the photo still works, the draft is just lost */ }
    rp.takePhoto({ allowVideo: false })
  }
  c.appendChild(cam)
  c.appendChild(el('<div class="group-note" style="margin-top:1.36vh">takePhoto() reloads the iframe. Save your state first, then call claimPhoto() at boot to pick the shot back up.</div>'))
})

// Called once at boot: did we just come back from the camera?
function restorePendingPhoto() {
  let raw = null
  try {
    raw = localStorage.getItem(PENDING_KEY)
    // Consume both keys immediately — a leftover marker would otherwise resurrect
    // a stale view (and an old draft) on every future boot.
    localStorage.removeItem(PENDING_KEY)
    if (raw) draft = localStorage.getItem(DRAFT_KEY) || ''
    localStorage.removeItem(DRAFT_KEY)
  } catch (e) { /* no storage — the camera still works, the draft is just lost */ }
  if (!raw) return false

  let saved
  try { saved = JSON.parse(raw) } catch (e) { return false }
  if (!saved || !saved.ts || Date.now() - saved.ts > PENDING_TTL) return false

  const shot = rp && rp.claimPhoto ? rp.claimPhoto() : null
  if (shot && shot.url) {
    lastShot = shot.url
    logEvent('claimPhoto', shot.isVideo ? 'video' : 'photo')
  }
  show(saved.tab || 'ui')
  if (shot && shot.url) toast('Photo captured')
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
//  TAB 3 — Data: permission-gated reads (contacts, messages, bank, alarms)
// ═══════════════════════════════════════════════════════════════════════════
register('data', async (c) => {
  if (!rp) {
    c.appendChild(el('<div class="empty">API not available</div>'))
    return
  }
  c.appendChild(el('<div class="lg-title">Phone data</div>'))
  c.appendChild(el('<div class="subtitle">Each button triggers the permission sheet on first use.</div>'))

  // Contacts ────────────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title">Contacts · contacts.read</div>'))
  const setContacts = swapGroup(c, [{ label: 'Not loaded' }])
  const loadContacts = el('<button class="btn btn-secondary">Load contacts</button>')
  loadContacts.onclick = async () => {
    // The gated call REJECTS if the user denies — hence guard()/try-catch.
    const list = await guard(() => rp.contacts.list())
    if (!list) return
    setContacts(list.length
      ? list.slice(0, 8).map((x) => ({ label: `${x.firstname || ''} ${x.lastname || ''}`.trim() || '—', value: x.number }))
      : [{ label: 'No contacts' }])
    logEvent('contacts.list', list.length + ' entries')
  }
  c.appendChild(loadContacts)

  // Messages ────────────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title" style="margin-top:2.46vh">Messages · messages.read / .send</div>'))
  const setMsgs = swapGroup(c, [{ label: 'Not loaded' }])
  const loadMsgs = el('<button class="btn btn-secondary">Load messages</button>')
  loadMsgs.onclick = async () => {
    const list = await guard(() => rp.messages.list())
    if (!list) return
    setMsgs(list.length
      ? list.slice(0, 6).map((m) => ({ label: String(m.message || '').slice(0, 40) || '—', sub: `${m.transmitter} → ${m.receiver}` }))
      : [{ label: 'No messages' }])
    logEvent('messages.list', list.length + ' entries')
  }
  c.appendChild(loadMsgs)

  const sendSelf = el('<button class="btn btn-secondary">Text myself</button>')
  sendSelf.onclick = async () => {
    const me = rp.getPhoneNumber()
    const ok = await guard(async () => {
      await rp.messages.send(me, 'Hello from the Custom App Demo!')
      return true
    })
    if (ok) {
      toast('Message sent')
      logEvent('messages.send', me)
    }
  }
  c.appendChild(sendSelf)

  // Bank ────────────────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title" style="margin-top:2.46vh">Bank · bank.read</div>'))
  const setBank = swapGroup(c, [{ label: 'Not loaded' }])
  const loadBank = el('<button class="btn btn-secondary">Load balance & IBAN</button>')
  loadBank.onclick = async () => {
    // All three bank reads share the single bank.read scope, so this prompts once.
    const data = await guard(async () => ({
      balance: await rp.bank.getBalance(),
      iban: await rp.bank.getIban(),
    }))
    if (!data) return
    setBank([
      { label: 'Balance', value: '$' + Number(data.balance || 0).toLocaleString('en-US') },
      { label: 'IBAN', value: data.iban || '—', mono: true },
    ])
    logEvent('bank.getBalance', data.balance)
  }
  c.appendChild(loadBank)

  // Alarms ──────────────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title" style="margin-top:2.46vh">Alarms · alarms.read / .write</div>'))
  const setAlarms = swapGroup(c, [{ label: 'Not loaded' }])

  const reloadAlarms = async () => {
    const list = await guard(() => rp.alarms.list())
    if (!list) return null
    setAlarms(list.length
      ? list.slice(0, 6).map((a) => ({ label: a.time || '—', sub: a.label || '', value: a.enabled ? 'on' : 'off' }))
      : [{ label: 'No alarms' }])
    return list
  }

  const loadAlarms = el('<button class="btn btn-secondary">Load alarms</button>')
  loadAlarms.onclick = async () => {
    const list = await reloadAlarms()
    if (list) logEvent('alarms.list', list.length + ' entries')
  }
  c.appendChild(loadAlarms)

  const addAlarm = el('<button class="btn btn-secondary">Create 07:30 alarm</button>')
  addAlarm.onclick = async () => {
    // Alarms your app creates get an id prefixed with `customapp-<namespace>-`,
    // so you can find (and clean up) your own later.
    const id = await guard(() => rp.alarms.create({ time: '07:30', label: 'Demo alarm', enabled: 1 }))
    if (!id) return
    toast('Alarm created')
    logEvent('alarms.create', id)
    await reloadAlarms()
  }
  c.appendChild(addAlarm)

  const clearAlarms = el('<button class="btn btn-danger">Delete this app\'s alarms</button>')
  clearAlarms.onclick = async () => {
    const list = await guard(() => rp.alarms.list())
    if (!list) return
    const mine = list.filter((a) => String(a.id || '').startsWith(`customapp-${rp.app.getNamespace()}-`))
    if (!mine.length) return toast('Nothing to delete')
    for (const a of mine) await guard(() => rp.alarms.delete(a.id))
    toast(`Deleted ${mine.length}`)
    logEvent('alarms.delete', mine.length + ' removed')
    await reloadAlarms()
  }
  c.appendChild(clearAlarms)
})

// ═══════════════════════════════════════════════════════════════════════════
//  TAB 4 — Storage & permissions
// ═══════════════════════════════════════════════════════════════════════════
const SCOPES = ['contacts.read', 'messages.read', 'messages.send', 'bank.read', 'alarms.read', 'alarms.write', 'storage.metadata']

register('store', async (c) => {
  if (!rp) {
    c.appendChild(el('<div class="empty">API not available</div>'))
    return
  }
  c.appendChild(el('<div class="lg-title">Storage</div>'))

  // ── localStorage-backed (sync, survives reloads, NOT phone trades) ────────
  c.appendChild(el('<div class="group-title">storage.* · local, sync</div>'))
  const keys = rp.storage.keys()
  c.appendChild(groupOf(keys.length
    ? keys.map((k) => ({ label: k, value: JSON.stringify(rp.storage.get(k)), mono: true }))
    : [{ label: 'Empty' }]))

  const write = el('<button class="btn btn-secondary">Write a value</button>')
  write.onclick = () => {
    rp.storage.set('lastOpen', new Date().toISOString())
    rp.storage.set('openCount', (rp.storage.get('openCount') || 0) + 1)
    logEvent('storage.set', 'lastOpen, openCount')
    refresh()
  }
  c.appendChild(write)

  const wipe = el('<button class="btn btn-danger">Clear this app\'s keys</button>')
  wipe.onclick = () => {
    rp.storage.clear()   // only OUR namespace — other apps are untouched
    logEvent('storage.clear')
    refresh()
  }
  c.appendChild(wipe)

  // ── metadata-backed (async, follows the physical phone item) ──────────────
  c.appendChild(el('<div class="group-title" style="margin-top:2.46vh">storage.metadata.* · on the phone item</div>'))
  const setMeta = swapGroup(c, [{ label: 'Not loaded' }])

  const readMeta = el('<button class="btn btn-secondary">Read from phone item</button>')
  readMeta.onclick = async () => {
    // Async — it round-trips through Lua to the item's metadata.
    const value = await guard(() => rp.storage.metadata.get('demoNote'))
    setMeta([{ label: 'demoNote', value: value == null ? '—' : String(value), mono: true }])
    logEvent('storage.metadata.get', value)
  }
  c.appendChild(readMeta)

  const writeMeta = el('<button class="btn btn-secondary">Write to phone item</button>')
  writeMeta.onclick = async () => {
    const value = draft || 'written by the demo'
    const ok = await guard(async () => { await rp.storage.metadata.set('demoNote', value); return true })
    if (!ok) return
    toast('Saved to the phone item')
    logEvent('storage.metadata.set', value)
  }
  c.appendChild(writeMeta)
  c.appendChild(el('<div class="group-note" style="margin-top:1.36vh">This value rides along with the phone item — trade the phone away and it goes with it. Use it for data the user expects to follow their phone; use storage.* for UI state.</div>'))

  // ── permissions ───────────────────────────────────────────────────────────
  c.appendChild(el('<div class="group-title">Permissions</div>'))
  const decisions = rp.permissions.list()
  c.appendChild(groupOf(SCOPES.map((scope) => {
    const state = decisions[scope] || 'not asked'
    return {
      label: scope,
      badge: { kind: state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'ask', text: state.toUpperCase() },
      onClick: async () => {
        // Tap a GRANTED/DENIED scope to forget the decision, an unasked one to ask.
        if (decisions[scope]) {
          rp.permissions.revoke(scope)
          logEvent('permissions.revoke', scope)
        } else {
          const ok = await rp.permissions.request(scope)
          logEvent('permissions.request', `${scope} → ${ok ? 'granted' : 'denied'}`)
        }
        refresh()
      },
    }
  })))
  c.appendChild(el('<div class="group-note">Tap a scope to request it, or to revoke a decision so the sheet asks again. Answers are remembered per namespace, so they survive a phone reload.</div>'))
})

// ═══════════════════════════════════════════════════════════════════════════
//  TAB 5 — Events
// ═══════════════════════════════════════════════════════════════════════════
register('log', async (c) => {
  c.appendChild(el('<div class="lg-title">Events</div>'))
  c.appendChild(el('<div class="subtitle">Every event the API fires, as it happens.</div>'))

  if (!events.length) {
    c.appendChild(el('<div class="empty">Nothing yet. Toggle dark mode, change the brightness, or get a call.</div>'))
    return
  }

  const log = el('<div class="log"></div>')
  events.forEach((e) => {
    log.appendChild(el(`<div class="log-item">
      <span class="log-time">${esc(e.time)}</span><span class="log-name">${esc(e.name)}</span>${e.detail !== '' ? ' · ' + esc(e.detail) : ''}
    </div>`))
  })
  c.appendChild(log)

  const clear = el('<button class="btn btn-secondary">Clear log</button>')
  clear.onclick = () => { events.length = 0; refresh() }
  c.appendChild(clear)
})

// ── Boot ────────────────────────────────────────────────────────────────────
// If we're back from the camera, restore where the user was; otherwise start on
// the first tab.
if (!restorePendingPhoto()) show('phone')
