const raw = process.versions?.node ?? "";
const [majorToken] = raw.split(".");
const major = Number.parseInt(majorToken ?? "", 10);

if (!Number.isFinite(major)) {
  console.error("[mobile] Unable to detect Node.js version.");
  process.exit(1);
}

if (major < 20 || major > 22) {
  console.error(
    `[mobile] Unsupported Node.js ${raw}. Expo SDK 52 is currently validated on Node 20-22 for this workspace.`
  );
  console.error(
    "[mobile] Switch to Node 22 LTS (or 20 LTS) and retry mobile commands."
  );
  process.exit(1);
}
