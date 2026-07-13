-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Custom App Demo – minimal framework bridge (SERVER)                      ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Registers server callbacks and looks up a player, on whichever framework ║
-- ║  config.lua names. Handlers always look the same:                         ║
-- ║      function(source, cb, ...)  →  reply with cb(result)                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

Bridge = Bridge or {}
Bridge.Framework = (Config and Config.Framework or 'esx'):lower()

local ESX, QBCore
if Bridge.Framework == 'esx' then
    ESX = exports['es_extended']:getSharedObject()
elseif Bridge.Framework == 'qbcore' then
    QBCore = exports['qb-core']:GetCoreObject()
elseif Bridge.Framework == 'qbox' then
    -- qbox uses qbx_core exports + ox_lib (lib.callback).
elseif Bridge.Framework ~= 'standalone' then
    print(('[customapp-demo] unknown Config.Framework "%s" — falling back to standalone'):format(tostring(Bridge.Framework)))
    Bridge.Framework = 'standalone'
end

-- Standalone: mirror of the client's net-event request/response pair.
local standaloneCallbacks = {}

RegisterNetEvent('roadphone-customapp-demo:callbackRequest', function(id, name, ...)
    local src = source
    local handler = standaloneCallbacks[name]
    if not handler then
        TriggerClientEvent('roadphone-customapp-demo:callbackResponse', src, id, { error = 'unknown_callback' })
        return
    end
    handler(src, function(result)
        TriggerClientEvent('roadphone-customapp-demo:callbackResponse', src, id, result)
    end, ...)
end)

function Bridge.RegisterCallback(name, callback)
    if Bridge.Framework == 'esx' then
        ESX.RegisterServerCallback(name, callback)
    elseif Bridge.Framework == 'qbcore' then
        QBCore.Functions.CreateCallback(name, callback)
    elseif Bridge.Framework == 'qbox' then
        -- ox_lib callbacks return a value; wrap so cb-style handlers keep working.
        lib.callback.register(name, function(source, ...)
            local p = promise.new()
            callback(source, function(...) p:resolve(table.pack(...)) end, ...)
            local result = Citizen.Await(p)
            return table.unpack(result, 1, result.n)
        end)
    else
        standaloneCallbacks[name] = callback
    end
end

-- → { name, identifier, job } or nil
function Bridge.GetPlayer(src)
    if Bridge.Framework == 'esx' then
        local xp = ESX.GetPlayerFromId(src)
        if not xp then return nil end
        return {
            name = (xp.getName and xp.getName()) or ('ID ' .. src),
            identifier = xp.identifier,
            job = xp.job and xp.job.name or 'unemployed',
        }
    elseif Bridge.Framework == 'qbcore' or Bridge.Framework == 'qbox' then
        local p = Bridge.Framework == 'qbox' and exports.qbx_core:GetPlayer(src) or QBCore.Functions.GetPlayer(src)
        if not p then return nil end
        local ci = p.PlayerData.charinfo or {}
        local name = ((ci.firstname or '') .. ' ' .. (ci.lastname or '')):match('^%s*(.-)%s*$')
        return {
            name = name ~= '' and name or ('ID ' .. src),
            identifier = p.PlayerData.citizenid,
            job = p.PlayerData.job and p.PlayerData.job.name or 'unemployed',
        }
    end
    return {
        name = GetPlayerName(src) or ('ID ' .. src),
        identifier = GetPlayerIdentifierByType(src, 'license') or ('src:' .. src),
        job = 'unemployed',
    }
end
