const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
require(path.join(__dirname, "prepare-railway-demo.cjs"));

const mode = process.argv[2] === "start" ? "start" : "dev";
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const children = [];
const backend = spawn(process.execPath, [path.join(root, "madaraka-railways-demo", "src", "server.js")], {
  cwd: root,
  env: { ...process.env, PORT: "4300" },
  stdio: "inherit",
});
children.push(backend);

function stop() {
  for (const child of children) if (!child.killed) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

function monitor(child) {
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
    stop();
  });
}

monitor(backend);

async function startNextWhenApiIsReady() {
  for (let attempt = 0; attempt < 120 && !backend.killed; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:4300/console/api/rest/booking-info/maintenance");
      if (response.ok) {
        const next = spawn(process.execPath, [nextBin, mode], { cwd: root, stdio: "inherit", env: process.env });
        children.push(next);
        monitor(next);
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!backend.killed) {
    console.error("The passenger API did not start on port 4300.");
    process.exitCode = 1;
    stop();
  }
}

void startNextWhenApiIsReady();
