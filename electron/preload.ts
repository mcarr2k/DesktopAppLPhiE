import { contextBridge, ipcRenderer } from "electron";

const api = {
  authStorage: {
    getItem: (key: string): Promise<string | null> =>
      ipcRenderer.invoke("auth:getItem", key),
    setItem: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke("auth:setItem", key, value),
    removeItem: (key: string): Promise<void> =>
      ipcRenderer.invoke("auth:removeItem", key),
  },
  notifyRoleChanged: (isEboard: boolean) =>
    ipcRenderer.send("auth:role-changed", { isEboard }),
  onSignOutRequested: (handler: () => void) => {
    const wrapped = () => handler();
    ipcRenderer.on("auth:request-sign-out", wrapped);
    return () => ipcRenderer.removeListener("auth:request-sign-out", wrapped);
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld("lphie", api);

export type LphieApi = typeof api;
