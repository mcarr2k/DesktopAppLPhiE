import Store from "electron-store";
import os from "node:os";
import crypto from "node:crypto";

function deriveEncryptionKey(): string {
  const seed = `${os.userInfo().username}:${os.hostname()}:lphie-bz`;
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

type Schema = {
  authStorage: Record<string, string>;
};

export const secureStore = new Store<Schema>({
  name: "auth",
  encryptionKey: deriveEncryptionKey(),
  defaults: { authStorage: {} },
});

export function readAuthItem(key: string): string | null {
  const bag = (secureStore.get("authStorage") as Record<string, string>) ?? {};
  return key in bag ? bag[key] : null;
}

export function writeAuthItem(key: string, value: string): void {
  const bag = (secureStore.get("authStorage") as Record<string, string>) ?? {};
  bag[key] = value;
  secureStore.set("authStorage", bag);
}

export function deleteAuthItem(key: string): void {
  const bag = (secureStore.get("authStorage") as Record<string, string>) ?? {};
  delete bag[key];
  secureStore.set("authStorage", bag);
}
