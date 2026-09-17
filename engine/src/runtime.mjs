// طبقة التشغيل الموحّدة: الوكيل يطلب عملية، والطبقة تختار Windows أو Linux.
// التنفيذ عبر spawn بدون shell — البرنامج ومعاملاته محددان مسبقاً.

import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import os from "node:os";

export const PLATFORM = os.platform() === "win32" ? "windows" : "linux";

export function storageRoot() {
  return process.env.NAWAT_STORAGE || (PLATFORM === "windows" ? "C\u003a\\nawat-storage" : "/var/lib/nawat/storage");
}

function insideStorage(relative) {
  const root = resolve(storageRoot());
  const target = resolve(join(root, relative));
  if (!target.startsWith(root)) throw new Error("مسار خارج مجلد التخزين");
  return target;
}

export async function readStoredFile(relative) {
  return readFile(insideStorage(relative), "utf8");
}

export async function writeStoredFile(relative, content) {
  const target = insideStorage(relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  return target;
}

export async function listStored(relative = ".") {
  return readdir(insideStorage(relative));
}

// كل عملية نظام معرّفة ببرنامجها ومعاملاتها — لا نص حر يمرَّر إلى shell.
const OPERATIONS = {
  "disk.usage": {
    windows: () => ["powershell.exe", ["-NoProfile", "-Command", "Get-PSDrive -PSProvider FileSystem"]],
    linux: () => ["df", ["-h"]],
  },
  "memory.usage": {
    windows: () => ["powershell.exe", ["-NoProfile", "-Command", "Get-CimInstance Win32_OperatingSystem"]],
    linux: () => ["free", ["-m"]],
  },
  "process.list": {
    windows: () => ["powershell.exe", ["-NoProfile", "-Command", "Get-Process"]],
    linux: () => ["ps", ["-eo", "pid,comm,%cpu,%mem", "--sort=-%cpu"]],
  },
  "site.restart": {
    windows: (args) => ["pm2.cmd", ["restart", String(args.name)]],
    linux: (args) => ["pm2", ["restart", String(args.name)]],
  },
  "site.status": {
    windows: () => ["pm2.cmd", ["jlist"]],
    linux: () => ["pm2", ["jlist"]],
  },
  "site.build": {
    windows: (args) => ["npm.cmd", ["run", "build", "--prefix", String(args.dir)]],
    linux: (args) => ["npm", ["run", "build", "--prefix", String(args.dir)]],
  },
};

export function knownOperations() {
  return Object.keys(OPERATIONS);
}

export function runOperation(name, args = {}, timeoutMs = 120_000) {
  const op = OPERATIONS[name];
  if (!op) return Promise.reject(new Error(`عملية غير معروفة: ${name}`));
  const [file, argv] = op[PLATFORM](args);

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(file, argv, { shell: false });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectPromise(new Error("انتهت مهلة تنفيذ العملية"));
    }, timeoutMs);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      rejectPromise(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout: out.slice(-20_000), stderr: err.slice(-5_000), platform: PLATFORM });
    });
  });
}
