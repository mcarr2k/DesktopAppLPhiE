import { ipcMain } from "electron";
import { deleteAuthItem, readAuthItem, writeAuthItem } from "../store.js";

export function registerAuthIpc() {
  ipcMain.handle("auth:getItem", (_event, key: string) => readAuthItem(key));
  ipcMain.handle("auth:setItem", (_event, key: string, value: string) =>
    writeAuthItem(key, value)
  );
  ipcMain.handle("auth:removeItem", (_event, key: string) =>
    deleteAuthItem(key)
  );
}
