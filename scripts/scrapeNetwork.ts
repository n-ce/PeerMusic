import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { scrapeMoodsNetwork } from "../src/lib/networkScraper.ts";
import { scrapeNode } from "../src/lib/nodeScraper.ts";

async function main() {
  console.log("=== Scraping PeerMusic Moods & Nodes Network ===");
  const startTime = Date.now();

  const publicDir = resolve(process.cwd(), "public");
  const moodsDir = resolve(publicDir, "moods");
  const nodesDir = resolve(publicDir, "nodes");
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(moodsDir, { recursive: true });
  mkdirSync(nodesDir, { recursive: true });

  // 1. Scrape all moods and build the network of RDCLAK5uy nodes
  const result = await scrapeMoodsNetwork();
  console.log(`Successfully scraped ${result.categories.moods.length} moods.`);
  console.log(
    `Discovered ${result.totalUniqueNodes} unique RDCLAK5uy nodes across all moods.`,
  );

  // 2. Save public/nodes-network.json
  const networkPath = resolve(publicDir, "nodes-network.json");
  writeFileSync(networkPath, JSON.stringify(result.nodes, null, 2), "utf-8");
  console.log(
    `Saved ${result.nodes.length} nodes to public/nodes-network.json`,
  );

  // 3. Save public/categories.json with live IDs and counts
  const categoriesPath = resolve(publicDir, "categories.json");
  writeFileSync(
    categoriesPath,
    JSON.stringify(result.categories, null, 2),
    "utf-8",
  );
  console.log("Saved updated categories to public/categories.json");

  // 4. Save each mood's playlists to public/moods/<slug>.json
  for (const mood of result.categories.moods) {
    const list = result.categoryPlaylists[mood.slug] || [];
    const moodPath = resolve(moodsDir, `${mood.slug}.json`);
    writeFileSync(moodPath, JSON.stringify(list, null, 2), "utf-8");
    console.log(
      `Saved ${list.length} playlists to public/moods/${mood.slug}.json`,
    );
  }

  // Backwards-compatible mirror for chill
  if (result.categoryPlaylists["chill"]) {
    writeFileSync(
      resolve(publicDir, "chill-playlists.json"),
      JSON.stringify(result.categoryPlaylists["chill"], null, 2),
      "utf-8",
    );
  }

  // 5. Pre-scrape top most-appearing nodes across the network into public/nodes/<id>.json
  const TOP_NODES_TO_PRE_SCRAPE = 8;
  const topNodes = result.nodes.slice(0, TOP_NODES_TO_PRE_SCRAPE);
  console.log(
    `Pre-scraping top ${topNodes.length} most-appearing nodes across categories into public/nodes/...`,
  );

  for (let i = 0; i < topNodes.length; i++) {
    const node = topNodes[i];
    try {
      console.log(
        `[${i + 1}/${topNodes.length}] Scraping node "${node.title}" (${node.id}) with ${node.appearances} appearances...`,
      );
      const nodeData = await scrapeNode(node.id, node.title);
      const nodeFilePath = resolve(nodesDir, `${node.id}.json`);
      writeFileSync(nodeFilePath, JSON.stringify(nodeData, null, 2), "utf-8");
      console.log(
        `  -> Saved ${nodeData.atvs.length} ATVs & ${nodeData.omvs.length} OMVs to public/nodes/${node.id}.json`,
      );

      // Backwards compatibility for Deep Sleep Meditation if scraped
      if (node.id === "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ") {
        writeFileSync(
          resolve(publicDir, "node-deep-sleep-meditation.json"),
          JSON.stringify(nodeData, null, 2),
          "utf-8",
        );
      }
    } catch (err) {
      console.warn(`Failed to scrape node ${node.id} (${node.title}):`, err);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== Done in ${elapsed}s ===`);
}

main().catch((err) => {
  console.error("Scrape network failed:", err);
  process.exit(1);
});
