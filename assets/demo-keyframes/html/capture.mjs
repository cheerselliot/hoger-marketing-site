import { chromium } from "playwright";
import path from "path";
import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname);
const OUT = path.resolve(__dirname, "..");
const PORT = 8765;

const pages = [
  ["01-value-prop.html", "keyframe-01-value-prop.png"],
  ["02-context-cadence.html", "keyframe-02-context-cadence.png"],
  ["03-wait-notification.html", "keyframe-03-wait-notification.png"],
  ["04-sharpen-knowledge.html", "keyframe-04-sharpen-knowledge.png"],
  ["05-elevate-memory.html", "keyframe-05-elevate-memory.png"],
];

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer((req, res) => {
  const filePath = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

for (const [html, png] of pages) {
  await page.goto(`http://127.0.0.1:${PORT}/${html}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const used = await page.evaluate(() => {
    const el = document.querySelector(".headline, .brand");
    return el ? getComputedStyle(el).fontFamily : null;
  });
  console.log(png, "→", used);
  await page.screenshot({
    path: path.join(OUT, png),
    clip: { x: 0, y: 0, width: 1920, height: 1080 },
    type: "png",
  });
}

await browser.close();
server.close();
