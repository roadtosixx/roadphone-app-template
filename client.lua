RegisterNUICallback('inputfocus', function(data, cb)
    exports['roadphone']:inputFocus(data.focus) --data.focus = true or false
    cb('ok')
end)

RegisterNUICallback('sendNotification', function(data, cb)


    cb('ok')
end)


