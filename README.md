# Screenshot Organizer

A small Node.js watcher that moves new screenshots from **`~/Desktop/Screenshots`** into subfolders named after the frontmost macOS app.

## Requirements

- **Node.js** 20.19 or newer (required by [chokidar](https://github.com/paulmillr/chokidar) v5)
- **macOS** (uses `osascript` / System Events for the active app)

## Setup

```bash
npm install
```

## Run

```bash
node index.js
```

Leave it running while you work. It creates **`~/Desktop/Screenshots`** if it does not exist and watches **only the top level** of that folder (not nested directories).

## Behavior

1. When a new **image** file appears (`.png`, `.jpg`, `.jpeg`, and other common extensions), the script waits **1 second** so the file can finish saving.
2. It asks System Events for the **frontmost application** name.
3. That name is cleaned for use as a folder name (invalid path characters removed, **spaces removed**, length capped).
4. The file is moved into **`~/Desktop/Screenshots/<AppName>/`**, keeping the same base filename; if a file with that name already exists, a numeric suffix is added (`_1`, `_2`, …).
5. If anything in that flow fails (for example, empty app name, `osascript` error, or rename error), the file is moved to **`~/Desktop/Screenshots/Others/`** instead.

Files whose names already look like `YYYY-MM-DD_HH-MM` timestamps in the watch folder are ignored so they are not processed again.

## macOS permissions

The terminal (or app) running Node may need permission under **System Settings → Privacy & Security → Automation** (or **Accessibility**) to control **System Events**. If permission is denied, lookups fail and files go to **Others**.

## Screenshot save location

Point **macOS Screenshot** output to **`~/Desktop/Screenshots`** (or save to Desktop and use that folder) so new captures land where this script is watching.
