import http from "node:http";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const scryptAsync = promisify(scrypt);

const host = process.env.APP_HOST ?? "0.0.0.0";
const port = Number(process.env.APP_PORT ?? 8787);
const corsOrigin = process.env.APP_CORS_ORIGIN ?? "*";
const databaseUrl = process.env.DATABASE_URL;
const s3Region = String(process.env.S3_REGION ?? "").trim();
const s3BucketName = String(process.env.S3_BUCKET_NAME ?? "").trim();
const s3AccessKeyId = String(process.env.S3_ACCESS_KEY_ID ?? "").trim();
const s3SecretAccessKey = String(process.env.S3_SECRET_ACCESS_KEY ?? "").trim();
const s3UploadKeyPrefix = String(process.env.S3_UPLOAD_KEY_PREFIX ?? "products")
  .trim()
  .replace(/^\/+|\/+$/g, "");
const s3PublicBaseUrl = String(process.env.S3_PUBLIC_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/g, "");

const allowedUploadContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const validListingConditions = new Set([
  "Like New",
  "Very Good",
  "Good",
  "Fair",
]);
const maxUploadUrlExpiresInSeconds = 300;
const allowedSignUpEmailDomain = "@st.ueh.edu.vn";
const defaultWelcomeEmailSender = "nnminh.sam@gmail.com";
const defaultWelcomeEmailCtaUrl = "http://localhost:5173";
const signUpVerificationCodeLength = 6;
const signUpVerificationCodeLifetimeMinutes = 30;
const signUpVerificationCodeLifetimeMs =
  signUpVerificationCodeLifetimeMinutes * 60 * 1000;
const maxSignUpVerificationAttempts = 5;
const welcomeEmailEnabled =
  String(process.env.WELCOME_EMAIL_ENABLED ?? "true").trim().toLowerCase() !==
  "false";
const welcomeEmailSmtpHost = String(
  process.env.WELCOME_EMAIL_SMTP_HOST ?? "smtp.gmail.com",
).trim();
const welcomeEmailSmtpPort = Number(process.env.WELCOME_EMAIL_SMTP_PORT ?? 465);
const welcomeEmailFromAddress = String(
  process.env.WELCOME_EMAIL_FROM ?? defaultWelcomeEmailSender,
).trim();
const welcomeEmailSmtpUser = String(
  process.env.WELCOME_EMAIL_USER ?? welcomeEmailFromAddress,
).trim();
const welcomeEmailSmtpPass = String(process.env.WELCOME_EMAIL_PASS ?? "").trim();
const welcomeEmailCtaUrl = String(
  process.env.WELCOME_EMAIL_CTA_URL ??
    process.env.APP_FRONTEND_URL ??
    defaultWelcomeEmailCtaUrl,
).trim();
const smtpTimeoutMs = 15_000;

const sql = databaseUrl ? neon(databaseUrl) : null;
const databaseStartupError = databaseUrl
  ? null
  : "Missing DATABASE_URL. Add it to your .env file.";
let databaseInitError = null;
let hasLoggedWelcomeEmailConfigWarning = false;
let hasLoggedWelcomeEmailDisabledInfo = false;

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

function getDatabaseUnavailableReason() {
  if (databaseStartupError) {
    return databaseStartupError;
  }

  if (databaseInitError) {
    return databaseInitError instanceof Error
      ? databaseInitError.message
      : "Database initialization failed.";
  }

  return null;
}

function isDatabaseReady() {
  return Boolean(sql) && !databaseStartupError && !databaseInitError;
}

async function initializeDatabase() {
  if (!sql) {
    console.error(`[startup] ${databaseStartupError}`);
    return;
  }

  try {
    await ensureAuthTables();
    await ensureHealthLogTable();
    await ensureProductsTable();
    databaseInitError = null;
    console.log("[startup] Database tables are ready.");
  } catch (error) {
    databaseInitError = error;
    console.error("[startup] Database initialization failed:", error);
  }
}

async function ensureAuthTables() {
  if (!sql) {
    throw new Error("Database is not configured.");
  }

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

  await sql`
    CREATE TABLE IF NOT EXISTS auth_signup_verifications (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
}

async function ensureHealthLogTable() {
  if (!sql) {
    throw new Error("Database is not configured.");
  }

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

async function ensureProductsTable() {
  if (!sql) {
    throw new Error("Database is not configured.");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      created_by_user_id BIGINT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      item_condition TEXT NOT NULL,
      price BIGINT NOT NULL CHECK (price > 0),
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      size TEXT,
      brand TEXT,
      image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      views BIGINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  try {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available'`;
  } catch (error) {
    console.warn("[startup] Could not add status column (might already exist):", error.message);
  }
}

function hasS3Configuration() {
  return Boolean(
    s3Region && s3BucketName && s3AccessKeyId && s3SecretAccessKey,
  );
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function toAmzDate(date) {
  const iso = date.toISOString();
  return iso.replace(/[:-]|\.\d{3}/g, "");
}

function hashSha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function buildSigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function encodeS3ObjectKeyForPath(objectKey) {
  return objectKey
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/");
}

function buildS3ObjectUrl(objectKey) {
  const encodedKeyPath = encodeS3ObjectKeyForPath(objectKey);

  if (s3PublicBaseUrl) {
    return `${s3PublicBaseUrl}/${encodedKeyPath}`;
  }

  return `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${encodedKeyPath}`;
}

function sanitizeFileName(fileName) {
  const baseName = path.basename(String(fileName).trim());

  if (!baseName) {
    return "file";
  }

  return baseName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function buildPresignedS3PutUrl({ objectKey, expiresInSeconds }) {
  const currentTime = new Date();
  const amzDate = toAmzDate(currentTime);
  const dateStamp = amzDate.slice(0, 8);
  const serviceName = "s3";
  const hostName = `${s3BucketName}.s3.${s3Region}.amazonaws.com`;
  const credentialScope = `${dateStamp}/${s3Region}/${serviceName}/aws4_request`;
  const canonicalUri = `/${encodeS3ObjectKeyForPath(objectKey)}`;
  const canonicalQueryEntries = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${s3AccessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresInSeconds)],
    ["X-Amz-SignedHeaders", "host"],
  ];

  const canonicalQueryString = canonicalQueryEntries
    .map(
      ([queryKey, queryValue]) =>
        `${encodeRfc3986(queryKey)}=${encodeRfc3986(queryValue)}`,
    )
    .join("&");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    `host:${hostName}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashSha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = buildSigningKey(
    s3SecretAccessKey,
    dateStamp,
    s3Region,
    serviceName,
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return `https://${hostName}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function normalizeVerificationCode(code) {
  return String(code).trim().replace(/\s+/g, "");
}

function generateSignUpVerificationCode() {
  const maxValue = 10 ** signUpVerificationCodeLength;
  return String(Math.floor(Math.random() * maxValue)).padStart(
    signUpVerificationCodeLength,
    "0",
  );
}

function hashSignUpVerificationCode(email, code) {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${normalizeVerificationCode(code)}`)
    .digest("hex");
}

function isPostgresUniqueViolation(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function maskEmailAddress(email) {
  const normalized = String(email).trim().toLowerCase();
  const [localPart = "", domainPart = ""] = normalized.split("@");

  if (!localPart || !domainPart) {
    return "***";
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domainPart}`;
  }

  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

function isValidEmailAddress(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeSmtpValue(value) {
  return String(value).replace(/[\r\n]/g, "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePublicUrl(value, fallback) {
  try {
    const parsedUrl = new URL(String(value).trim());
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return fallback;
    }

    return parsedUrl.toString().replace(/\/+$/g, "");
  } catch {
    return fallback;
  }
}

function normalizeSmtpPort(value) {
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    return 465;
  }

  return value;
}

function getWelcomeEmailConfigurationState() {
  const missingSettings = [];

  if (!welcomeEmailSmtpHost) {
    missingSettings.push("WELCOME_EMAIL_SMTP_HOST");
  }

  if (!welcomeEmailFromAddress) {
    missingSettings.push("WELCOME_EMAIL_FROM");
  }

  if (!welcomeEmailSmtpUser) {
    missingSettings.push("WELCOME_EMAIL_USER");
  }

  if (!welcomeEmailSmtpPass) {
    missingSettings.push("WELCOME_EMAIL_PASS");
  }

  return {
    enabled: welcomeEmailEnabled,
    missingSettings,
    hasRequiredSettings: missingSettings.length === 0,
  };
}

function hasWelcomeEmailConfiguration() {
  const configurationState = getWelcomeEmailConfigurationState();

  return (
    configurationState.enabled && configurationState.hasRequiredSettings
  );
}

function logWelcomeEmailConfigurationOnStartup() {
  const configurationState = getWelcomeEmailConfigurationState();
  const normalizedPort = normalizeSmtpPort(welcomeEmailSmtpPort);

  if (!configurationState.enabled) {
    console.info("[email] Welcome email is disabled (WELCOME_EMAIL_ENABLED=false).");
    return;
  }

  console.info(
    `[email] Welcome email config: host=${welcomeEmailSmtpHost}:${normalizedPort}, from=${welcomeEmailFromAddress}, user=${welcomeEmailSmtpUser}, passwordSet=${welcomeEmailSmtpPass ? "yes" : "no"}, ctaUrl=${normalizePublicUrl(welcomeEmailCtaUrl, defaultWelcomeEmailCtaUrl)}`,
  );

  if (!configurationState.hasRequiredSettings) {
    console.warn(
      `[email] Missing welcome email settings: ${configurationState.missingSettings.join(", ",
      )}`,
    );
  }
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let bufferedText = "";
    const responseLines = [];

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP server response timed out."));
    }, smtpTimeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed unexpectedly."));
    };

    const onData = (chunk) => {
      bufferedText += chunk.toString("utf8");
      const splitLines = bufferedText.split(/\r?\n/);
      bufferedText = splitLines.pop() ?? "";

      for (const line of splitLines) {
        if (!line) {
          continue;
        }

        responseLines.push(line);
        const responseMatch = line.match(/^(\d{3})([ -])/);
        if (!responseMatch) {
          continue;
        }

        if (responseMatch[2] !== " ") {
          continue;
        }

        cleanup();
        resolve({
          code: Number(responseMatch[1]),
          lines: responseLines,
        });
        return;
      }
    };

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function runSmtpCommand(socket, command, expectedCodes, label) {
  if (command) {
    socket.write(`${command}\r\n`);
  }

  const response = await readSmtpResponse(socket);
  if (!expectedCodes.includes(response.code)) {
    throw new Error(
      `SMTP ${label} failed (${response.code}): ${response.lines.join(" | ")}`,
    );
  }
}

function escapeSmtpData(value) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

async function sendEmailViaSmtp({
  recipientEmail,
  subject,
  plainTextBody,
  htmlBody,
  category,
}) {
  const configurationState = getWelcomeEmailConfigurationState();

  if (!configurationState.enabled) {
    if (!hasLoggedWelcomeEmailDisabledInfo) {
      hasLoggedWelcomeEmailDisabledInfo = true;
      console.info("[email] SMTP email sending is disabled.");
    }
    return;
  }

  if (!configurationState.hasRequiredSettings) {
    if (!hasLoggedWelcomeEmailConfigWarning) {
      hasLoggedWelcomeEmailConfigWarning = true;
      console.warn(
        `[email] SMTP email skipped: missing settings ${configurationState.missingSettings.join(", ")}`,
      );
    }
    return;
  }

  const recipient = sanitizeSmtpValue(recipientEmail);
  const sender = sanitizeSmtpValue(welcomeEmailFromAddress);
  const smtpUser = sanitizeSmtpValue(welcomeEmailSmtpUser);
  const smtpPass = sanitizeSmtpValue(welcomeEmailSmtpPass);
  const smtpHost = sanitizeSmtpValue(welcomeEmailSmtpHost);
  const smtpPort = normalizeSmtpPort(welcomeEmailSmtpPort);

  if (!isValidEmailAddress(recipient) || !isValidEmailAddress(sender)) {
    throw new Error(`Invalid sender or recipient email for ${category} email.`);
  }

  console.info(
    `[email] Sending ${category} email to ${maskEmailAddress(
      recipient,
    )} via ${smtpHost}:${smtpPort}`,
  );

  const socket = await new Promise((resolve, reject) => {
    const connection = tls.connect({
      host: smtpHost,
      port: smtpPort,
      servername: smtpHost,
    });

    const timeout = setTimeout(() => {
      connection.destroy();
      reject(new Error("Could not establish SMTP connection in time."));
    }, smtpTimeoutMs);

    connection.once("secureConnect", () => {
      clearTimeout(timeout);
      resolve(connection);
    });

    connection.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  try {
    await runSmtpCommand(socket, "", [220], "greeting");
    await runSmtpCommand(socket, "EHLO localhost", [250], "EHLO");
    await runSmtpCommand(socket, "AUTH LOGIN", [334], "AUTH LOGIN");
    await runSmtpCommand(
      socket,
      Buffer.from(smtpUser, "utf8").toString("base64"),
      [334],
      "username",
    );
    await runSmtpCommand(
      socket,
      Buffer.from(smtpPass, "utf8").toString("base64"),
      [235],
      "password",
    );
    await runSmtpCommand(socket, `MAIL FROM:<${sender}>`, [250], "MAIL FROM");
    await runSmtpCommand(socket, `RCPT TO:<${recipient}>`, [250, 251], "RCPT TO");
    await runSmtpCommand(socket, "DATA", [354], "DATA");

    const mimeBoundary = `----=_EcoMarket_${randomBytes(12).toString("hex")}`;
    const messageData = [
      `From: EcoMarket <${sender}>`,
      `To: <${recipient}>`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary=\"${mimeBoundary}\"`,
      "",
      `--${mimeBoundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      plainTextBody,
      `--${mimeBoundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      htmlBody,
      `--${mimeBoundary}--`,
    ].join("\r\n");

    socket.write(`${escapeSmtpData(messageData)}\r\n.\r\n`);
    await runSmtpCommand(socket, "", [250], "message body");
    await runSmtpCommand(socket, "QUIT", [221], "QUIT");

    console.info(
      `[email] ${category} email sent successfully to ${maskEmailAddress(
        recipient,
      )}.`,
    );
  } finally {
    socket.end();
  }
}

async function sendSignUpVerificationCodeEmail({
  recipientEmail,
  recipientName,
  verificationCode,
}) {
  const safeVerificationCode = escapeHtml(verificationCode);
  const subject = "Mã xác thực đăng ký EcoMarket";
  const faqUrl = "https://www.facebook.com/profile.php?id=61576850488205";
  const supportUrl = "https://www.facebook.com/profile.php?id=61576850488205";

  const plainTextBody = [
    `Mã xác nhận của bạn là [ ${verificationCode} ]`,
    "",
    `Mã xác nhận này sẽ hết hiệu lực trong vòng ${signUpVerificationCodeLifetimeMinutes} phút.`,
    "",
    "Nếu bạn không gửi yêu cầu thay đổi thông tin hoặc nếu cần hỗ trợ thêm, vui lòng liên hệ Trung Tâm Khách Hàng của chúng tôi tại https://www.facebook.com/profile.php?id=61576850488205.",
    "",
    "Xin cảm ơn!",
    "EcoMarket",
    "",
    "*Email này được gửi từ một địa chỉ tự động và không thể nhận email phản hồi. Vui lòng không phản hồi lại email này. Nếu bạn mong muốn liên hệ đến chúng tôi, địa chỉ email Trung Tâm Khách Hàng của chúng tôi tại https://www.facebook.com/profile.php?id=61576850488205",
  ].join("\r\n");

  const htmlBody = `
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mã xác thực EcoMarket</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,Helvetica,sans-serif;color:#2f3e46;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;padding:20px;border-radius:8px;">
            
            <tr>
              <td style="text-align:center;padding-bottom:16px;">
                <strong style="font-size:20px;">EcoMarket</strong>
              </td>
            </tr>

            <tr>
              <td style="font-size:15px;line-height:1.6;padding-bottom:12px;">
                Mã xác nhận của bạn:
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:12px 0;">
                <div style="display:inline-block;padding:10px 16px;border:1px dashed #2d6a6a;font-size:26px;font-weight:700;letter-spacing:6px;color:#2d6a6a;">
                  ${safeVerificationCode}
                </div>
              </td>
            </tr>

            <tr>
              <td style="font-size:13px;color:#b54708;padding-bottom:12px;">
                Có hiệu lực trong ${signUpVerificationCodeLifetimeMinutes} phút.
              </td>
            </tr>

            <tr>
              <td style="font-size:13px;line-height:1.6;padding-bottom:12px;">
                Nếu bạn không yêu cầu, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ:
                <br/>
                <a href="${supportUrl}" target="_blank" style="color:#2d6a6a;">Hỗ trợ khách hàng</a>
              </td>
            </tr>

            <tr>
              <td style="font-size:12px;color:#6b7f86;">
                Email tự động, không nhận phản hồi.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  await sendEmailViaSmtp({
    recipientEmail,
    subject,
    plainTextBody,
    htmlBody,
    category: "signup verification",
  });
}

async function sendWelcomeEmail({ recipientEmail, recipientName }) {
  const safeRecipientName = sanitizeSmtpValue(recipientName || "bạn");
  const safeRecipientNameHtml = escapeHtml(safeRecipientName);
  const normalizedCtaUrl = normalizePublicUrl(
    welcomeEmailCtaUrl,
    defaultWelcomeEmailCtaUrl,
  );
  const safeCtaUrl = escapeHtml(normalizedCtaUrl);

  const subject = "🎉 Chào mừng bạn đến với EcoMarket";
  const plainTextBody = [
    `Xin chào ${safeRecipientName},`,
    "",
    "Chào mừng bạn đã đăng ký tài khoản EcoMarket!",
    "",
    "Bạn đã sẵn sàng để:",
    "- Khám phá sản phẩm cũ chất lượng",
    "- Đăng bán đồ không còn dùng",
    "- Nhắn tin trực tiếp với người mua/bán",
    "",
    `Khám phá sản phẩm ngay: ${normalizedCtaUrl}`,
    "",
    "Cảm ơn bạn đã tham gia cộng đồng sống xanh cùng EcoMarket.",
    "",
    "Trân trọng,",
    "Đội ngũ EcoMarket",
  ].join("\r\n");

  const htmlBody = `
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chào mừng bạn đến với EcoMarket</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,Helvetica,sans-serif;color:#2f3e46;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f6f8f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(45,106,106,0.12);">
            <tr>
              <td style="background:linear-gradient(135deg,#2d6a6a,#ff7b3d);padding:28px 24px;text-align:center;color:#ffffff;">
                <h1 style="margin:0;font-size:28px;line-height:1.3;">EcoMarket</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">Chợ đồ cũ xanh cho cộng đồng bền vững</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 14px;">
                <p style="margin:0 0 12px;font-size:18px;font-weight:700;">Xin chào ${safeRecipientNameHtml} 👋</p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">Cảm ơn bạn đã đăng ký tài khoản tại <strong>EcoMarket</strong>. Từ bây giờ, bạn có thể dễ dàng mua bán đồ cũ chất lượng và góp phần giảm rác thải cho môi trường.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 8px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fbfb;border:1px solid #e3ecec;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#2d6a6a;">Bạn đã sẵn sàng để:</p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">✅ Khám phá sản phẩm cũ chất lượng với giá tốt</p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">✅ Đăng bán món đồ không còn dùng</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;">✅ Nhắn tin trực tiếp với người mua / người bán</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 10px;text-align:center;">
                <a href="${safeCtaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2d6a6a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;line-height:1;padding:14px 22px;border-radius:999px;">Khám phá sản phẩm</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 28px;">
                <p style="margin:0;font-size:14px;line-height:1.7;">Chúc bạn có nhiều giao dịch hiệu quả và trải nghiệm tuyệt vời tại EcoMarket 💚</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3f6f6;padding:16px 24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#6b7f86;">Email này được gửi tự động sau khi bạn đăng ký tài khoản EcoMarket.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  await sendEmailViaSmtp({
    recipientEmail,
    subject,
    plainTextBody,
    htmlBody,
    category: "welcome",
  });
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
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, statusCode, body, contentType) {
  const cacheControl = statusCode >= 400 || contentType.startsWith("text/html")
    ? "no-store"
    : "public, max-age=31536000, immutable";

  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
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
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  await sql`
    INSERT INTO auth_sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt})
  `;

  return token;
}

async function getUserFromSessionToken(token) {
  if (!token) {
    return null;
  }

  const sessions = await sql`
    SELECT u.id, u.name, u.email, u.created_at AS joined_date
    FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `;

  return sessions[0] ?? null;
}

async function removeExpiredSignUpVerificationRequests() {
  await sql`
    DELETE FROM auth_signup_verifications
    WHERE expires_at <= NOW()
  `;
}

async function upsertSignUpVerificationRequest({
  email,
  name,
  passwordHash,
  codeHash,
  expiresAt,
}) {
  await sql`
    INSERT INTO auth_signup_verifications (
      email,
      name,
      password_hash,
      code_hash,
      attempt_count,
      expires_at,
      updated_at
    )
    VALUES (
      ${email},
      ${name},
      ${passwordHash},
      ${codeHash},
      0,
      ${expiresAt},
      NOW()
    )
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      code_hash = EXCLUDED.code_hash,
      attempt_count = 0,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;
}

async function getSignUpVerificationRequestByEmail(email) {
  const rows = await sql`
    SELECT email, name, password_hash, code_hash, attempt_count, expires_at
    FROM auth_signup_verifications
    WHERE email = ${email}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function deleteSignUpVerificationRequestByEmail(email) {
  await sql`
    DELETE FROM auth_signup_verifications
    WHERE email = ${email}
  `;
}

async function incrementSignUpVerificationAttempt(email) {
  const rows = await sql`
    UPDATE auth_signup_verifications
    SET attempt_count = attempt_count + 1, updated_at = NOW()
    WHERE email = ${email}
    RETURNING attempt_count
  `;

  return Number(rows[0]?.attempt_count ?? 0);
}

function hasVerificationExpired(expiresAtValue) {
  return new Date(expiresAtValue).getTime() <= Date.now();
}

function normalizeImageUrls(imageUrls) {
  if (typeof imageUrls === "string") {
    try {
      const parsed = JSON.parse(imageUrls);
      return normalizeImageUrls(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(imageUrls)) {
    return [];
  }

  return imageUrls
    .map((imageUrl) => String(imageUrl).trim())
    .filter(
      (imageUrl) =>
        imageUrl.startsWith("http://") || imageUrl.startsWith("https://"),
    );
}

function mapProductRow(productRow) {
  const imageUrls = normalizeImageUrls(productRow.image_urls);
  const fallbackImageUrl =
    "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=1200&q=80";

  return {
    id: String(productRow.id),
    name: productRow.name,
    price: Number(productRow.price),
    image: imageUrls[0] ?? fallbackImageUrl,
    images: imageUrls,
    category: productRow.category,
    description: productRow.description,
    condition: productRow.item_condition,
    size: productRow.size,
    brand: productRow.brand,
    location: productRow.location,
    seller: {
      id: String(productRow.seller_id),
      name: productRow.seller_name,
      email: productRow.seller_email,
      joinedDate: productRow.seller_joined_date,
    },
    postedDate: productRow.created_at,
    views: Number(productRow.views ?? 0),
    status: productRow.status ?? "available",
  };
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

  if (!isValidEmailAddress(email)) {
    sendJson(res, 400, {
      success: false,
      message: "Email không hợp lệ.",
    });
    return;
  }

  if (!email.endsWith(allowedSignUpEmailDomain)) {
    sendJson(res, 400, {
      success: false,
      message: "Bạn phải sử dụng email phù hợp để đăng kí",
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

  const verificationCode = generateSignUpVerificationCode();
  // console.log("[CODE]: ", verificationCode);
  const verificationCodeHash = hashSignUpVerificationCode(email, verificationCode);
  const passwordHash = await hashPassword(password);
  const name = buildDisplayNameFromEmail(email);
  const expiresAt = new Date(
    Date.now() + signUpVerificationCodeLifetimeMs,
  ).toISOString();

  await removeExpiredSignUpVerificationRequests();
  await upsertSignUpVerificationRequest({
    email,
    name,
    passwordHash,
    codeHash: verificationCodeHash,
    expiresAt,
  });

  try {
    await sendSignUpVerificationCodeEmail({
      recipientEmail: email,
      recipientName: name,
      verificationCode,
    });
  } catch (error) {
    console.error(
      `[email] Failed to send signup verification code to ${maskEmailAddress(
        email,
      )}:`,
      error,
    );
    sendJson(res, 500, {
      success: false,
      message: "Không thể gửi mã xác thực. Vui lòng thử lại sau.",
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    message: `Mã xác thực đã được gửi đến email của bạn. Mã có hiệu lực trong ${signUpVerificationCodeLifetimeMinutes} phút.`,
    expiresInSeconds: Math.floor(signUpVerificationCodeLifetimeMs / 1000),
  });
}

async function handleVerifySignUpCode(req, res) {
  const payload = await readJsonBody(req);
  const email = normalizeEmail(payload.email);
  const verificationCode = normalizeVerificationCode(payload.code);

  if (!email || !verificationCode) {
    sendJson(res, 400, {
      success: false,
      message: "Email và mã xác thực là bắt buộc.",
    });
    return;
  }

  if (!isValidEmailAddress(email)) {
    sendJson(res, 400, {
      success: false,
      message: "Email không hợp lệ.",
    });
    return;
  }

  if (!/^\d+$/.test(verificationCode) || verificationCode.length !== signUpVerificationCodeLength) {
    sendJson(res, 400, {
      success: false,
      message: `Mã xác thực phải gồm ${signUpVerificationCodeLength} chữ số.`,
    });
    return;
  }

  const existingUsers = await sql`
    SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
  `;

  if (existingUsers.length > 0) {
    await deleteSignUpVerificationRequestByEmail(email);
    sendJson(res, 409, {
      success: false,
      message: "Email này đã được sử dụng.",
    });
    return;
  }

  await removeExpiredSignUpVerificationRequests();
  const verificationRequest = await getSignUpVerificationRequestByEmail(email);

  if (!verificationRequest) {
    sendJson(res, 400, {
      success: false,
      message: "Không tìm thấy yêu cầu xác thực hoặc mã đã hết hạn. Vui lòng đăng ký lại.",
    });
    return;
  }

  if (hasVerificationExpired(verificationRequest.expires_at)) {
    await deleteSignUpVerificationRequestByEmail(email);
    sendJson(res, 400, {
      success: false,
      message: "Mã xác thực đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.",
    });
    return;
  }

  const expectedCodeHash = String(verificationRequest.code_hash);
  const providedCodeHash = hashSignUpVerificationCode(email, verificationCode);
  const expectedCodeHashBuffer = Buffer.from(expectedCodeHash, "utf8");
  const providedCodeHashBuffer = Buffer.from(providedCodeHash, "utf8");
  const isValidCode =
    expectedCodeHashBuffer.length === providedCodeHashBuffer.length &&
    timingSafeEqual(expectedCodeHashBuffer, providedCodeHashBuffer);

  if (!isValidCode) {
    const attemptCount = await incrementSignUpVerificationAttempt(email);
    if (attemptCount >= maxSignUpVerificationAttempts) {
      await deleteSignUpVerificationRequestByEmail(email);
      sendJson(res, 400, {
        success: false,
        message:
          "Mã xác thực không đúng quá nhiều lần. Vui lòng đăng ký lại để nhận mã mới.",
      });
      return;
    }

    sendJson(res, 400, {
      success: false,
      message: "Mã xác thực không đúng.",
    });
    return;
  }

  let insertedUsers;
  try {
    insertedUsers = await sql`
      INSERT INTO auth_users (name, email, password_hash)
      VALUES (
        ${verificationRequest.name},
        ${email},
        ${verificationRequest.password_hash}
      )
      RETURNING id, name, email, created_at AS joined_date
    `;
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      await deleteSignUpVerificationRequestByEmail(email);
      sendJson(res, 409, {
        success: false,
        message: "Email này đã được sử dụng.",
      });
      return;
    }

    throw error;
  }

  const user = insertedUsers[0];
  const token = await createSession(user.id);
  await deleteSignUpVerificationRequestByEmail(email);

  console.info(
    `[auth] Signup verified for ${maskEmailAddress(
      user.email,
    )}; triggering welcome email.`,
  );

  try {
    await sendWelcomeEmail({
      recipientEmail: user.email,
      recipientName: user.name,
    });
  } catch (error) {
    console.error(
      `[email] Failed to send welcome email to ${maskEmailAddress(user.email)}:`,
      error,
    );
  }

  sendJson(res, 201, {
    success: true,
    message: "Xác thực thành công! Tài khoản đã được tạo.",
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
    SELECT id, name, email, password_hash, created_at AS joined_date
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
    SELECT u.id, u.name, u.email, u.created_at AS joined_date
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

async function handleCreateUploadUrl(req, res) {
  if (!hasS3Configuration()) {
    sendJson(res, 500, {
      success: false,
      message: "S3 chưa được cấu hình đầy đủ trên máy chủ.",
    });
    return;
  }

  const payload = await readJsonBody(req);
  const fileName = String(payload.fileName ?? "").trim();
  const fileType = String(payload.fileType ?? "")
    .trim()
    .toLowerCase();

  if (!fileName || !fileType) {
    sendJson(res, 400, {
      success: false,
      message: "Thiếu fileName hoặc fileType.",
    });
    return;
  }

  if (!allowedUploadContentTypes.has(fileType)) {
    sendJson(res, 400, {
      success: false,
      message: "Định dạng ảnh không hỗ trợ. Chỉ chấp nhận JPG, PNG hoặc WEBP.",
    });
    return;
  }

  const safeFileName = sanitizeFileName(fileName);
  const dateFolder = new Date().toISOString().slice(0, 10);
  const objectKey = [
    s3UploadKeyPrefix,
    dateFolder,
    `${randomUUID()}-${safeFileName}`,
  ]
    .filter(Boolean)
    .join("/");

  const uploadUrl = buildPresignedS3PutUrl({
    objectKey,
    expiresInSeconds: maxUploadUrlExpiresInSeconds,
  });
  const fileUrl = buildS3ObjectUrl(objectKey);

  sendJson(res, 200, {
    success: true,
    data: {
      key: objectKey,
      uploadUrl,
      fileUrl,
      expiresInSeconds: maxUploadUrlExpiresInSeconds,
    },
  });
}

async function handleCreateProductListing(req, res) {
  const payload = await readJsonBody(req);
  const token = getTokenFromRequest(req, payload);

  if (!token) {
    sendJson(res, 401, {
      success: false,
      message: "Thiếu token phiên đăng nhập.",
    });
    return;
  }

  const user = await getUserFromSessionToken(token);

  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
    return;
  }

  const name = String(payload.name ?? "").trim();
  const category = String(payload.category ?? "").trim();
  const condition = String(payload.condition ?? "").trim();
  const location = String(payload.location ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const size = String(payload.size ?? "").trim() || null;
  const brand = String(payload.brand ?? "").trim() || null;
  const price = Number(payload.price);
  const imageUrls = normalizeImageUrls(payload.imageUrls);

  if (!name || !category || !location || !description) {
    sendJson(res, 400, {
      success: false,
      message: "Thiếu thông tin bắt buộc của tin đăng.",
    });
    return;
  }

  if (!validListingConditions.has(condition)) {
    sendJson(res, 400, {
      success: false,
      message: "Tình trạng sản phẩm không hợp lệ.",
    });
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    sendJson(res, 400, {
      success: false,
      message: "Giá bán không hợp lệ.",
    });
    return;
  }

  if (imageUrls.length === 0) {
    sendJson(res, 400, {
      success: false,
      message: "Tin đăng cần tối thiểu 1 hình ảnh.",
    });
    return;
  }

  if (imageUrls.length > 10) {
    sendJson(res, 400, {
      success: false,
      message: "Tin đăng tối đa 10 hình ảnh.",
    });
    return;
  }

  const insertRows = await sql`
    INSERT INTO products (
      created_by_user_id,
      name,
      category,
      item_condition,
      price,
      location,
      description,
      size,
      brand,
      image_urls
    )
    VALUES (
      ${user.id},
      ${name},
      ${category},
      ${condition},
      ${Math.round(price)},
      ${location},
      ${description},
      ${size},
      ${brand},
      ${JSON.stringify(imageUrls)}::jsonb
    )
    RETURNING id, created_at
  `;

  const listing = insertRows[0];

  sendJson(res, 201, {
    success: true,
    message: "Đăng tin thành công.",
    data: {
      id: String(listing.id),
      createdAt: listing.created_at,
    },
  });
}

async function handleGetProducts(req, res) {
  const rows = await sql`
    SELECT
      p.id,
      p.name,
      p.price,
      p.category,
      p.description,
      p.item_condition,
      p.size,
      p.brand,
      p.location,
      p.image_urls,
      p.views,
      p.status,
      p.created_at,
      u.id AS seller_id,
      u.name AS seller_name,
      u.email AS seller_email,
      u.created_at AS seller_joined_date
    FROM products p
    JOIN auth_users u ON u.id = p.created_by_user_id
    WHERE p.status = 'available'
    ORDER BY p.created_at DESC
  `;

  sendJson(res, 200, {
    success: true,
    data: rows.map(mapProductRow),
  });
}

async function handleGetMyProducts(req, res) {
  const token = getTokenFromRequest(req);

  if (!token) {
    sendJson(res, 401, {
      success: false,
      message: "Thiếu token phiên đăng nhập.",
    });
    return;
  }

  const user = await getUserFromSessionToken(token);

  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
    return;
  }

  const rows = await sql`
    SELECT
      p.id,
      p.name,
      p.price,
      p.category,
      p.description,
      p.item_condition,
      p.size,
      p.brand,
      p.location,
      p.image_urls,
      p.views,
      p.status,
      p.created_at,
      u.id AS seller_id,
      u.name AS seller_name,
      u.email AS seller_email,
      u.created_at AS seller_joined_date
    FROM products p
    JOIN auth_users u ON u.id = p.created_by_user_id
    WHERE p.created_by_user_id = ${user.id}
    ORDER BY p.created_at DESC
  `;

  sendJson(res, 200, {
    success: true,
    data: rows.map(mapProductRow),
  });
}

async function handleGetProductById(req, res, productId) {
  if (!/^\d+$/.test(productId)) {
    sendJson(res, 400, {
      success: false,
      message: "Mã sản phẩm không hợp lệ.",
    });
    return;
  }

  const rows = await sql`
    SELECT
      p.id,
      p.name,
      p.price,
      p.category,
      p.description,
      p.item_condition,
      p.size,
      p.brand,
      p.location,
      p.image_urls,
      p.views,
      p.status,
      p.created_at,
      u.id AS seller_id,
      u.name AS seller_name,
      u.email AS seller_email,
      u.created_at AS seller_joined_date
    FROM products p
    JOIN auth_users u ON u.id = p.created_by_user_id
    WHERE p.id = ${Number(productId)}
    LIMIT 1
  `;

  const product = rows[0];

  if (!product) {
    sendJson(res, 404, {
      success: false,
      message: "Không tìm thấy sản phẩm.",
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    data: mapProductRow(product),
  });
}

async function handleUpdateProductListing(req, res, productId) {
  const payload = await readJsonBody(req);
  const token = getTokenFromRequest(req, payload);

  if (!token) {
    sendJson(res, 401, {
      success: false,
      message: "Thiếu token phiên đăng nhập.",
    });
    return;
  }

  const user = await getUserFromSessionToken(token);

  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
    return;
  }

  if (!/^\d+$/.test(productId)) {
    sendJson(res, 400, {
      success: false,
      message: "Mã sản phẩm không hợp lệ.",
    });
    return;
  }

  const numericProductId = Number(productId);
  const existingRows = await sql`
    SELECT id, created_by_user_id, status
    FROM products
    WHERE id = ${numericProductId}
    LIMIT 1
  `;
  const existingProduct = existingRows[0];

  if (!existingProduct) {
    sendJson(res, 404, {
      success: false,
      message: "Không tìm thấy sản phẩm.",
    });
    return;
  }

  if (existingProduct.created_by_user_id !== user.id) {
    sendJson(res, 403, {
      success: false,
      message: "Bạn không có quyền thực hiện thao tác này.",
    });
    return;
  }

  if (existingProduct.status !== "available") {
    sendJson(res, 400, {
      success: false,
      message: "Chỉ có thể chỉnh sửa tin đăng chưa bán.",
    });
    return;
  }

  const name = String(payload.name ?? "").trim();
  const category = String(payload.category ?? "").trim();
  const condition = String(payload.condition ?? "").trim();
  const location = String(payload.location ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const size = String(payload.size ?? "").trim() || null;
  const brand = String(payload.brand ?? "").trim() || null;
  const price = Number(payload.price);
  const imageUrls = normalizeImageUrls(payload.imageUrls);

  if (!name || !category || !location || !description) {
    sendJson(res, 400, {
      success: false,
      message: "Thiếu thông tin bắt buộc của tin đăng.",
    });
    return;
  }

  if (!validListingConditions.has(condition)) {
    sendJson(res, 400, {
      success: false,
      message: "Tình trạng sản phẩm không hợp lệ.",
    });
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    sendJson(res, 400, {
      success: false,
      message: "Giá bán không hợp lệ.",
    });
    return;
  }

  if (imageUrls.length === 0) {
    sendJson(res, 400, {
      success: false,
      message: "Tin đăng cần tối thiểu 1 hình ảnh.",
    });
    return;
  }

  if (imageUrls.length > 10) {
    sendJson(res, 400, {
      success: false,
      message: "Tin đăng tối đa 10 hình ảnh.",
    });
    return;
  }

  const updatedRows = await sql`
    UPDATE products
    SET
      name = ${name},
      category = ${category},
      item_condition = ${condition},
      price = ${Math.round(price)},
      location = ${location},
      description = ${description},
      size = ${size},
      brand = ${brand},
      image_urls = ${JSON.stringify(imageUrls)}::jsonb
    WHERE id = ${numericProductId}
    RETURNING
      id,
      name,
      price,
      category,
      description,
      item_condition,
      size,
      brand,
      location,
      image_urls,
      views,
      status,
      created_at
  `;
  const updatedProduct = updatedRows[0];

  sendJson(res, 200, {
    success: true,
    message: "Cập nhật tin đăng thành công.",
    data: mapProductRow({
      ...updatedProduct,
      seller_id: user.id,
      seller_name: user.name,
      seller_email: user.email,
      seller_joined_date: user.joined_date,
    }),
  });
}

async function handleMarkProductAsSold(req, res, productId) {
  const token = getTokenFromRequest(req);

  if (!token) {
    sendJson(res, 401, {
      success: false,
      message: "Thiếu token phiên đăng nhập.",
    });
    return;
  }

  const user = await getUserFromSessionToken(token);

  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
    return;
  }

  if (!/^\d+$/.test(productId)) {
    sendJson(res, 400, {
      success: false,
      message: "Mã sản phẩm không hợp lệ.",
    });
    return;
  }

  const numericProductId = Number(productId);

  const rows = await sql`
    SELECT id, created_by_user_id
    FROM products
    WHERE id = ${numericProductId}
    LIMIT 1
  `;

  const product = rows[0];

  if (!product) {
    sendJson(res, 404, {
      success: false,
      message: "Không tìm thấy sản phẩm.",
    });
    return;
  }

  if (product.created_by_user_id !== user.id) {
    sendJson(res, 403, {
      success: false,
      message: "Bạn không có quyền thực hiện thao tác này.",
    });
    return;
  }

  const updated = await sql`
    UPDATE products
    SET status = 'sold'
    WHERE id = ${numericProductId}
    RETURNING id, status
  `;

  sendJson(res, 200, {
    success: true,
    message: "Đã đánh dấu sản phẩm là đã bán.",
    data: updated[0],
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
  const unavailableReason = getDatabaseUnavailableReason();

  if (!isDatabaseReady()) {
    return {
      status: "down",
      latencyMs: Number((performance.now() - dbStartedAt).toFixed(2)),
      error: unavailableReason ?? "Database is unavailable.",
      writeCheck: {
        status: "failed",
      },
    };
  }

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
  const isHealthy =
    systemHealth.status === "up" && databaseHealth.status === "up";

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
        "text/plain; charset=utf-8",
      );
    }
  }
}

await initializeDatabase();
logWelcomeEmailConfigurationOnStartup();

export async function requestHandler(req, res, options = {}) {
  const { serveStatic = true, pathNameOverride = null } = options;
  const method = req.method ?? "GET";
  const requestUrl = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );
  const rawPathName = pathNameOverride ?? requestUrl.pathname;
  const pathName =
    !serveStatic && !rawPathName.startsWith("/api/")
      ? `/api${rawPathName === "/" ? "" : rawPathName}`
      : rawPathName;

  if (method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (
    pathName.startsWith("/api/") &&
    pathName !== "/api/health" &&
    !isDatabaseReady()
  ) {
    sendJson(res, 503, {
      success: false,
      message: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
      error: getDatabaseUnavailableReason(),
    });
    return;
  }

  try {
    if (method === "POST" && pathName === "/api/auth/sign-up") {
      await handleSignUp(req, res);
      return;
    }

    if (
      method === "POST" &&
      (pathName === "/api/auth/sign-up/verify" ||
        pathName === "/api/auth/signup/verify")
    ) {
      await handleVerifySignUpCode(req, res);
      return;
    }

    if (
      method === "POST" &&
      (pathName === "/api/auth/sign-in" || pathName === "/api/auth/login")
    ) {
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

    if (
      method === "POST" &&
      (pathName === "/api/uploads" || pathName === "/api/uploads/presign")
    ) {
      await handleCreateUploadUrl(req, res);
      return;
    }

    if (method === "GET" && pathName === "/api/products/mine") {
      await handleGetMyProducts(req, res);
      return;
    }

    if (method === "GET" && pathName === "/api/products") {
      await handleGetProducts(req, res);
      return;
    }

    if (method === "GET" && pathName.startsWith("/api/products/")) {
      const productId = pathName.slice("/api/products/".length).trim();
      if (/^\d+$/.test(productId)) {
        await handleGetProductById(req, res, productId);
        return;
      }
    }

    if (method === "PATCH" && pathName.startsWith("/api/products/")) {
      const parts = pathName.split("/");
      // /api/products/:id/sold
      if (parts.length === 5 && parts[4] === "sold") {
        const productId = parts[3];
        await handleMarkProductAsSold(req, res, productId);
        return;
      }

      // /api/products/:id
      if (parts.length === 4 && /^\d+$/.test(parts[3])) {
        const productId = parts[3];
        await handleUpdateProductListing(req, res, productId);
        return;
      }
    }

    if (
      method === "POST" &&
      (pathName === "/api/products" || pathName === "/api/listings")
    ) {
      await handleCreateProductListing(req, res);
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

    if (!serveStatic) {
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
}

const isRunAsEntry =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isRunAsEntry) {
  const server = http.createServer((req, res) => {
    void requestHandler(req, res);
  });

  server.listen(port, host, () => {
    console.log(`App server running at http://${host}:${port}`);
  });
}
