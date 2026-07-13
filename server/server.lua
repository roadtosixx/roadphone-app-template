--[[
    RoadPhone Custom App Demo — SERVER

    Every RPC the UI sends arrives here, in ONE server callback named
    'roadphone:customApp:<resource>'. Add a function to `Handlers` and the UI can
    call it as api('name', { ... }).

    The handler contract:  function(src, player, data, reply)  →  reply(result)
    Whatever you pass to reply() resolves the UI's `await api(...)`.

    NEVER trust `data` — it comes from the UI. Validate it here, the same way you
    would validate any client input.
]]

local Handlers = {}

-- Echo the text back with who sent it. The demo's UI uses this to prove the
-- round-trip works (and that inputFocus actually let the player type).
Handlers['echo'] = function(src, player, data, reply)
    local text = type(data.text) == 'string' and data.text or ''
    if text == '' then
        reply({ error = 'empty' })
        return
    end

    -- Cap it: a UI can send you a megabyte if you let it.
    if #text > 200 then text = text:sub(1, 200) end

    reply({
        ok = true,
        echo = text,
        playerName = player.name,
        serverTime = os.time(),
    })
end

-- Push a notification from the SERVER to the player's phone.
-- This resource cannot SendNUIMessage into RoadPhone's iframe, so notifications
-- go through RoadPhone's own client event.
Handlers['notify'] = function(src, player, data, reply)
    local text = type(data.text) == 'string' and data.text or ''
    if #text > 120 then text = text:sub(1, 120) end

    TriggerClientEvent('roadphone:sendNotification', src, {
        apptitle = 'Custom App Demo',
        title = 'Sent from the server',
        message = text ~= '' and text or ('Hello ' .. player.name .. '!'),
        img = '/public/img/Apps/light_mode/custom.webp',
    })

    reply({ ok = true })
end

-- Who am I, server-side? Note this is the AUTHORITATIVE identity: the UI's
-- getIdentifier() is fine for display, but anything that matters must be
-- resolved from `source` here.
Handlers['whoami'] = function(src, player, data, reply)
    reply({
        ok = true,
        name = player.name,
        identifier = player.identifier,
        job = player.job,
    })
end

-- ── RPC dispatcher ──────────────────────────────────────────────────────────
-- Handlers run in a thread so they may await (DB queries etc.); the framework
-- holds the UI's response open until reply() is called. `replied` guards against
-- a handler that replies and then errors — cb() must fire exactly once.
Bridge.RegisterCallback('roadphone:customApp:' .. GetCurrentResourceName(), function(src, cb, name, data)
    local player = Bridge.GetPlayer(src)
    if not player then
        cb({ error = 'no_player' })
        return
    end

    local handler = Handlers[name]
    if not handler then
        cb({ error = 'unknown_handler' })
        return
    end

    CreateThread(function()
        local replied = false
        local function reply(result)
            if replied then return end
            replied = true
            cb(result)
        end

        local ok, err = pcall(handler, src, player, data or {}, reply)
        if not ok then
            print(('[customapp-demo] handler "%s" errored: %s'):format(name, tostring(err)))
            reply({ error = 'server_error' })
        end
    end)
end)

print('[customapp-demo] server ready')
