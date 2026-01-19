# RoadPhone Custom App Demo

A demo/template custom app for RoadPhone-Pro that demonstrates how to use the `window.roadphone` API.

## Features

- 🎨 **Dark Mode Support** - Automatically adapts to phone theme
- 📱 **Player Information** - Displays name, phone number, job, identifier
- ⚙️ **Settings Display** - Shows brightness, flight mode status
- 🔔 **Notifications** - Test button to send notifications
- 📡 **Lua Integration** - Example of posting data to backend
- 📋 **Event Log** - Real-time display of API events

## Installation

### 1. Copy the Resource

Copy the `roadphone-customapp-demo` folder to your FiveM server's `resources` directory:

```
resources/
└── roadphone-customapp-demo/
    ├── fxmanifest.lua
    ├── html/
    │   └── index.html
    ├── client/
    │   └── client.lua
    └── server/
        └── server.lua
```

### 2. Add to server.cfg

Add the following line to your `server.cfg`:

```cfg
ensure roadphone-customapp-demo
```

### 3. Configure RoadPhone

Open your RoadPhone config file at `public/static/config/config.json` and set the CustomApp URL:

```json
{
  "AppStore": {
    "CustomApp": {
      "url": "nui://roadphone-customapp-demo/html/index.html",
      "darkmode": true
    }
  }
}
```

### 4. Restart Server

Restart your FiveM server or use `refresh` and `ensure roadphone-customapp-demo`.

### 5. Open the App

In-game, open the phone and tap on the Custom App icon.

## API Usage

The app demonstrates all available `window.roadphone` API methods:

```javascript
// Access API from iframe
const roadphone = window.parent.roadphone

// Getter functions
roadphone.isDarkMode()      // boolean
roadphone.getPlayerName()   // string
roadphone.getPhoneNumber()  // string
roadphone.getJob()          // string
roadphone.getIdentifier()   // string
roadphone.getBrightness()   // number (10-100)
roadphone.isFlightMode()    // boolean

// Actions
roadphone.showNotification({ appTitle, title, message, icon })
roadphone.post('eventName', { data })
roadphone.copyToClipboard('text')

// Events
roadphone.on('darkModeChanged', (isDark) => { })
roadphone.on('brightnessChanged', (value) => { })
roadphone.on('flightModeChanged', (isEnabled) => { })
roadphone.on('phoneOpened', () => { })
roadphone.on('phoneClosed', () => { })
```

## Important Notes

⚠️ **Do NOT use `ui_page` in fxmanifest.lua!**

The custom app runs inside RoadPhone's iframe. Using `ui_page` will cause the app to render fullscreen instead of in the phone.

```lua
-- ❌ WRONG - Don't do this!
ui_page 'html/index.html'

-- ✅ CORRECT - Only use files
files {
    'html/index.html'
}
```

## Customization

Feel free to modify `html/index.html` to build your own custom app. Use this demo as a starting point.

### Styling Tips

- Use `px` units instead of `vh` (iframe has its own viewport)
- Add `padding-top: 45px` for the phone status bar
- Hide scrollbar with CSS for a cleaner look
- Support both light and dark themes

## Documentation

For full API documentation, visit: [docs.roadshop.org](https://docs.roadshop.org)

## License

MIT License - Feel free to use this as a template for your own custom apps.
