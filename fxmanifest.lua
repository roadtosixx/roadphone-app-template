fx_version 'cerulean'
game 'gta5'

name 'roadphone-customapp-demo'
author 'RoadPhone'
description 'Demo/Template Custom App for RoadPhone-Pro — a live tour of the window.roadphone API'
version '2.0.0'

-- IMPORTANT: never use ui_page here!
-- The HTML loads inside RoadPhone's iframe, not as a standalone NUI. With
-- ui_page the app renders fullscreen instead of inside the phone.
files {
    'html/index.html',
    'html/css/app.css',
    'html/js/app.js',
}

shared_scripts {
    'config.lua',
}

client_scripts {
    'bridge/client.lua',
    'client/client.lua',
}

server_scripts {
    'bridge/server.lua',
    'server/server.lua',
}

dependency 'roadphone'
