import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const scryptAsync = promisify(scrypt);

const host = process.env.APP_HOST ?? "0.0.0.0";
const port = Number(process.env.APP_PORT ?? 8787);
const corsOrigin = process.env.APP_CORS_ORIGIN ?? "*";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL. Add it to your .env file.");
}

const sql = neon(databaseUrl);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

const contentTypeByExtension = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function ensureAuthTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS auth_users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
}

async function ensureHealthLogTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS health_check_logs (
      id BIGSERIAL PRIMARY KEY,
      endpoint TEXT NOT NULL,
      status TEXT NOT NULL,
      details JSONB,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function buildDisplayNameFromEmail(email) {
  const localPart = email.split("@")[0] || "nguoi dung";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapUserRow(userRow) {
  return {
    id: String(userRow.id),
    name: userRow.name,
    email: userRow.email,
    joinedDate: userRow.joined_date,
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

async function verifyPassword(password, hash) {
  const [salt, savedHash] = String(hash).split(":");
  if (!salt || !savedHash) {
    return false;
  }

  const derivedKey = Buffer.from(await scryptAsync(password, salt, 64));
  const savedBuffer = Buffer.from(savedHash, "hex");

  if (derivedKey.length !== savedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, savedBuffer);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON payload."));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
  });
  res.end(body);
}

function getTokenFromRequest(req, parsedBody) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  if (parsedBody && typeof parsedBody === "object" && "token" in parsedBody) {
    return String(parsedBody.token).trim();
  }

  return "";
}

async function createSession(userId) {
  const token = `${randomUUID()}${randomBytes(8).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO auth_sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt})
  `;

  return token;
}

async function handleSignUp(req, res) {
  const payload = await readJsonBody(req);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password ?? "");

  if (!email || !password) {
    sendJson(res, 400, {
      success: false,
      message: "Email và mật khẩu là bắt buộc.",
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    sendJson(res, 400, {
      success: false,
      message: "Email không hợp lệ.",
    });
    return;
  }

  if (password.length < 6) {
    sendJson(res, 400, {
      success: false,
      message: "Mật khẩu cần ít nhất 6 ký tự.",
    });
    return;
  }

  const existingUsers = await sql`
    SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
  `;

  if (existingUsers.length > 0) {
    sendJson(res, 409, {
      success: false,
      message: "Email này đã được sử dụng.",
    });
    return;
  }

  const passwordHash = await hashPassword(password);
  const name = buildDisplayNameFromEmail(email);

  const insertedUsers = await sql`
    INSERT INTO auth_users (name, email, password_hash)
    VALUES (${name}, ${email}, ${passwordHash})
    RETURNING id, name, email, created_at::date AS joined_date
  `;

  const user = insertedUsers[0];
  const token = await createSession(user.id);

  sendJson(res, 201, {
    success: true,
    message: "Tạo tài khoản thành công!",
    user: mapUserRow(user),
    token,
  });
}

async function handleLogin(req, res) {
  const payload = await readJsonBody(req);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password ?? "");

  if (!email || !password) {
    sendJson(res, 400, {
      success: false,
      message: "Email và mật khẩu là bắt buộc.",
    });
    return;
  }

  const users = await sql`
    SELECT id, name, email, password_hash, created_at::date AS joined_date
    FROM auth_users
    WHERE email = ${email}
    LIMIT 1
  `;

  const user = users[0];
  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: "Sai email hoặc mật khẩu.",
    });
    return;
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    sendJson(res, 401, {
      success: false,
      message: "Sai email hoặc mật khẩu.",
    });
    return;
  }

  const token = await createSession(user.id);

  sendJson(res, 200, {
    success: true,
    message: "Đăng nhập thành công!",
    user: mapUserRow(user),
    token,
  });
}

async function handleMe(req, res) {
  const token = getTokenFromRequest(req);
  if (!token) {
    sendJson(res, 401, {
      success: false,
      message: "Thiếu token phiên đăng nhập.",
    });
    return;
  }

  const sessions = await sql`
    SELECT u.id, u.name, u.email, u.created_at::date AS joined_date
    FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `;

  const user = sessions[0];
  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    user: mapUserRow(user),
  });
}

async function handleSignOut(req, res) {
  const body = await readJsonBody(req);
  const token = getTokenFromRequest(req, body);

  if (token) {
    await sql`DELETE FROM auth_sessions WHERE token = ${token}`;
  }

  sendJson(res, 200, {
    success: true,
    message: "Đăng xuất thành công.",
  });
}

function buildSystemHealth() {
  const memoryUsage = process.memoryUsage();

  return {
    status: "up",
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    nodeVersion: process.version,
    memoryUsageMb: {
      rss: Number((memoryUsage.rss / 1024 / 1024).toFixed(2)),
      heapUsed: Number((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotal: Number((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)),
    },
  };
}

async function buildDatabaseHealth(endpoint, systemHealth) {
  const dbStartedAt = performance.now();

  try {
    const pingRows = await sql`SELECT NOW() AS db_time`;
    const dbTime = pingRows[0]?.db_time;

    const logDetails = {
      service: "app-server",
      system: {
        uptimeSeconds: systemHealth.uptimeSeconds,
        nodeVersion: systemHealth.nodeVersion,
      },
      dbTime,
    };

    const insertRows = await sql`
      INSERT INTO health_check_logs (endpoint, status, details)
      VALUES (${endpoint}, ${"ok"}, ${JSON.stringify(logDetails)}::jsonb)
      RETURNING id, checked_at
    `;

    const logRow = insertRows[0] ?? null;

    return {
      status: "up",
      latencyMs: Number((performance.now() - dbStartedAt).toFixed(2)),
      dbTime,
      writeCheck: {
        status: "ok",
        logId: logRow?.id ?? null,
        loggedAt: logRow?.checked_at ?? null,
      },
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Number((performance.now() - dbStartedAt).toFixed(2)),
      error: error instanceof Error ? error.message : "Unknown database error",
      writeCheck: {
        status: "failed",
      },
    };
  }
}

async function handleHealth(req, res, pathName) {
  const startedAt = performance.now();
  const systemHealth = buildSystemHealth();
  const databaseHealth = await buildDatabaseHealth(pathName, systemHealth);
  const isHealthy = systemHealth.status === "up" && databaseHealth.status === "up";

  sendJson(res, isHealthy ? 200 : 503, {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    responseTimeMs: Number((performance.now() - startedAt).toFixed(2)),
    checks: {
      system: systemHealth,
      database: databaseHealth,
    },
  });
}

async function serveStaticAsset(res, pathName) {
  const normalizedPath = decodeURIComponent(pathName).replace(/^\/+/, "");
  const requestedPath = normalizedPath || "index.html";
  const absolutePath = path.resolve(distDir, requestedPath);

  if (!absolutePath.startsWith(distDir)) {
    sendFile(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const fileStats = await stat(absolutePath);
    if (!fileStats.isFile()) {
      throw new Error("Not a file");
    }

    const extension = path.extname(absolutePath).toLowerCase();
    const contentType =
      contentTypeByExtension[extension] ?? "application/octet-stream";
    const fileContents = await readFile(absolutePath);

    sendFile(res, 200, fileContents, contentType);
    return;
  } catch {
    const hasFileExtension = path.extname(pathName) !== "";
    if (hasFileExtension) {
      sendFile(res, 404, "Not Found", "text/plain; charset=utf-8");
      return;
    }

    try {
      const indexPath = path.resolve(distDir, "index.html");
      const html = await readFile(indexPath);
      sendFile(res, 200, html, "text/html; charset=utf-8");
      return;
    } catch {
      sendFile(
        res,
        500,
        "dist/index.html not found. Run npm run build first.",
        "text/plain; charset=utf-8"
      );
    }
  }
}

await ensureAuthTables();
await ensureHealthLogTable();

const server = http.createServer(async (req, res) => {
  const method = req.method ?? "GET";
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathName = requestUrl.pathname;

  if (method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  try {
    if (method === "POST" && pathName === "/api/auth/sign-up") {
      await handleSignUp(req, res);
      return;
    }

    if (method === "POST" && (pathName === "/api/auth/sign-in" || pathName === "/api/auth/login")) {
      await handleLogin(req, res);
      return;
    }

    if (
      method === "POST" &&
      (pathName === "/api/auth/sign-out" || pathName === "/api/auth/logout")
    ) {
      await handleSignOut(req, res);
      return;
    }

    if (method === "GET" && pathName === "/api/auth/me") {
      await handleMe(req, res);
      return;
    }

    if (method === "GET" && pathName === "/api/health") {
      await handleHealth(req, res, pathName);
      return;
    }

    if (pathName.startsWith("/api/")) {
      sendJson(res, 404, {
        success: false,
        message: "Endpoint không tồn tại.",
      });
      return;
    }

    await serveStaticAsset(res, pathName);
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

server.listen(port, host, () => {
  console.log(`App server running at http://${host}:${port}`);
});
