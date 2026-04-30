# Screenshot Organizer

A small **macOS** tool that watches **`~/Desktop/Screenshots`**, detects new screenshots, figures out which app was in front (via **AppleScript** / **System Events**), and **moves** each file into a subfolder named after that app. If anything goes wrong, files go to **`~/Desktop/Screenshots/Others`**.

It is meant to run **in the background** via a **LaunchAgent** (`launchd`), not from an open terminal session.

---

## Requirements

- **macOS** (uses `osascript` and System Events)
- **Node.js** 20.19 or newer ([chokidar](https://github.com/paulmillr/chokidar) v5 needs it)

You need the path to the `node` binary for the LaunchAgent (see Step 2). Check your version and path:

```bash
node -v
which node
```

---

## Install (one-time)

### 1. Clone the repo

Replace `YOUR_USERNAME` with your GitHub username (or use the clone URL from GitHub).

```bash
git clone https://github.com/YOUR_USERNAME/screenshot-organizer.git
cd screenshot-organizer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the screenshots folder

```bash
mkdir -p ~/Desktop/Screenshots
```

The script also creates this folder when it runs; this step keeps macOS and the watcher aligned from the start.

### 4. Tell macOS to save screenshots there

```bash
defaults write com.apple.screencapture location ~/Desktop/Screenshots
killall SystemUIServer
```

You can confirm or change this later in **System Settings → Keyboard → Screenshots** (wording may vary by macOS version).

---

## Run as a background service (LaunchAgent)

### Step 1 — Create the LaunchAgent file

```bash
mkdir -p ~/Library/LaunchAgents
nano ~/Library/LaunchAgents/com.screenshot.bot.plist
```

(You can use any editor; `nano` is just a simple choice.)

### Step 2 — Paste this XML

Replace **`/FULL/PATH/TO/YOUR/index.js`** with the **absolute path** to this repo’s `index.js` (for example `/Users/you/projects/screenshot-organizer/index.js`).

Replace **`/usr/local/bin/node`** with the path from **`which node`** (Homebrew on Apple Silicon often uses **`/opt/homebrew/bin/node`**).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.screenshot.bot</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/FULL/PATH/TO/YOUR/index.js</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Save and exit (`nano`: **Ctrl+O**, Enter, then **Ctrl+X**).

### Step 3 — Load the background service

```bash
launchctl load ~/Library/LaunchAgents/com.screenshot.bot.plist
```

If `load` is not accepted on your macOS version, try:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.screenshot.bot.plist
```

### Step 4 — Verify

- Optionally **restart your Mac** (with `RunAtLoad`, the job also starts at login after a successful load).
- **Take a screenshot** (for example **⌘⇧3** or **⌘⇧4**).

**You should get:**

- The organizer **running in the background** (no terminal window required).
- New captures under **`~/Desktop/Screenshots`** sorted into **app folders** (names derived from the frontmost app, spaces removed), or **`Others`** if something fails.

**Permissions:** **`node`** may need **Automation** or **Accessibility** for **System Events** under **System Settings → Privacy & Security**. If that is denied, files will often end up in **Others**.

**To stop and unload the agent:**

```bash
launchctl unload ~/Library/LaunchAgents/com.screenshot.bot.plist
```

(Or `launchctl bootout gui/$(id -u) com.screenshot.bot` if you used `bootstrap`.)

---

## How it works

- Uses **[chokidar](https://github.com/paulmillr/chokidar)** to watch **`~/Desktop/Screenshots`** (top-level files only; not nested folders).
- After a **1 second** delay (so the file can finish writing), it runs **macOS `osascript`** to ask **System Events** for the **frontmost application** name.
- **Cleans** that name for a folder (invalid path characters removed, **spaces removed**, length capped). Creates **`~/Desktop/Screenshots/<CleanAppName>/`** and **moves** the screenshot there, keeping the original base name when possible.
- **Skips** files in the watch folder whose names already look like **`YYYY-MM-DD_HH-MM`** timestamps (so they are not processed again).
- On **failure** (empty name, script error, rename error, etc.), moves the file to **`~/Desktop/Screenshots/Others`**.

---

## Project layout

| File / folder   | Role                                      |
|----------------|-------------------------------------------|
| `index.js`     | Entry point: watcher + move logic         |
| `package.json` | Dependencies (`chokidar`) and metadata    |
| `.gitignore`   | Ignores `node_modules`, `.DS_Store`, `.env` |

---

## License

See `package.json` (ISC unless you change it).
