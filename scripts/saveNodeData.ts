import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { scrapeNode } from "../src/lib/nodeScraper.ts";

async function main() {
  const cleanNodeId = process.argv[2] || "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ";
  const knownTitle = process.argv[3];

  console.log(`Scraping node: ${cleanNodeId}...`);
  const data = await scrapeNode(cleanNodeId, knownTitle);
  console.log(
    `Scraped node "${data.playlistTitle}": ${data.atvs.length} ATVs, ${data.omvs.length} OMVs.`,
  );

  const outputPath = resolve(
    process.cwd(),
    `public/nodes/${data.playlistId}.json`,
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
  console.log("Saved to", outputPath);

  // Backwards compatibility mirror
  if (data.playlistId === "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ") {
    writeFileSync(
      resolve(process.cwd(), "public/node-deep-sleep-meditation.json"),
      JSON.stringify(data, null, 2),
      "utf-8",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
