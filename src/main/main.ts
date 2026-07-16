import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { connect } from "node:net";
import { LedgerRepository } from "./database.js";
import { registerLedgerIpc } from "./ipc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: "Money Pig",
    backgroundColor: "#f6f4ef",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devServerUrl = process.env.MONEY_PIG_DEV_SERVER_URL;

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  await reportSmokeStatus(mainWindow);
}

async function reportSmokeStatus(window: BrowserWindow): Promise<void> {
  const smokePort = process.env.MONEY_PIG_SMOKE_PORT;
  if (!smokePort) {
    return;
  }

  const hasApi = await window.webContents.executeJavaScript(
    "Boolean(window.moneyPig && typeof window.moneyPig.getState === 'function')"
  );
  const socket = connect(Number(smokePort), "127.0.0.1", () => {
    socket.end(hasApi ? "ok" : "missing-api");
  });
  socket.on("error", () => undefined);
}

app.whenReady().then(async () => {
  const repository = await LedgerRepository.open(app.getPath("userData"));
  registerLedgerIpc(repository);

  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
