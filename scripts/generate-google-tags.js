const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");

const htmlFiles = [
  "index.html",
  "about.html",
  "service.html",
  "project.html",
  "gallery.html",
  "guniting-work.html",
  "rockfall-protection.html",
  "slope-stabilization.html",
  "rock-anchoring.html",
  "bungalow-construction.html",
  "contact.html",
  "about/index.html",
  "service/index.html",
  "project/index.html",
  "gallary.html",
  "gallary/index.html",
  "contact/index.html",
];

const headStart = "<!-- Google integrations: head start -->";
const headEnd = "<!-- Google integrations: head end -->";
const bodyStart = "<!-- Google Tag Manager: noscript start -->";
const bodyEnd = "<!-- Google Tag Manager: noscript end -->";

function loadEnvFile(fileName) {
  const envPath = path.join(rootDir, fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function firstEnv(names) {
  for (const name of names) {
    const value = process.env[name];

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJavaScriptString(value) {
  return JSON.stringify(value).slice(1, -1);
}

function isPlaceholder(value) {
  return /^(REPLACE_|YOUR_|G-[X]+|GT-[X]+|GTM-[X]+|UA-[X]+|AW-[X]+|DC-[X]+)/i.test(
    value,
  );
}

function validAnalyticsId(value) {
  return /^(G|GT|AW|DC)-[A-Z0-9-]+$/i.test(value) && !isPlaceholder(value);
}

function validTagManagerId(value) {
  return /^GTM-[A-Z0-9]+$/i.test(value) && !isPlaceholder(value);
}

function validVerificationToken(value) {
  return Boolean(value) && !isPlaceholder(value) && !/[<>]/.test(value);
}

const verificationToken = firstEnv([
  "GOOGLE_SITE_VERIFICATION",
  "GOOGLE_SEARCH_CONSOLE_VERIFICATION",
  "GOOGLE_SEARCH_CONSOLE_VERIFICATION_TOKEN",
]);

const analyticsId = firstEnv([
  "GOOGLE_ANALYTICS_ID",
  "GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_GOOGLE_ANALYTICS_ID",
  "VITE_GOOGLE_ANALYTICS_ID",
]);

const tagManagerId = firstEnv([
  "GOOGLE_TAG_MANAGER_ID",
  "GTM_ID",
  "NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID",
  "VITE_GOOGLE_TAG_MANAGER_ID",
]);

const activeVerificationToken = validVerificationToken(verificationToken)
  ? verificationToken
  : "";
const activeAnalyticsId = validAnalyticsId(analyticsId) ? analyticsId : "";
const activeTagManagerId = validTagManagerId(tagManagerId) ? tagManagerId : "";

function createHeadSnippet() {
  const lines = [headStart];

  if (activeVerificationToken) {
    lines.push(
      `<meta name="google-site-verification" content="${escapeHtmlAttribute(
        activeVerificationToken,
      )}" />`,
    );
  }

  if (activeTagManagerId) {
    const id = escapeJavaScriptString(activeTagManagerId);
    lines.push(
      "<script>",
      "  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':",
      "  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],",
      "  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=",
      `  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);`,
      `  })(window,document,'script','dataLayer','${id}');`,
      "</script>",
    );
  }

  if (activeAnalyticsId) {
    const id = escapeJavaScriptString(activeAnalyticsId);
    lines.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtmlAttribute(
        activeAnalyticsId,
      )}"></script>`,
      "<script>",
      "  window.dataLayer = window.dataLayer || [];",
      "  function gtag(){dataLayer.push(arguments);}",
      "  gtag('js', new Date());",
      `  gtag('config', '${id}');`,
      "</script>",
    );
  }

  if (!activeVerificationToken && !activeTagManagerId && !activeAnalyticsId) {
    lines.push(
      "<!-- Set GOOGLE_SITE_VERIFICATION, GOOGLE_TAG_MANAGER_ID, and GOOGLE_ANALYTICS_ID to activate. -->",
    );
  }

  lines.push(headEnd);
  return lines.join("\n");
}

function createBodySnippet() {
  const lines = [bodyStart];

  if (activeTagManagerId) {
    lines.push(
      `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${escapeHtmlAttribute(
        activeTagManagerId,
      )}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
    );
  }

  lines.push(bodyEnd);
  return lines.join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOrInsertHead(html, snippet) {
  const blockPattern = new RegExp(
    `${escapeRegExp(headStart)}[\\s\\S]*?${escapeRegExp(headEnd)}`,
  );

  if (blockPattern.test(html)) {
    return html.replace(blockPattern, snippet);
  }

  return html.replace(/\s*<\/head>/i, `\n${snippet}\n</head>`);
}

function replaceOrInsertBody(html, snippet) {
  const blockPattern = new RegExp(
    `${escapeRegExp(bodyStart)}[\\s\\S]*?${escapeRegExp(bodyEnd)}`,
  );

  if (blockPattern.test(html)) {
    return html.replace(blockPattern, snippet);
  }

  return html.replace(/(<body\b[^>]*>)/i, `$1\n${snippet}`);
}

const headSnippet = createHeadSnippet();
const bodySnippet = createBodySnippet();

for (const htmlFile of htmlFiles) {
  const filePath = path.join(rootDir, htmlFile);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  const original = fs.readFileSync(filePath, "utf8");
  const updated = replaceOrInsertBody(replaceOrInsertHead(original, headSnippet), bodySnippet);

  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
  }
}

console.log(
  `Google integrations generated: Search Console ${
    activeVerificationToken ? "enabled" : "waiting"
  }, Tag Manager ${activeTagManagerId ? "enabled" : "waiting"}, Analytics ${
    activeAnalyticsId ? "enabled" : "waiting"
  }.`,
);
