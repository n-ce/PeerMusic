import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { scrapeChill } from '../src/lib/scraper';

async function main() {
  console.log('Scraping YouTube Music Chill playlists...');
  const playlists = await scrapeChill();
  console.log(`Successfully scraped & aggregated ${playlists.length} Chill playlists.`);

  const outputPath = resolve(process.cwd(), 'public/chill-playlists.json');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(playlists, null, 2), 'utf-8');
  console.log(`Saved output to ${outputPath}`);
}

main().catch((err) => {
  console.error('Scraping error:', err);
  process.exit(1);
});
