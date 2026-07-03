// Nawat Desktop — Electron shell.
// Loads the published Nawat/HN app. All HN studios, templates, and
// server functions run against the hosted backend.

const { app, BrowserWindow, Menu, shell, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

const LOCAL_DATA = path.join(os.homedir(), "Documents", "Nawat");
try { fs.mkdirSync(LOCAL_DATA, { recursive: true }); } catch {}

// Use a fresh Electron profile so old cached service workers / GPU state from
// previous ZIPs cannot keep showing the old green/offline screen.
const DESKTOP_PROFILE = path.join(LOCAL_DATA, "desktop-profile-v3");
try {
  fs.mkdirSync(DESKTOP_PROFILE, { recursive: true });
  app.setPath("userData", DESKTOP_PROFILE);
} catch {}

function loadDotEnv() {
  const candidates = [
    path.join(path.dirname(process.execPath), ".env"),
    path.join(process.resourcesPath || "", ".env"),
    path.join(__dirname, "..", ".env"),
    path.join(process.cwd(), ".env"),
  ];

  for (const file of candidates) {
    try {
      if (!file || !fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key && process.env[key] === undefined) process.env[key] = value;
      }
    } catch {}
  }
}

loadDotEnv();

const APP_URL =
  process.env.NAWAT_APP_URL ||
  process.env.NAWAT_URL ||
  process.env.HN_NAWAT_BASE_URL ||
  "https://sentient-builder-forge.lovable.app";

let mainWindow = null;

async function createWindow() {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({ storages: ["serviceworkers", "cachestorage"] });
  } catch {}

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

  const showOffline = (code = "", desc = "") => {
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>نواة — دون اتصال</title>
      <style>body{background:#070711;color:#f3f4f6;font-family:system-ui,Segoe UI,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
      .box{max-width:620px;padding:28px;border:1px solid #2a2440;border-radius:18px;text-align:center;background:#0e0b1d;box-shadow:0 24px 80px #0008}
      h1{color:#fbbf24;margin:0 0 8px;font-size:30px}.muted{color:#a1a1aa;line-height:1.8}button{margin:16px 6px 0;padding:11px 18px;background:#8b5cf6;border:0;color:#fff;border-radius:10px;cursor:pointer;font-size:14px}
      .ghost{background:#1f2937}code{display:inline-block;direction:ltr;background:#171322;padding:6px 10px;border-radius:8px;color:#fbbf24;margin-top:8px}</style></head>
      <body><div class="box"><h1>🌰 نواة</h1><p class="muted">تعذّر فتح التطبيق داخل نافذة سطح المكتب.</p>
      <p class="muted">تأكد من الاتصال بالإنترنت، ثم أعد المحاولة. تم تعطيل تسريع الرسوميات ومسح كاش الخدمة لتجنب الشاشة الخضراء.</p>
      <code>${LOCAL_DATA.replace(/\\/g, "/")}</code>
      <p class="muted">${String(code)} ${String(desc)}</p>
      <div><button onclick="location.href='${APP_URL}'">إعادة المحاولة</button><button class="ghost" onclick="require('electron').shell.openExternal('${APP_URL}')">فتح في المتصفح</button></div></div></body></html>`;
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  };

  // Only trigger offline page when the MAIN frame truly fails with a network error.
  // Codes -3 (ABORTED) and -20..-99 are transient — ignore them.
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame) return;
    if (code === -3) return; // aborted (normal during redirects)
    if (code > -100) return; // not a real network failure
    console.error("Load failed:", code, desc, url);
    showOffline(code, desc);
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
