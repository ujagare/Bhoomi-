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

function buildOwnerEmail(submission, req) {
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
    "New Bhoomi Constructions website enquiry",
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

  const html = buildEmailShell({
    eyebrow: "New Project Enquiry",
    title: safe.service,
    intro: "A new enquiry was submitted through the Bhoomi Constructions website.",
    body: `
      ${detailGrid([
        ["Name", safe.name],
        ["Phone", safe.phone],
        ["Email", safe.email || "Not provided"],
        ["Service", safe.service],
        ["Page", safe.pageUrl || "Not available"],
        ["Submitted", escapeHtml(submittedAt)],
      ])}
      <div style="margin-top: 24px; padding: 22px; border: 1px solid #e7edf3; border-radius: 14px; background: #f8fafc;">
        <div style="font-size: 12px; font-weight: 800; letter-spacing: .08em; color: #d21f2b; text-transform: uppercase; margin-bottom: 10px;">Client Message</div>
        <div style="font-size: 16px; line-height: 1.7; color: #17202a; white-space: pre-wrap;">${escapeHtml(submission.message)}</div>
      </div>
      <div style="margin-top: 22px; font-size: 13px; color: #6b7280;">IP: ${escapeHtml(ip)}</div>
    `,
  });

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

function buildAutoReplyEmail(submission) {
  if (!submission.email) {
    return null;
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    "Bhoomi Website <website@bhoomigunitingwork.com>";
  const safe = Object.fromEntries(
    Object.entries(submission).map(([key, value]) => [key, escapeHtml(value)]),
  );
  const text = [
    `Dear ${submission.name},`,
    "",
    "Thank you for contacting Bhoomi Constructions. We have received your enquiry and our team will review it shortly.",
    "",
    `Service: ${submission.service}`,
    `Phone: ${submission.phone}`,
    "",
    "For urgent assistance, call 9890174374 or 9561274374.",
    "",
    "Regards,",
    "Bhoomi Constructions",
  ].join("\n");
  const html = buildEmailShell({
    eyebrow: "Enquiry Received",
    title: `Thank you, ${safe.name}`,
    intro: "Your enquiry has reached Bhoomi Constructions. Our team will review your requirement and get back to you shortly.",
    body: `
      ${detailGrid([
        ["Service", safe.service],
        ["Phone", safe.phone],
        ["Email", safe.email],
      ])}
      <div style="margin-top: 24px; padding: 22px; border-radius: 14px; background: #fff7f7; border: 1px solid #ffd7dc;">
        <div style="font-size: 15px; line-height: 1.7; color: #17202a;">
          For urgent project assistance, call <strong>9890174374</strong> or <strong>9561274374</strong>.
        </div>
      </div>
    `,
  });

  return {
    from: fromEmail,
    to: [submission.email],
    subject: "We received your enquiry - Bhoomi Constructions",
    html,
    text,
    tags: [{ name: "source", value: "contact_form_auto_reply" }],
  };
}

function detailGrid(items) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
      ${items
        .map(
          ([label, value]) => `
            <tr>
              <td style="width: 34%; padding: 14px 16px; border: 1px solid #e7edf3; border-right: 0; border-radius: 12px 0 0 12px; background: #f8fafc; font-size: 12px; font-weight: 800; letter-spacing: .06em; color: #6b7280; text-transform: uppercase;">${label}</td>
              <td style="padding: 14px 16px; border: 1px solid #e7edf3; border-left: 0; border-radius: 0 12px 12px 0; background: #ffffff; font-size: 15px; font-weight: 700; color: #17202a;">${value}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
}

function buildEmailShell({ eyebrow, title, intro, body }) {
  return `
    <div style="margin: 0; padding: 0; background: #eef2f6; font-family: Arial, Helvetica, sans-serif; color: #17202a;">
      <div style="max-width: 680px; margin: 0 auto; padding: 28px 16px;">
        <div style="overflow: hidden; border-radius: 22px; background: #ffffff; box-shadow: 0 18px 45px rgba(15, 23, 42, .12);">
          <div style="padding: 30px 32px; background: #111827;">
            <div style="font-size: 13px; font-weight: 800; letter-spacing: .12em; color: #ffb4bc; text-transform: uppercase;">${eyebrow}</div>
            <h1 style="margin: 12px 0 0; font-size: 30px; line-height: 1.18; color: #ffffff;">${title}</h1>
            <p style="margin: 14px 0 0; font-size: 15px; line-height: 1.7; color: #d8dee9;">${intro}</p>
          </div>
          <div style="padding: 30px 32px;">
            ${body}
          </div>
          <div style="padding: 22px 32px; background: #f8fafc; border-top: 1px solid #e7edf3;">
            <div style="font-size: 18px; font-weight: 800; color: #17202a;">Bhoomi Constructions</div>
            <div style="margin-top: 8px; font-size: 14px; line-height: 1.7; color: #5b6472;">
              Guniting Work, Rockfall Protection and Civil Construction<br>
              29/503 Rambaug Colony, Paud Road, Kothrud, Pune - 411038<br>
              <strong>Phone:</strong> 9890174374 / 9561274374<br>
              <strong>Email:</strong> info@bhoomigunitingwork.com
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function sendResendEmail(apiKey, payload, label) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "bhoomi-contact-form/1.0",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`${label} email could not be sent.`);
    error.code = "EMAIL_SEND_FAILED";
    error.status = response.status;
    error.detail = errorText;
    console.error(`${label} email failed:`, response.status, errorText);
    throw error;
  }

  return response.json().catch(() => ({}));
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

function buildSupabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function saveContactMessage(submission, req) {
  const config = getSupabaseConfig();
  const endpoint = `${config.url}/rest/v1/${encodeURIComponent(config.table)}`;
  const basePayload = {
    name: submission.name,
    email: submission.email || null,
    phone: submission.phone,
    service: submission.service,
    message: submission.message,
  };
  const payload = {
    ...basePayload,
    page_url: submission.pageUrl || null,
    user_agent: cleanText(req.headers["user-agent"], 500) || null,
  };
  let response = await fetch(endpoint, {
    method: "POST",
    headers: buildSupabaseHeaders(config.key),
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status === 400) {
    const firstErrorText = await response.text();
    console.warn("Supabase insert failed with full payload; retrying minimal payload:", firstErrorText);
    response = await fetch(endpoint, {
      method: "POST",
      headers: buildSupabaseHeaders(config.key),
      body: JSON.stringify(basePayload),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Supabase insert failed: ${response.status}`);
    error.code = "SUPABASE_INSERT_FAILED";
    error.status = response.status;
    error.detail = errorText;
    console.error("Supabase insert failed:", response.status, errorText);
    throw error;
  }

  const rows = await response.json().catch(() => []);
  const savedRow = Array.isArray(rows) ? rows[0] : null;

  if (!savedRow || !savedRow.id) {
    const error = new Error("Supabase insert did not return a saved row.");
    error.code = "SUPABASE_INSERT_NOT_CONFIRMED";
    console.error("Supabase insert did not return a saved row:", rows);
    throw error;
  }

  return { saved: true, id: savedRow.id };
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
      status: error.status || null,
      message: "Contact request could not be saved.",
    });
  }

  try {
    await sendResendEmail(apiKey, buildOwnerEmail(result.submission, req), "Owner notification");

    let autoReplySent = false;
    const autoReplyPayload = buildAutoReplyEmail(result.submission);
    if (autoReplyPayload) {
      await sendResendEmail(apiKey, autoReplyPayload, "Auto-reply");
      autoReplySent = true;
    }

    return sendJson(res, 200, {
      ok: true,
      saved: saveResult.saved,
      contactMessageId: saveResult.id,
      autoReplySent,
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return sendJson(res, 502, {
      ok: false,
      code: error.code || "EMAIL_SEND_FAILED",
      message: "Contact request could not be saved or sent.",
    });
  }
};
