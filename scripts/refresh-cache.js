// Runs on Vercel at build time (see vercel.json). Fetches the cat list from
// the live API and writes it to cache/cats.json, so every deploy ships a
// fresh copy of the fallback file that shared.js reads when the API is down.
//
// If the API can't be reached during the build, the existing cats.json is
// left alone and the deploy carries on (this script never fails the build).

const fs = require("fs");
const path = require("path");

const API_URL = "https://cat-api-maxingthesequel.vercel.app/api/v1/cats";
const API_KEY = "catTCGcollection-api-key-6767"; // same key shared.js uses
const OUT_FILE = path.join(__dirname, "..", "cache", "cats.json");

async function main() {
    try {
        const response = await fetch(API_URL, {
            headers: { "x-api-key": API_KEY },
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`API responded with ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data.cats) || data.cats.length === 0) {
            throw new Error("API response had no cats");
        }

        fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
        fs.writeFileSync(
            OUT_FILE,
            JSON.stringify({ cats: data.cats, refreshedAt: new Date().toISOString() }, null, 2)
        );
        console.log(`cache/cats.json refreshed with ${data.cats.length} cats.`);
    } catch (error) {
        console.warn("Cache refresh skipped, keeping existing cats.json:", error.message);
    }
}

main();
