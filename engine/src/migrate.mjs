// تطبيق بنية قاعدة البيانات: node src/migrate.mjs

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { db } from "./db.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(join(here, "..", "schema.sql"), "utf8");

await db().query(sql);
console.log("تم تطبيق بنية قاعدة البيانات");
process.exit(0);
