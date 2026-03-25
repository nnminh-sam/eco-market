import { requestHandler } from "../server/app.mjs";

export default async function handler(req, res) {
  await requestHandler(req, res, { serveStatic: false });
}
