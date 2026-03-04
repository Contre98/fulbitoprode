import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

const requiredPackages = [
  "jest",
  "jest-expo",
  "@testing-library/react-native",
  "@testing-library/jest-native"
];

const missing = requiredPackages.filter((pkg) => {
  try {
    require.resolve(pkg);
    return false;
  } catch {
    return true;
  }
});

if (missing.length > 0) {
  console.log("[mobile-test-harness] Scaffold is ready, but dependencies are missing:");
  missing.forEach((pkg) => console.log(`- ${pkg}`));
  console.log("[mobile-test-harness] Install these packages to activate mobile tests.");
  process.exit(0);
}

const extraArgs = process.argv.slice(2);
const result = spawnSync("pnpm", ["exec", "jest", "--config", "jest.config.cjs", "--runInBand", "--detectOpenHandles", ...extraArgs], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
