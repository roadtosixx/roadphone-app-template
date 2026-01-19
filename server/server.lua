--[[
    RoadPhone Custom App Demo - Server Side

    This file demonstrates how to handle server-side events from your custom app.
    Communication flow:
    1. Custom App calls: window.parent.roadphone.post('eventName', data)
    2. RoadPhone forwards this to Lua as a NUI callback
    3. Client can trigger server events if needed
]]

-- Example: Server event that can be triggered from client
RegisterNetEvent('customAppDemo:serverAction', function(data)
    local src = source
    local identifier = GetPlayerIdentifiers(src)[1]

    print('[CustomAppDemo] Server action from player ' .. src)
    print('[CustomAppDemo] Identifier: ' .. (identifier or 'unknown'))
    print('[CustomAppDemo] Data: ' .. json.encode(data))

    -- Example: Do something on the server (database, etc.)
    -- MySQL.Async.execute('INSERT INTO ...', {...})

    -- Send response back to client
    TriggerClientEvent('customAppDemo:serverResponse', src, {
        success = true,
        message = 'Server received your action!',
        timestamp = os.time()
    })
end)

-- Example: Get data for custom app
RegisterNetEvent('customAppDemo:getData', function()
    local src = source

    -- Example: Fetch data from database
    -- local data = MySQL.Sync.fetchAll('SELECT * FROM ...', {})

    -- For demo, just send mock data
    TriggerClientEvent('customAppDemo:receiveData', src, {
        items = {
            { id = 1, name = 'Item 1' },
            { id = 2, name = 'Item 2' },
            { id = 3, name = 'Item 3' }
        }
    })
end)

print('[CustomAppDemo] Server script loaded')
