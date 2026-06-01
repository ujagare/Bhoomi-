const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_BODY_BYTES = 10 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map();

const allowedServices = new Set([
  "Guniting Work",
  "Bungalow Construction",
  "Rockfall Protection",
]);

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanMessage(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .slice(0, 2000);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  return /^[+()\d\s-]{7,20}$/.test(value);
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket && req.socket.remoteAddress
    ? req.socket.remoteAddress
    : "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    const requestHost = req.headers.host;
    const extraOrigins = String(process.env.CONTACT_ALLOWED_ORIGINS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return (
      originHost === requestHost ||
      extraOrigins.some((allowedOrigin) => {
        try {
          return new URL(allowedOrigin).origin === new URL(origin).origin;
        } catch {
          return false;
        }
      })
    );
  } catch {
    return false;
  }
}

async function readRequestBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString("utf8"));
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function validateSubmission(body) {
  const submission = {
    name: cleanText(body.name, 120),
    email: cleanText(body.email, 180),
    phone: cleanText(body.phone, 40),
    service: cleanText(body.service, 120),
    message: cleanMessage(body.message),
    pageUrl: cleanText(body.page_url, 500),
  };

  if (cleanText(body.website, 120)) {
    return { isSpam: true };
  }

  if (!submission.name || !submission.phone || !submission.service || !submission.message) {
    return { error: "Please fill all required fields." };
  }

  if (submission.email && !isEmail(submission.email)) {
    return { error: "Please enter a valid email address." };
  }

  if (!isPhone(submission.phone)) {
    return { error: "Please enter a valid phone number." };
  }

  if (!allowedServices.has(submission.service)) {
    return { error: "Please select a valid service." };
  }

  return { submission };
}

function buildEmail(submission, req) {
  const recipientEmail = process.env.CONTACT_TO_EMAIL || "info@bhoomigunitingwork.com";
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    "Bhoomi Website <website@bhoomigunitingwork.com>";
  const safe = Object.fromEntries(
    Object.entries(submission).map(([key, value]) => [key, escapeHtml(value)]),
  );
  const submittedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  const ip = getClientIp(req);

  const text = [
    "New website enquiry",
    "",
    `Name: ${submission.name}`,
    `Email: ${submission.email || "Not provided"}`,
    `Phone: ${submission.phone}`,
    `Service: ${submission.service}`,
    "",
    "Message:",
    submission.message,
    "",
    `Page: ${submission.pageUrl || "Not available"}`,
    `Submitted at: ${submittedAt}`,
    `IP: ${ip}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #17202a; line-height: 1.5;">
      <h2 style="margin: 0 0 16px;">New website enquiry</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><td><strong>Name</strong></td><td>${safe.name}</td></tr>
        <tr><td><strong>Email</strong></td><td>${safe.email || "Not provided"}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${safe.phone}</td></tr>
        <tr><td><strong>Service</strong></td><td>${safe.service}</td></tr>
        <tr><td><strong>Page</strong></td><td>${safe.pageUrl || "Not available"}</td></tr>
        <tr><td><strong>Submitted at</strong></td><td>${escapeHtml(submittedAt)}</td></tr>
      </table>
      <h3 style="margin: 20px 0 8px;">Message</h3>
      <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(submission.message)}</p>
    </div>
  `;

  const payload = {
    from: fromEmail,
    to: [recipientEmail],
    subject: `Website enquiry: ${submission.service} - ${submission.name}`,
    html,
    text,
    tags: [{ name: "source", value: "contact_form" }],
  };

  if (submission.email) {
    payload.reply_to = submission.email;
  }

  return payload;
}

function firstEnv(names) {
  for (const name of names) {
    const value = process.env[name];

    if (value && String(value).trim()) {
      return cleanEnvValue(value, names);
    }
  }

  return "";
}

function cleanEnvValue(value, names) {
  let cleaned = String(value).trim();

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  for (const name of names) {
    const prefix = `${name}=`;

    if (cleaned.startsWith(prefix)) {
      return cleaned.slice(prefix.length).trim();
    }
  }

  return cleaned;
}

function getSupabaseConfig() {
  const url = firstEnv([
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "VITE_SUPABASE_URL",
  ]).replace(/\/+$/, "");
  const serviceRoleKey = firstEnv([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ]);
  const publishableKey = firstEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  ]);
  const table =
    firstEnv(["SUPABASE_CONTACT_TABLE"]) || "contact_messages";
  const key = serviceRoleKey || publishableKey;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_PUBLISHABLE_KEY in Vercel, then redeploy.",
    );
  }

  if (!/^[A-Za-z0-9_]+$/.test(table)) {
    throw new Error(
      "Invalid Supabase contact table name. Set SUPABASE_CONTACT_TABLE to contact_messages.",
    );
  }

  return { url, key, table, usesServiceRole: Boolean(serviceRoleKey) };
}

async function saveContactMessage(submission, req) {
  const config = getSupabaseConfig();

  const payload = {
    name: submission.name,
    email: submission.email || null,
    phone: submission.phone,
    service: submission.service,
    message: submission.message,
    page_url: submission.pageUrl || null,
    user_agent: cleanText(req.headers["user-agent"], 500) || null,
  };
  const response = await fetch(
    `${config.url}/rest/v1/${encodeURIComponent(config.table)}`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Supabase insert failed: ${response.status}`);
    error.code = "SUPABASE_INSERT_FAILED";
    error.status = response.status;
    error.detail = errorText;
    console.error("Supabase insert failed:", response.status, errorText);
    throw error;
  }

  return { saved: true };
}

module.exports = async function contactHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { ok: false, message: "Method not allowed." });
  }

  if (!isAllowedOrigin(req)) {
    return sendJson(res, 403, { ok: false, message: "Request blocked." });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.setHeader("Retry-After", String(RATE_LIMIT_WINDOW_MS / 1000));
    return sendJson(res, 429, {
      ok: false,
      message: "Too many requests. Please try again later.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Missing RESEND_API_KEY environment variable.");
    return sendJson(res, 500, {
      ok: false,
      message: "Email service is not configured.",
    });
  }

  let body;
  try {
    body = await readRequestBody(req);
  } catch (error) {
    const statusCode = error.message === "REQUEST_TOO_LARGE" ? 413 : 400;
    return sendJson(res, statusCode, {
      ok: false,
      message: "Invalid request.",
    });
  }

  const result = validateSubmission(body);
  if (result.isSpam) {
    return sendJson(res, 200, { ok: true });
  }
  if (result.error) {
    return sendJson(res, 400, { ok: false, message: result.error });
  }

  let saveResult;
  try {
    saveResult = await saveContactMessage(result.submission, req);
  } catch (error) {
    console.error("Contact form save error:", {
      code: error.code || "SUPABASE_SAVE_ERROR",
      status: error.status || null,
      message: error.message,
      detail: error.detail || null,
    });
    return sendJson(res, 502, {
      ok: false,
      code: error.code || "SUPABASE_SAVE_ERROR",
      message: "Contact request could not be saved.",
    });
  }

  try {
    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "bhoomi-contact-form/1.0",
      },
      body: JSON.stringify(buildEmail(result.submission, req)),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend email failed:", resendResponse.status, errorText);
      return sendJson(res, 502, {
        ok: false,
        code: "EMAIL_SEND_FAILED",
        message: "Email could not be sent.",
      });
    }

    return sendJson(res, 200, { ok: true, saved: saveResult.saved });
  } catch (error) {
    console.error("Contact form error:", error);
    return sendJson(res, 502, {
      ok: false,
      code: "EMAIL_SEND_FAILED",
      message: "Contact request could not be saved or sent.",
    });
  }
};
