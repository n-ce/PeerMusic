import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { scrapeDeepSleepMeditationNode } from "../src/lib/nodeScraper";

async function main() {
  console.log("Scraping Deep Sleep Meditation node...");
  const data = await scrapeDeepSleepMeditationNode();
  console.log(
    `Scraped node: ${data.atvs.length} ATVs, ${data.omvs.length} OMVs.`,
  );

  const outputPath = resolve(
    process.cwd(),
    "public/node-deep-sleep-meditation.json",
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
  console.log("Saved to", outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
