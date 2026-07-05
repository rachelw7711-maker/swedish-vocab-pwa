import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 4174);
const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
};

async function readAsset(requestPath) {
  const requested = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(DIST, safePath);
  const fileStat = await stat(filePath);
  if (fileStat.isDirectory()) {
    return readAsset(join(requestPath, "index.html"));
  }
  return { filePath, file: await readFile(filePath) };
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      const { filePath, file } = await readAsset(url.pathname);
      res.writeHead(200, {
        "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : file);
      return;
    } catch {
      const fallback = await readFile(join(DIST, "index.html"));
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : fallback);
    }
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(error.message || "Preview server error");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Preview server: http://localhost:${PORT}/`);
});
