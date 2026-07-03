const { contextBridge } = require("electron");
const os = require("os");
const path = require("path");

contextBridge.exposeInMainWorld("nawat", {
  platform: process.platform,
  dataDir: path.join(os.homedir(), "Documents", "Nawat"),
  version: "1.6.2",
});
