#!/usr/bin/env node
/**
 * Run the storefront against the mock WordPress, with no configuration:
 * starts `mock-server` and `next dev`, and stops both together.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

const env = {
  ...process.env,
  NEXT_PUBLIC_WP_URL: "http://127.0.0.1:8787",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY: "",
};

const processes = [
  spawn(process.execPath, ["mock-server/index.mjs"], { cwd: root, env, stdio: "inherit" }),
  spawn(process.execPath, [nextBin, "dev"], { cwd: root, env, stdio: "inherit" }),
];

function stopAll(code = 0) {
  for (const child of processes) child.kill();
  process.exit(code);
}

for (const child of processes) child.on("exit", (code) => stopAll(code ?? 0));
process.on("SIGINT", () => stopAll());
process.on("SIGTERM", () => stopAll());
