// Read-only: compressed resource bytes, NOT CWV or a page-render timing.
import http from "node:http";
import https from "node:https";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const base = new URL(process.argv[2] ?? "http://localhost:3210");
if (!["http:", "https:"].includes(base.protocol))
  throw new Error("Expected an HTTP(S) URL");
function get(path) {
  const url = new URL(path, base);
  return new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? https : http).get(
      url,
      { headers: { "Accept-Encoding": "gzip" } },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const raw = Buffer.concat(chunks);
          const encoding = response.headers["content-encoding"];
          const decoded =
            encoding === "br"
              ? brotliDecompressSync(raw)
              : encoding === "gzip"
                ? gunzipSync(raw)
                : raw;
          resolve({
            status: response.statusCode,
            bytes: raw.length,
            encoding: encoding ?? "identity",
            text: decoded.toString("utf8"),
          });
        });
        response.on("error", reject);
      },
    );
    req.on("error", reject);
    req.setTimeout(15_000, () => req.destroy(new Error("Request timeout")));
  });
}
for (const path of [
  "/",
  "/restaurants",
  "/instituts-beaute",
  "/tarifs",
  "/guides",
]) {
  const html = await get(path);
  if (html.status !== 200) throw new Error(`${path}: HTTP ${html.status}`);
  const resources = [
    ...new Set(
      [
        ...html.text.matchAll(
          /(?:src|href)="([^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g,
        ),
      ]
        .map((match) => match[1])
        .filter((path) => path.startsWith("/_next/")),
    ),
  ];
  const result = {
    path,
    htmlBytes: html.bytes,
    htmlEncoding: html.encoding,
    jsBytes: 0,
    cssBytes: 0,
    resources: [],
  };
  for (const resource of resources) {
    const response = await get(resource);
    if (response.status !== 200)
      throw new Error(`${resource}: HTTP ${response.status}`);
    if (resource.includes(".js")) result.jsBytes += response.bytes;
    else result.cssBytes += response.bytes;
    result.resources.push({
      path: resource,
      bytes: response.bytes,
      encoding: response.encoding,
    });
  }
  console.log(JSON.stringify(result));
}
