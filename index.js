'use strict';

const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const WATCH_DIR = path.join(os.homedir(), 'Desktop', 'Screenshots');
const OTHERS_DIR = path.join(WATCH_DIR, 'Others');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.bmp', '.tif', '.tiff']);

function isImage(filePath) {
  return IMAGE_EXT.has(path.extname(filePath).toLowerCase());
}

function alreadyOrganized(filename) {
  return /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}(\_\d+)?\.[a-z0-9]+$/i.test(filename);
}

async function nextAvailablePath(dir, base, ext) {
  let candidate = path.join(dir, `${base}${ext}`);
  let n = 1;
  for (;;) {
    try {
      await fs.access(candidate);
      candidate = path.join(dir, `${base}_${n}${ext}`);
      n += 1;
    } catch {
      return candidate;
    }
  }
}

async function getFrontmostAppName() {
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await execFileAsync(
      'osascript',
      [
        '-e',
        'tell application "System Events" to return name of first application process whose frontmost is true',
      ],
      { timeout: 5000 },
    );
    const name = stdout.trim();
    return name || null;
  } catch {
    return null;
  }
}

/** Safe folder name: strip invalid chars, remove all spaces, trim length. */
function cleanAppFolderName(name) {
  if (!name || typeof name !== 'string') return '';
  let s = name.replace(/[/\\:\u0000-\u001f]/g, '');
  s = s.replace(/\s+/g, '');
  s = s.replace(/\.+$/, '');
  if (s.length > 200) s = s.slice(0, 200);
  return s;
}

async function moveIntoDir(filePath, destDir, label) {
  await fs.mkdir(destDir, { recursive: true });
  const ext = path.extname(filePath).toLowerCase() || '.png';
  const stem = path.basename(filePath, path.extname(filePath));
  const dest = await nextAvailablePath(destDir, stem, ext);
  await fs.rename(filePath, dest);
  console.log(`Old: ${path.basename(filePath)}  Folder: ${label}  New: ${path.basename(dest)}`);
}

async function handleNewImage(filePath) {
  await new Promise((r) => setTimeout(r, 1000));

  try {
    const raw = await getFrontmostAppName();
    const folder = cleanAppFolderName(raw);
    if (!folder) {
      throw new Error('empty app name after cleaning');
    }
    const destDir = path.join(WATCH_DIR, folder);
    await moveIntoDir(filePath, destDir, folder);
  } catch (err) {
    if (err.code === 'ENOENT') return;
    console.error(err.message || err);
    try {
      await moveIntoDir(filePath, OTHERS_DIR, 'Others');
    } catch (fallbackErr) {
      console.error('Move to Others failed:', fallbackErr);
    }
  }
}

async function main() {
  const { watch } = await import('chokidar');

  await fs.mkdir(WATCH_DIR, { recursive: true });

  watch(WATCH_DIR, { ignoreInitial: true, depth: 0 })
    .on('add', (filePath) => {
      if (!isImage(filePath)) return;
      if (alreadyOrganized(path.basename(filePath))) return;
      handleNewImage(filePath).catch((err) => console.error(err));
    })
    .on('error', (err) => console.error(err));

  console.log(`Watching ${WATCH_DIR}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
