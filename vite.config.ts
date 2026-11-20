process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";
import { fetchCategoryPlaylistsBySlug } from "./src/lib/networkScraper.ts";
import { scrapeNode } from "./src/lib/nodeScraper.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

function apiScraperPlugin(): Plugin {
  return {
    name: "api-scraper-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || "";

        // 1. Category playlists endpoint: /api/category/:slug, /api/mood/:slug, /api/genre/:slug, or /api/scrape
        if (
          reqUrl.startsWith("/api/category/") ||
          reqUrl.startsWith("/api/mood/") ||
          reqUrl.startsWith("/api/genre/") ||
          reqUrl.startsWith("/api/scrape")
        ) {
          try {
            const urlObj = new URL(reqUrl, "http://localhost");
            let slug = "chill";
            if (reqUrl.startsWith("/api/category/")) {
              slug = reqUrl.replace("/api/category/", "").split("?")[0].trim();
            } else if (reqUrl.startsWith("/api/mood/")) {
              slug = reqUrl.replace("/api/mood/", "").split("?")[0].trim();
            } else if (reqUrl.startsWith("/api/genre/")) {
              slug = reqUrl.replace("/api/genre/", "").split("?")[0].trim();
            } else if (urlObj.searchParams.get("category")) {
              slug = urlObj.searchParams.get("category")!.trim();
            } else if (urlObj.searchParams.get("genre")) {
              slug = urlObj.searchParams.get("genre")!.trim();
            } else if (urlObj.searchParams.get("mood")) {
              slug = urlObj.searchParams.get("mood")!.trim();
            }

            const playlists = await fetchCategoryPlaylistsBySlug(slug);

            const catPath = resolve(
              process.cwd(),
              `public/categories/${slug}.json`,
            );
            const moodPath = resolve(
              process.cwd(),
              `public/moods/${slug}.json`,
            );
            const genrePath = resolve(
              process.cwd(),
              `public/genres/${slug}.json`,
            );

            mkdirSync(dirname(catPath), { recursive: true });
            mkdirSync(dirname(moodPath), { recursive: true });
            mkdirSync(dirname(genrePath), { recursive: true });

            const jsonStr = JSON.stringify(playlists, null, 2);
            writeFileSync(catPath, jsonStr, "utf-8");
            writeFileSync(moodPath, jsonStr, "utf-8");
            writeFileSync(genrePath, jsonStr, "utf-8");

            // Mirror chill if applicable
            if (slug === "chill") {
              writeFileSync(
                resolve(process.cwd(), "public/chill-playlists.json"),
                jsonStr,
                "utf-8",
              );
            }

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                slug,
                count: playlists.length,
                playlists,
              }),
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: err?.message || "Category scrape failed",
              }),
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
