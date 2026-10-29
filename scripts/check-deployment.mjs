const base = process.argv[2] || "http://localhost:3000";
let failure;
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const page = await fetch(base, { signal: AbortSignal.timeout(5000) });
    if (!page.ok) throw new Error(`Homepage: HTTP ${page.status}`);
    const html = await page.text();
    const assets = [...new Set([...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(match => match[1]))];
    if (!assets.length) throw new Error("Homepage contains no Next.js assets");
    for (const asset of assets) {
      const response = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(5000) });
      await response.body?.cancel();
      if (!response.ok) throw new Error(`${asset}: HTTP ${response.status}`);
    }
    console.log(`Homepage and all ${assets.length} CSS/JavaScript assets passed.`);
    process.exit(0);
  } catch (error) {
    failure = error;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
console.error(failure);
process.exit(1);
