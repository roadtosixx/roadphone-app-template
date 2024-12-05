RegisterNUICallback('inputfocus', function(data, cb)
    exports['roadphone']:inputFocus(data.focus) --data.focus = true or false
    cb('ok')
end)

RegisterNUICallback('sendNotification', function(data, cb)

    local notifyData = {
        apptitle = "Settings",
        title = "No message",
        message = data.message,
        img = "/public/img/Apps/settingsapp.png"
    }
    
    exports["roadphone"]:sendNotification(notifyData)
    cb('ok')
end)

RegisterCommand('testNUIMessage', function()

    exports['roadphone']:SendMessageNUI({
        customevent = "test"
    })
    
end, false)


