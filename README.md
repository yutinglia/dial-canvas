# My Speed Dial

A Firefox extension that replaces the new tab / home page with a customizable speed dial.

## Features

- Custom speed dial tiles for quick access to favorite sites
- Configurable layout and appearance
- Local storage for dials and settings

## Development

### Prerequisites

- [Firefox](https://www.mozilla.org/firefox/) (recent stable)
- A text editor or IDE

### Load the extension (temporary)

1. Open `about:debugging` in Firefox
2. Click **This Firefox**
3. Click **Load Temporary Add-on…**
4. Select the extension’s `manifest.json`

### Project layout

```
my_speed_dial_ext/
├── manifest.json      # WebExtension manifest
├── newtab/            # New tab / home page UI
├── background/        # Background scripts
├── icons/             # Extension icons
└── README.md
```

## License

TBD
