fx_version 'cerulean'
game 'gta5'

name 'roadphone-customapp-demo'
author 'RoadPhone'
description 'Demo/Template Custom App for RoadPhone-Pro - Shows how to use the window.roadphone API'
version '1.0.0'

-- IMPORTANT: Do NOT use ui_page here!
-- The HTML is loaded inside RoadPhone's iframe, not as a standalone NUI.
-- We only need to make the file accessible via nui:// protocol.

-- Files accessible by NUI (for RoadPhone iframe)
files {
    'html/index.html'
}

-- Client Scripts (optional - for NUI callbacks)
client_scripts {
    'client/client.lua'
}

-- Server Scripts (optional - for server-side logic)
server_scripts {
    'server/server.lua'
}
