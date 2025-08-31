import { createClient } from "redis";

const backend = (process.env.FX_CACHE_BACKEND || "memory").toLowerCase();

let redis;
if (backend === "redis") {
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on("error", (e) => console.error("[Redis] error", e));
  await redis.connect();
}

const mem = new Map();

export async function cacheGet(key) {
  if (backend === "redis") {
    const v = await redis.get(key);
    return v ? JSON.parse(v) : null;
  }
  return mem.get(key) || null;
}

export async function cacheSet(key, value, ttlSec) {
  if (backend === "redis") {
    await redis.set(key, JSON.stringify(value), { EX: ttlSec });
    return;
  }
  mem.set(key, value);
  // no TTL eviction for memory (kept simple)
}
