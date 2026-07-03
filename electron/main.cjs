// Nawat Desktop — Electron shell.
// Loads the published Nawat/HN app. All HN studios, templates, and
// server functions run against the hosted backend.

const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const APP_URL = process.env.NAWAT_APP_URL || "https://sentient-builder-forge.lovable.app";
const LOCAL_DATA = path.join(os.homedir(), "Documents", "Nawat");
try { fs.mkdirSync(LOCAL_DATA, { recursive: true }); } catch {}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: "نواة — Nawat",
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Only allow navigation to the app itself. Any external link opens in the OS browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const target = new URL(url);
      const home = new URL(APP_URL);
      if (target.origin !== home.origin) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {}
  });

  const showOffline = () => {
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>نواة — دون اتصال</title>
      <style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,Segoe UI,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
      .box{max-width:520px;padding:24px;border:1px solid #333;border-radius:12px;text-align:center}
      h1{color:#fbbf24;margin:0 0 8px}button{margin-top:16px;padding:10px 18px;background:#2563eb;border:0;color:#fff;border-radius:8px;cursor:pointer;font-size:14px}
      code{background:#1a1a1a;padding:2px 6px;border-radius:4px;color:#fbbf24}</style></head>
      <body><div class="box"><h1>🌰 نواة</h1><p>تعذّر الوصول إلى الخادم.</p>
      <p>تحقق من الاتصال بالإنترنت ثم أعد المحاولة.</p>
      <code>${LOCAL_DATA.replace(/\\/g, "/")}</code>
      <div><button onclick="location.href='${APP_URL}'">إعادة المحاولة</button></div></div></body></html>`;
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  };

  // Only trigger offline page when the MAIN frame truly fails with a network error.
  // Codes -3 (ABORTED) and -20..-99 are transient — ignore them.
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame) return;
    if (code === -3) return; // aborted (normal during redirects)
    if (code > -100) return; // not a real network failure
    console.error("Load failed:", code, desc, url);
    showOffline();
  });

  mainWindow.loadURL(APP_URL);


  const template = [
    {
      label: "نواة",
      submenu: [
        { label: "إعادة التحميل", accelerator: "F5", click: () => mainWindow.reload() },
        { label: "أدوات المطوّر", accelerator: "F12", click: () => mainWindow.webContents.toggleDevTools() },
        { type: "separator" },
        {
          label: "فتح مجلد البيانات",
          click: () => shell.openPath(LOCAL_DATA),
        },
        {
          label: "حول",
          click: () => dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "حول نواة",
            message: "نواة — Nawat Desktop",
            detail: `الإصدار: 1.6.2\nالخادم: ${APP_URL}\nالبيانات المحلية: ${LOCAL_DATA}`,
          }),
        },
        { type: "separator" },
        { role: "quit", label: "خروج" },
      ],
    },
    {
      label: "تحرير",
      submenu: [
        { role: "undo", label: "تراجع" },
        { role: "redo", label: "إعادة" },
        { type: "separator" },
        { role: "cut", label: "قص" },
        { role: "copy", label: "نسخ" },
        { role: "paste", label: "لصق" },
        { role: "selectAll", label: "تحديد الكل" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
