import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { scrapeMoodsNetwork } from "../src/lib/networkScraper.ts";
import { scrapeDeepSleepMeditationNode } from "../src/lib/nodeScraper.ts";

async function main() {
  console.log("=== Scraping PeerMusic Moods Network ===");
  const startTime = Date.now();

  // 1. Scrape moods network
  const result = await scrapeMoodsNetwork();
  console.log(
    `Successfully scraped ${result.categories.moods.length} moods.`,
  );
  console.log(`Discovered ${result.totalUniqueNodes} unique RDCLAK5uy nodes across all moods.`);

  const publicDir = resolve(process.cwd(), "public");
  mkdirSync(publicDir, { recursive: true });

  // 2. Save public/nodes-network.json
  const networkPath = resolve(publicDir, "nodes-network.json");
  writeFileSync(networkPath, JSON.stringify(result.nodes, null, 2), "utf-8");
  console.log(`Saved ${result.nodes.length} nodes to public/nodes-network.json`);

  // 3. Save public/categories.json with live IDs and counts
  const categoriesPath = resolve(publicDir, "categories.json");
  writeFileSync(
    categoriesPath,
    JSON.stringify(result.categories, null, 2),
    "utf-8",
  );
  console.log("Saved updated categories to public/categories.json");

  // 4. Save public/chill-playlists.json
  if (result.categoryPlaylists["chill"]) {
    const chillPath = resolve(publicDir, "chill-playlists.json");
    writeFileSync(
      chillPath,
      JSON.stringify(result.categoryPlaylists["chill"], null, 2),
      "utf-8",
    );
    console.log(
      `Saved ${result.categoryPlaylists["chill"].length} chill playlists to public/chill-playlists.json`,
    );
  }

  // 5. Scrape and save Deep Sleep Meditation node with full artist and album data
  console.log("Scraping Deep Sleep Meditation node...");
  try {
    const nodeData = await scrapeDeepSleepMeditationNode();
    const nodePath = resolve(publicDir, "node-deep-sleep-meditation.json");
    writeFileSync(nodePath, JSON.stringify(nodeData, null, 2), "utf-8");
    console.log(
      `Saved Deep Sleep Meditation (${nodeData.atvs.length} ATVs, ${nodeData.omvs.length} OMVs, ${nodeData.relatedNodes.length} related nodes) to public/node-deep-sleep-meditation.json`,
    );
  } catch (err) {
    console.warn("Failed to scrape Deep Sleep Meditation node:", err);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== Done in ${elapsed}s ===`);
}

main().catch((err) => {
  console.error("Scrape network failed:", err);
  process.exit(1);
});
