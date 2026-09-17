import pg from "pg";

let pool = null;

export function db() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function q(text, params = []) {
  const res = await db().query(text, params);
  return res.rows;
}

export async function log(area, message, meta = {}, level = "info") {
  try {
    await q("INSERT INTO logs (level, area, message, meta) VALUES ($1,$2,$3,$4)", [
      level,
      area,
      message,
      JSON.stringify(meta),
    ]);
  } catch {
    // السجل لا يوقف العمل أبداً
  }
}
