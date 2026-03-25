import { requestHandler } from "../server/app.mjs";

export default async function handler(req, res) {
  const requestUrl = new URL(
    req.url ?? "/api",
    `http://${req.headers.host ?? "localhost"}`,
  );
  const forwardedPath = requestUrl.searchParams.get("__path");
  const normalizedPath = forwardedPath
    ? `/api/${forwardedPath.replace(/^\/+/, "")}`
    : null;

  await requestHandler(req, res, {
    serveStatic: false,
    pathNameOverride: normalizedPath,
  });
}
