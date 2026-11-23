// Proxy route: the browser calls this, and this calls the cat API with the
// key from the Vercel environment variable BATTLE_API_KEY.
// The key is never written in the code and never sent to the browser.
// The upstream URL is fixed, so visitors cannot use this to reach other endpoints.
const UPSTREAM_URL = "https://cat-api-maxingthesequel.vercel.app/api/v1/cats";
const UPSTREAM_TIMEOUT_MS = 6000;

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ detail: "Method not allowed." });
    }

    const apiKey = process.env.BATTLE_API_KEY;
    if (!apiKey) {
        console.error("BATTLE_API_KEY is not set in the environment.");
        return res.status(500).json({ detail: "Server is not configured." });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const upstream = await fetch(UPSTREAM_URL, {
            headers: { "x-api-key": apiKey },
            signal: controller.signal,
        });
        const body = await upstream.text();
        if (upstream.ok) {
            res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        } else {
            console.error(`Cat API answered ${upstream.status}.`);
        }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(upstream.status).send(body);
    } catch (error) {
        console.error("Cat API request failed:", error.name);
        return res.status(502).json({ detail: "Could not reach the cat API." });
    } finally {
        clearTimeout(timeoutId);
    }
};