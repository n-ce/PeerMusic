process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";
import { fetchMoodPlaylistsBySlug } from "./src/lib/networkScraper.ts";
import { scrapeNode } from "./src/lib/nodeScraper.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

function apiScraperPlugin(): Plugin {
  return {
    name: "api-scraper-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || "";

        // 1. Mood playlists endpoint: /api/mood/:slug or /api/scrape?mood=:slug
        if (
          reqUrl.startsWith("/api/mood/") ||
          reqUrl.startsWith("/api/scrape")
        ) {
          try {
            const urlObj = new URL(reqUrl, "http://localhost");
            let moodSlug = "chill";
            if (reqUrl.startsWith("/api/mood/")) {
              moodSlug = reqUrl.replace("/api/mood/", "").split("?")[0].trim();
            } else if (urlObj.searchParams.get("mood")) {
              moodSlug = urlObj.searchParams.get("mood")!.trim();
            }

            const playlists = await fetchMoodPlaylistsBySlug(moodSlug);
            const outputPath = resolve(
              process.cwd(),
              `public/moods/${moodSlug}.json`,
            );
            mkdirSync(dirname(outputPath), { recursive: true });
            writeFileSync(
              outputPath,
              JSON.stringify(playlists, null, 2),
              "utf-8",
            );

            // Mirror chill if applicable
            if (moodSlug === "chill") {
              writeFileSync(
                resolve(process.cwd(), "public/chill-playlists.json"),
                JSON.stringify(playlists, null, 2),
                "utf-8",
              );
            }

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                mood: moodSlug,
                count: playlists.length,
                playlists,
              }),
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: err?.message || "Mood scrape failed" }),
            );
          }
          return;
        }

        // 2. Node scraping endpoint: /api/node/:cleanId
        if (reqUrl.startsWith("/api/node/")) {
          try {
            const cleanId = reqUrl
              .replace("/api/node/", "")
              .split("?")[0]
              .trim();
            const nodeData = await scrapeNode(cleanId);

            const outputPath = resolve(
              process.cwd(),
              `public/nodes/${cleanId}.json`,
            );
            mkdirSync(dirname(outputPath), { recursive: true });
            writeFileSync(
              outputPath,
              JSON.stringify(nodeData, null, 2),
              "utf-8",
            );

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, data: nodeData }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: err?.message || "Node scrape failed" }),
            );
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [svelte(), apiScraperPlugin()],
});
