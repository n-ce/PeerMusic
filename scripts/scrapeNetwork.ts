import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { scrapeAllCategoriesNetwork } from "../src/lib/networkScraper.ts";
import { scrapeNode } from "../src/lib/nodeScraper.ts";
import { buildAggregatedMetadata } from "./aggregateMetadata.ts";

async function main() {
  console.log("=== Scraping PeerMusic Moods, Genres & Nodes Network ===");
  const startTime = Date.now();

  const publicDir = resolve(process.cwd(), "public");
  const moodsDir = resolve(publicDir, "moods");
  const genresDir = resolve(publicDir, "genres");
  const categoriesDir = resolve(publicDir, "categories");
  const nodesDir = resolve(publicDir, "nodes");

  mkdirSync(publicDir, { recursive: true });
  mkdirSync(moodsDir, { recursive: true });
  mkdirSync(genresDir, { recursive: true });
  mkdirSync(categoriesDir, { recursive: true });
  mkdirSync(nodesDir, { recursive: true });

  // 1. Scrape all moods and all genres, and build the full network of RDCLAK5uy nodes
  const result = await scrapeAllCategoriesNetwork(true);
  console.log(
    `Successfully scraped ${result.categories.moods.length} moods and ${result.categories.genres.length} genres.`,
  );
  console.log(
    `Discovered ${result.totalUniqueNodes} unique RDCLAK5uy nodes across all categories.`,
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

  // 4. Save each mood's playlists
  for (const mood of result.categories.moods) {
    const list = result.categoryPlaylists[mood.slug] || [];
    writeFileSync(
      resolve(moodsDir, `${mood.slug}.json`),
      JSON.stringify(list, null, 2),
      "utf-8",
    );
    writeFileSync(
      resolve(categoriesDir, `${mood.slug}.json`),
      JSON.stringify(list, null, 2),
      "utf-8",
    );
  }

  // 5. Save each genre's playlists
  for (const genre of result.categories.genres) {
    const list = result.categoryPlaylists[genre.slug] || [];
    writeFileSync(
      resolve(genresDir, `${genre.slug}.json`),
      JSON.stringify(list, null, 2),
      "utf-8",
    );
    writeFileSync(
      resolve(categoriesDir, `${genre.slug}.json`),
      JSON.stringify(list, null, 2),
      "utf-8",
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

  // 6. Pre-scrape top most-appearing nodes across all categories into public/nodes/<id>.json
  const TOP_NODES_TO_PRE_SCRAPE = 12;
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

  // 7. Aggregate Top Albums and Top Artists from all harvested nodes
  console.log("Aggregating Top Albums and Top Artists from harvested nodes...");
  buildAggregatedMetadata(nodesDir, publicDir);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== Done in ${elapsed}s ===`);
}

main().catch((err) => {
  console.error("Scrape network failed:", err);
  process.exit(1);
});
