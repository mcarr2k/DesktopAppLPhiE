import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerAuthIpc } from "./ipc/auth.js";
import { buildMenu } from "./menu.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
const ELECTRON_DIST = path.join(process.env.APP_ROOT, "dist-electron");

let mainWindow: BrowserWindow | null = null;
let isEboard = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#F8F4E8",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    icon: path.join(process.env.APP_ROOT!, "build/icon.png"),
    webPreferences: {
      preload: path.join(ELECTRON_DIST, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  Menu.setApplicationMenu(buildMenu({ isEboard, onSignOut: signOutFromMenu }));
}

function signOutFromMenu() {
  mainWindow?.webContents.send("auth:request-sign-out");
}

app.whenReady().then(() => {
  registerAuthIpc();

  ipcMain.on("auth:role-changed", (_event, payload: { isEboard: boolean }) => {
    isEboard = !!payload?.isEboard;
    Menu.setApplicationMenu(buildMenu({ isEboard, onSignOut: signOutFromMenu }));
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
  mainWindow = null;
});
