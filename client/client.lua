--[[
    RoadPhone Custom App Demo — CLIENT

    The app's UI runs inside RoadPhone's iframe, so this file has exactly one job:
    relay the UI's RPCs to our own server callback and reply with the result.

    ── How the UI reaches Lua ────────────────────────────────────────────────
    Two transports land on the SAME server callback:

      a) fetch('https://<this-resource>/rpc')      → RegisterNUICallback('rpc') below
      b) roadphone.post('customAppRpc', {...})     → RoadPhone's client relay

    (a) is the direct route, but a custom app has no `ui_page`, so FiveM does not
    route it on every server. (b) always works because it goes through RoadPhone,
    which does have one. html/js/app.js tries (a) and falls back to (b) — you only
    need one, but shipping both never leaves a player with a dead app.

    ── What is NOT possible here ─────────────────────────────────────────────
    SendNUIMessage() from this resource has no document to deliver to (no ui_page)
    and CANNOT reach the app's iframe. To push something to the player from the
    server, use RoadPhone's own NUI:

        TriggerClientEvent('roadphone:sendNotification', src, { ... })

    ...and have the app refetch when a tab is opened. See server/server.lua.
]]

-- ── RPC relay ───────────────────────────────────────────────────────────────
-- NOTE: cb() MUST be called from inside the callback's result handler. Deferring
-- it to a separate net event does not reliably resolve the UI's pending fetch.
RegisterNUICallback('rpc', function(payload, cb)
    local name = payload and payload.name
    if not name then
        cb({ error = 'no_name' })
        return
    end

    Bridge.TriggerCallback('roadphone:customApp:' .. GetCurrentResourceName(), function(result)
        cb(result or {})
    end, name, (payload and payload.data) or {})
end)

-- ── Optional: pure client-side game effects belong here ─────────────────────
-- Anything that touches the game world (blips, markers, animations) has to run
-- on the client. The server can drive it with a plain net event.
RegisterNetEvent('roadphone-customapp-demo:ping', function(message)
    print('[customapp-demo] server says: ' .. tostring(message))
end)
