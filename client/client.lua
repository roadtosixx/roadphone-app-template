--[[
    RoadPhone Custom App Demo - Client Side

    This file demonstrates how to handle NUI callbacks from your custom app.
    The custom app itself runs inside RoadPhone's iframe, so most communication
    happens through window.parent.roadphone.post() in the HTML/JS code.
]]

-- Example: Register a NUI callback that the custom app can call via roadphone.post()
RegisterNUICallback('customAppDemo', function(data, cb)
    -- data contains whatever was sent from the custom app
    print('[CustomAppDemo] Received from UI:', json.encode(data))

    -- Example: Get player ped and position
    local playerPed = PlayerPedId()
    local coords = GetEntityCoords(playerPed)

    -- Send response back to the UI
    cb({
        success = true,
        message = 'Hello from Lua!',
        playerCoords = {
            x = coords.x,
            y = coords.y,
            z = coords.z
        }
    })
end)

-- Example: Server event handler
RegisterNetEvent('customAppDemo:serverResponse', function(data)
    print('[CustomAppDemo] Server response:', json.encode(data))

    -- You could send this to the NUI if needed
    -- SendNUIMessage({ type = 'serverResponse', data = data })
end)

-- Example: Test command (optional, for debugging)
RegisterCommand('customappdemo', function()
    print('[CustomAppDemo] Test command executed')
    print('[CustomAppDemo] To use this app, configure it in RoadPhone config.json:')
    print('  "CustomApp": { "url": "nui://roadphone-customapp-demo/html/index.html", "darkmode": true }')
end, false)

print('[CustomAppDemo] Client script loaded')
