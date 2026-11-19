process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";
import { scrapeChill } from "./src/lib/scraper.ts";
import {
  scrapeNode,
  scrapeDeepSleepMeditationNode,
} from "./src/lib/nodeScraper.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

function apiScraperPlugin(): Plugin {
  return {
    name: "api-scraper-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/chill" || req.url === "/api/scrape") {
          try {
            const playlists = await scrapeChill();
            const outputPath = resolve(
              process.cwd(),
              "public/chill-playlists.json",
            );
            mkdirSync(dirname(outputPath), { recursive: true });
            writeFileSync(
              outputPath,
              JSON.stringify(playlists, null, 2),
              "utf-8",
            );
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                count: playlists.length,
                playlists,
              }),
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err?.message || "Scrape failed" }));
          }
          return;
        }

        if (req.url?.startsWith("/api/node/")) {
          try {
            const cleanId = req.url.replace("/api/node/", "").split("?")[0];
            const nodeData =
              cleanId === "deep-sleep-meditation" ||
              cleanId === "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ"
                ? await scrapeDeepSleepMeditationNode()
                : await scrapeNode(cleanId);

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
