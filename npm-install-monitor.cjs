const { spawn } = require("node:child_process");
const readline = require("node:readline");
const os = require("node:os");

const args = process.argv.slice(2);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const start = Date.now();
const intervalMs = 500;
let lastBytes = 0;
let speed = 0;
let lastTick = Date.now();
let finished = false;

function fmtBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "calculating...";
  const s = Math.ceil(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h ${m}m ${sec}s` : m ? `${m}m ${sec}s` : `${sec}s`;
}

function clearDashboard() {
  if (process.stdout.isTTY) readline.clearLine(process.stdout, 0);
}

function draw() {
  if (finished) return;
  const now = Date.now();
  const deltaSeconds = Math.max((now - lastTick) / 1000, 0.001);
  const deltaBytes = Math.max(0, currentBytes - lastBytes);
  const instantSpeed = deltaBytes / deltaSeconds;
  speed = speed === 0 ? instantSpeed : speed * 0.65 + instantSpeed * 0.35;
  lastBytes = currentBytes;
  lastTick = now;

  const elapsed = (now - start) / 1000;
  const totalText = totalBytes > 0 ? fmtBytes(totalBytes) : "unknown";
  const pct = totalBytes > 0 ? Math.min(99, Math.floor((currentBytes / totalBytes) * 100)) : null;
  const barPct = pct === null ? Math.min(95, Math.floor(elapsed / 2)) : pct;
  const width = 24;
  const filled = Math.round((barPct / 100) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const eta = totalBytes > currentBytes && speed > 0
    ? fmtTime((totalBytes - currentBytes) / speed)
    : "calculating...";

  const lines = [
    "┌──────────────── NPM INSTALL MONITOR ────────────────┐",
    `│ Progress : ${bar} ${pct === null ? "unknown" : `${pct}%`}`.padEnd(56) + "│",
    `│ Traffic* : ${fmtBytes(currentBytes)} / ${totalText}`.padEnd(56) + "│",
    `│ Speed*   : ${fmtBytes(speed)}/s`.padEnd(56) + "│",
    `│ Elapsed  : ${fmtTime(elapsed)}`.padEnd(56) + "│",
    `│ ETA*     : ${eta}`.padEnd(56) + "│",
    "└─────────────────────────────────────────────────────┘",
    "* Network traffic is an estimate, not exact npm package bytes."
  ];

  if (process.stdout.isTTY) {
    readline.cursorTo(process.stdout, 0, 0);
    process.stdout.write(lines.join("\n") + "\n");
  } else if (now - start < 1000 || Math.floor(elapsed) % 5 === 0) {
    process.stdout.write(lines.join("\n") + "\n\n");
  }
}

let currentBytes = 0;
let totalBytes = 0;

console.log("Starting npm install monitor...");
console.log("Note: Windows network counters measure total machine traffic, so other apps may affect the estimate.");
console.log("This script runs npm install with verbose logs; Ctrl+C stops the install.");
console.log("");

const child = spawn(npmCommand, ["install", "--progress=true", "--verbose", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, npm_config_progress: "true" }
});

let monitor;
try {
  const { execFile } = require("node:child_process");
  const ps = `
$ErrorActionPreference = 'SilentlyContinue'
$stats = Get-NetAdapterStatistics | Where-Object { $_.ReceivedBytes -ge 0 }
$rx = ($stats | Measure-Object -Property ReceivedBytes -Sum).Sum
$tx = ($stats | Measure-Object -Property SentBytes -Sum).Sum
Write-Output "$rx,$tx"
`;
  let baseline = null;
  monitor = setInterval(() => {
    execFile("powershell.exe", ["-NoProfile", "-Command", ps], { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return;
      const parts = stdout.trim().split(",");
      if (parts.length !== 2) return;
      const rx = Number(parts[0]);
      const tx = Number(parts[1]);
      if (!Number.isFinite(rx) || !Number.isFinite(tx)) return;
      const combined = rx + tx;
      if (baseline === null) baseline = combined;
      currentBytes = Math.max(0, combined - baseline);
      draw();
    });
  }, intervalMs);
} catch {}

child.on("error", (err) => {
  finished = true;
  if (monitor) clearInterval(monitor);
  console.error("\nCould not start npm:", err.message);
  process.exitCode = 1;
});

child.on("close", (code) => {
  finished = true;
  if (monitor) clearInterval(monitor);
  console.log(`\n\nnpm install finished with exit code ${code}.`);
  console.log("Note: total npm download size and exact percentage are not exposed by npm; network traffic and ETA are estimates.");
  process.exitCode = code ?? 1;
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
  if (monitor) clearInterval(monitor);
});
