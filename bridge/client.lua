-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Custom App Demo – minimal framework bridge (CLIENT)                      ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  One job: trigger a server callback on the framework picked in config.lua.║
-- ║  Deliberately independent of RoadPhone's own bridge, so a custom app can  ║
-- ║  be shipped on its own.                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

Bridge = Bridge or {}
Bridge.Framework = (Config and Config.Framework or 'esx'):lower()

local ESX, QBCore
if Bridge.Framework == 'esx' then
    ESX = exports['es_extended']:getSharedObject()
elseif Bridge.Framework == 'qbcore' then
    QBCore = exports['qb-core']:GetCoreObject()
elseif Bridge.Framework == 'qbox' then
    -- qbox uses ox_lib (lib.callback) — add '@ox_lib/init.lua' to shared_scripts.
elseif Bridge.Framework ~= 'standalone' then
    print(('[customapp-demo] unknown Config.Framework "%s" — falling back to standalone'):format(tostring(Bridge.Framework)))
    Bridge.Framework = 'standalone'
end

-- Standalone has no framework callbacks, so we roll a tiny request/response pair
-- over net events, keyed by a request id.
local pending, nextId = {}, 0

RegisterNetEvent('roadphone-customapp-demo:callbackResponse', function(id, result)
    local cb = pending[id]
    if not cb then return end
    pending[id] = nil
    cb(result)
end)

function Bridge.TriggerCallback(name, callback, ...)
    if Bridge.Framework == 'esx' then
        ESX.TriggerServerCallback(name, callback, ...)
    elseif Bridge.Framework == 'qbcore' then
        QBCore.Functions.TriggerCallback(name, callback, ...)
    elseif Bridge.Framework == 'qbox' then
        lib.callback(name, false, callback, ...)
    else
        nextId = nextId + 1
        pending[nextId] = callback
        TriggerServerEvent('roadphone-customapp-demo:callbackRequest', nextId, name, ...)
    end
end
