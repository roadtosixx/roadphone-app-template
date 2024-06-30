# RoadPhone-App-Template

This is RoadShop´s RoadPhone-Pro App Template for Developers

## Installation

Download the sourcecode

Install the resource on your server
 
Go to roadphone/public/static/config/config.json, scroll down to AppStore and add this code

```json

{
    "name": "Template App",
    "icon": "/public/img/Apps/custom.jpg",
    "default": true,
    "category": "apps",
    "custom_app_id": "TEMPLATE_APP_1",
    "redirect": "custom_app",
    "url": "https://cfx-nui-roadphone-app-template/html/static/index.html",
    "darkmode": true,
    "allowJobs": [],
    "disallowJobs": [],
    "custom_event":
    {
        "active": false,
        "closeWhenOpenApp": false
    }
}

```

## License

[GPL](https://choosealicense.com/licenses/gpl-3.0/)