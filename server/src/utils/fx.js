const DEFAULT_TTL = Number(process.env.FX_CACHE_TTL_MS || 15 * 60 * 1000); // 15 min
const DEFAULT_TIMEOUT = Number(process.env.FX_TIMEOUT_MS || 7000); // 7s
const PROVIDER = (process.env.FX_PROVIDER || "openexchangerates").toLowerCase();
const OXR_APP_ID = process.env.OXR_APP_ID;

// in-memory cache: per-pair & also full OXR latest payload
const pairCache = new Map(); // key: "FROM-TO" => { rate, at }
let oxrLatestCache = null; // { rates: {...}, at }

function withTimeout(promiseFactory, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return promiseFactory(ctrl.signal).finally(() => clearTimeout(t));
}

// --- Provider fetchers ---
async function fetchOpenExchangeRates(signal) {
  if (!OXR_APP_ID) throw new Error("Missing OXR_APP_ID");
  // latest.json returns { base: "USD", rates: { EUR: 0.92, INR: 84.3, ... } }
  const url = `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(OXR_APP_ID)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OXR HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.rates || typeof data?.rates?.USD !== "number") {
    throw new Error("OXR invalid response");
  }
  return data; // keep whole payload for multi-pair conversions
}

// Optional fallbacks (kept for resilience; can remove if you want OXR-only)
async function fetchExchangerateHost(from, to, signal) {
  const url = `https://api.exchangerate.host/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`exchangerate.host HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.success || typeof data?.info?.rate !== "number")
    throw new Error("exchangerate.host invalid response");
  return {
    base: from.toUpperCase(),
    rates: { [to.toUpperCase()]: data.info.rate },
  };
}

async function fetchFrankfurter(from, to, signal) {
  const url = `https://api.frankfurter.app/latest?amount=1&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
  const data = await res.json();
  const rate = data?.rates?.[to.toUpperCase()];
  if (typeof rate !== "number") throw new Error("frankfurter invalid response");
  return { base: from.toUpperCase(), rates: { [to.toUpperCase()]: rate } };
}

// --- Rate composition ---
function computeCrossRate(from, to, oxrRates) {
  // OXR base is USD. For A->B, rate = rates[B]/rates[A]
  const A = from.toUpperCase();
  const B = to.toUpperCase();
  if (A === B) return 1;

  const rUSD_A = A === "USD" ? 1 : oxrRates[A];
  const rUSD_B = B === "USD" ? 1 : oxrRates[B];

  if (typeof rUSD_A !== "number" || typeof rUSD_B !== "number") {
    throw new Error(`Missing rate(s) for ${A} or ${B}`);
  }
  // USD->B divided by USD->A gives A->B
  return rUSD_B / rUSD_A;
}

import { cacheGet, cacheSet } from "./fx-cache.js";
// --- Public API ---
export async function getFxRate(from, to) {
  const key = `pair:${from.toUpperCase()}-${to.toUpperCase()}`;
  const ttlMs = Number(process.env.FX_CACHE_TTL_MS || 900000);
  const ttlSec = Math.ceil(ttlMs / 1000);
  const now = Date.now();

  // Pair cache
  const hit = await cacheGet(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.rate;

  let rate;

  if (PROVIDER === "openexchangerates") {
    try {
      // Use cached latest if fresh
      if (oxrLatestCache && now - oxrLatestCache.at < DEFAULT_TTL) {
        rate = computeCrossRate(from, to, oxrLatestCache.rates);
      } else {
        const data = await withTimeout(
          (signal) => fetchOpenExchangeRates(signal),
          DEFAULT_TIMEOUT,
        );
        oxrLatestCache = { rates: data.rates, at: now };
        rate = computeCrossRate(from, to, data.rates);
      }
    } catch (e) {
      console.error("[FX] OXR failed:", e?.message || e);
      // Optional: fallbacks if OXR is down — comment out if you want strict OXR-only behavior
      try {
        const data = await withTimeout(
          (signal) => fetchExchangerateHost(from, to, signal),
          DEFAULT_TIMEOUT,
        );
        rate = data.rates[to.toUpperCase()];
      } catch {
        const data = await withTimeout(
          (signal) => fetchFrankfurter(from, to, signal),
          DEFAULT_TIMEOUT,
        );
        rate = data.rates[to.toUpperCase()];
      }
    }
  } else {
    // Other providers if you set FX_PROVIDER differently
    const data = await withTimeout(
      (signal) => fetchExchangerateHost(from, to, signal),
      DEFAULT_TIMEOUT,
    ).catch(async () => fetchFrankfurter(from, to, undefined));
    rate = data.rates[to.toUpperCase()];
  }

  if (typeof rate !== "number" || !isFinite(rate)) {
    throw new Error(`FX providers unavailable for ${from}->${to}`);
  }

  await cacheSet(key, { rate, at: now }, ttlSec);
  return rate;
}

export function getFxMeta() {
  return {
    provider: (process.env.FX_PROVIDER || "openexchangerates").toLowerCase(),
    latestAgeMs: oxrLatestCache ? Date.now() - oxrLatestCache.at : null,
    cacheTtlMs: Number(process.env.FX_CACHE_TTL_MS || 15 * 60 * 1000),
  };
}

export async function getFxPairMeta(from, to) {
  const key = `pair:${from.toUpperCase()}-${to.toUpperCase()}`;
  const hit = await cacheGet(key);
  if (!hit) return { cached: false, at: null };
  return { cached: true, at: hit.at }; // 'at' is a ms timestamp we store
}
