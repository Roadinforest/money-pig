import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

const server = createServer();
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Could not allocate smoke port");
}

const child = spawn(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "electron", "--no-sandbox", "."],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MONEY_PIG_SMOKE_PORT: String(address.port)
    },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

const result = await waitForSmoke(server);
stopProcess(child);
await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]).catch(
  () => undefined
);

if (result !== "ok") {
  console.error(output);
  throw new Error(`Electron smoke failed: ${result}`);
}

console.log("Electron smoke passed");

function waitForSmoke(server) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      server.close();
      resolve("timeout");
    }, 10_000);

    server.once("connection", (connection) => {
      connection.once("data", (chunk) => {
        clearTimeout(timer);
        const result = chunk.toString("utf8").trim();
        connection.end();
        server.close();
        resolve(result);
      });
    });
  });
}

function stopProcess(child) {
  if (process.platform === "win32") {
    child.kill("SIGTERM");
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}
