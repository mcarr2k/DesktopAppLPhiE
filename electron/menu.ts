import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  shell,
} from "electron";

type BuildMenuArgs = {
  isEboard: boolean;
  onSignOut: () => void;
};

function dispatchToFocused(eventName: string, detail?: unknown) {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;
  const detailJson = detail ? JSON.stringify(detail) : "undefined";
  win.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)}, { detail: ${detailJson} }))`
  );
}

export function buildMenu({ isEboard, onSignOut }: BuildMenuArgs): Menu {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ] as MenuItemConstructorOptions[])
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Event…",
          accelerator: "CmdOrCtrl+N",
          click: () => dispatchToFocused("lphie:new-event"),
        },
        ...(isEboard
          ? ([
              {
                label: "New E-Board-Only Event…",
                accelerator: "CmdOrCtrl+Shift+N",
                click: () =>
                  dispatchToFocused("lphie:new-event", {
                    visibility: "eboard_only",
                  }),
              },
            ] as MenuItemConstructorOptions[])
          : []),
        { type: "separator" },
        {
          label: "Sign Out",
          click: () => onSignOut(),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? ([
              { type: "separator" as const },
              { role: "front" as const },
            ] as MenuItemConstructorOptions[])
          : ([{ role: "close" as const }] as MenuItemConstructorOptions[])),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Lambda Phi Epsilon (National)",
          click: () => shell.openExternal("https://lambdaphiepsilon.com"),
        },
        {
          label: "VT Beta Zeta Chapter",
          click: () =>
            shell.openExternal("https://gobblerconnect.vt.edu/organization"),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
