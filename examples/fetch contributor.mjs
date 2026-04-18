/**
 * Fetch tastracker contributor page and extract asset rows from the embedded
 * Next.js RSC payload (escaped JSON: \"id\":\"...\").
 *
 * Output: examples/contributor-data.json (array of objects)
 * Optional: examples/contributor.html (set WRITE_HTML=1)
 *
 *   node "examples/fetch contributor.mjs"
 *
 * Filter by title substring (optional):
 *   set TITLE_FILTER=close-up
 *   node "examples/fetch contributor.mjs"
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET_URL =
  "https://tastracker.com/contributor?search=209031060&order=creation&content_type=all&generative_ai=all";

const COOKIE =
  "__Host-next-auth.csrf-token=bb0d296483695f9f6dd71e61b35e3c33bef2c85a1dd3b4f8bb37fc7df99a7945%7Cc86c4908c733a2a58e58fef0219abf2085f72e60b21dabd6b86040884048b529; __Secure-next-auth.callback-url=https%3A%2F%2Ftastracker.com; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..W2wyMfuHNvRjATOP.r2FMYyUDgX9vXS19d-EHBXHm2TpSWhKBcwNQi7kjblW3OAin5qH9_AwhS4qmj4pBNDVggShTrCDqtaCTMpZhiRfq2Kq15fOV-bjYKEV0TTV0E44A5FImZX4NdkDnigI-A8nqnRKQOJeTCin_LsoxJbalp5iA5DQ8YrsZNX0kx_mdXieyqz8kYFFEm1wJy30CBESX_G7AYpHQQEJ021-pzEOC2xhSNf-UURpUE5s64497ZthzcjHJmiC_t7EPjtRaED7DwabtA1R_aiDj3KS8tbrx0KFLz2VKfqUHG3f60a-YFMRApJ2OSoMBb1QjKAfr-U4leokG7khTVtZ9HeWkqRPrRIkLe04m7g.rKnlOKeC4bz_26PZMSO5lQ";

const chromeMajor = "147";
const jsonPath = process.env.OUT_JSON ?? "examples/contributor-data.json";
const htmlPath = process.env.OUT_HTML ?? "examples/contributor.html";
const titleFilter = (process.env.TITLE_FILTER ?? "").trim().toLowerCase();
const writeHtml = process.env.WRITE_HTML === "1";

/** Decode a JSON string fragment as it appears inside the RSC stream. */
function decodeJsonField(raw) {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

// One row in the escaped flight JSON (backslash-quote around keys/values).
const ROW_RE =
  /\\"id\\":\\"(\d+)\\",\\"title\\":\\"((?:[^\\]|\\.)*?)\\",\\"downloads\\":(\d+),\\"keywords\\":\\"((?:[^\\]|\\.)*?)\\",\\"creator\\":\\"((?:[^\\]|\\.)*?)\\",\\"creatorId\\":\\"[^\\]*\\",\\"dimensions\\":\\"((?:[^\\]|\\.)*?)\\",\\"thumbnailUrl\\":\\"((?:[^\\]|\\.)*?)\\",\\"mediaType\\":\\"((?:[^\\]|\\.)*?)\\",\\"mediaTypeId\\":\d+,\\"contentType\\":\\"((?:[^\\]|\\.)*?)\\",\\"category\\":\\"((?:[^\\]|\\.)*?)\\",\\"premium\\":\\"((?:[^\\]|\\.)*?)\\",\\"creationDate\\":\\"((?:[^\\]|\\.)*?)\\",\\"isAI\\":(true|false)/g;

function parseContributorAssets(html) {
  const rows = [];
  for (const m of html.matchAll(ROW_RE)) {
    const [
      ,
      id,
      titleRaw,
      downloads,
      keywordsRaw,
      creatorRaw,
      dimensionsRaw,
      thumbnailRaw,
      mediaTypeRaw,
      contentTypeRaw,
      categoryRaw,
      premiumRaw,
      creationRaw,
      isAI,
    ] = m;

    const title = decodeJsonField(titleRaw);
    if (titleFilter && !title.toLowerCase().includes(titleFilter)) continue;

    rows.push({
      id,
      title,
      downloads: Number(downloads),
      keywords: decodeJsonField(keywordsRaw),
      imageUrl: decodeJsonField(thumbnailRaw),
      dimensions: decodeJsonField(dimensionsRaw),
      mediaType: decodeJsonField(mediaTypeRaw),
      contentType: decodeJsonField(contentTypeRaw),
      category: decodeJsonField(categoryRaw),
      premium: decodeJsonField(premiumRaw),
      /** Server-side creation / update timestamp from the page payload */
      updatedAt: decodeJsonField(creationRaw),
      isAI: isAI === "true",
      creator: decodeJsonField(creatorRaw),
    });
  }
  return rows;
}

const ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
const secChUa = `"Google Chrome";v="${chromeMajor}", "Not.A/Brand";v="8", "Chromium";v="${chromeMajor}"`;

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-GB,en;q=0.9,ur-PK;q=0.8,ur;q=0.7,en-US;q=0.6",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Cookie: COOKIE,
  Priority: "u=0, i",
  "Sec-CH-UA": secChUa,
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": ua,
};

const res = await fetch(TARGET_URL, { method: "GET", headers });
const enc = (res.headers.get("content-encoding") ?? "").toLowerCase();
const buf = Buffer.from(await res.arrayBuffer());

if (enc.includes("zstd")) {
  console.error("Refusing zstd body; set Accept-Encoding without zstd (already done).");
  process.exit(1);
}

const html = new TextDecoder("utf8", { fatal: false }).decode(buf);

if (writeHtml) {
  writeFileSync(resolve(process.cwd(), htmlPath), html, "utf8");
  console.log("wrote", htmlPath);
}

const assets = parseContributorAssets(html);
const outJson = resolve(process.cwd(), jsonPath);
writeFileSync(outJson, JSON.stringify(assets, null, 2), "utf8");

console.log("status", res.status, res.statusText);
console.log("content-encoding", enc || "(none)");
console.log("assets parsed", assets.length, "→", outJson);

const sample =
  assets.find((a) => a.title.toLowerCase().includes("close-up")) ?? assets[0];
if (sample) {
  console.log("sample row:", {
    title: sample.title.slice(0, 72) + (sample.title.length > 72 ? "…" : ""),
    downloads: sample.downloads,
    keywords: sample.keywords || "(empty)",
    imageUrl: sample.imageUrl?.slice(0, 72) + "…",
    updatedAt: sample.updatedAt,
  });
}

if (res.status !== 200) process.exitCode = 1;
