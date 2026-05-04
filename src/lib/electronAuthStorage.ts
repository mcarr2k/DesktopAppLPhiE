// Custom storage adapter that bridges Supabase's auth storage interface to
// electron-store via the preload IPC bridge. Falls back to localStorage
// outside of Electron (e.g. during `vite preview`).

type AsyncStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

declare global {
  interface Window {
    lphie?: {
      authStorage: AsyncStorage;
      notifyRoleChanged: (isEboard: boolean) => void;
      onSignOutRequested: (handler: () => void) => () => void;
      platform: string;
    };
  }
}

const electronStorage: AsyncStorage = {
  async getItem(key) {
    if (window.lphie) return window.lphie.authStorage.getItem(key);
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (window.lphie) await window.lphie.authStorage.setItem(key, value);
    else localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (window.lphie) await window.lphie.authStorage.removeItem(key);
    else localStorage.removeItem(key);
  },
};

export default electronStorage;
