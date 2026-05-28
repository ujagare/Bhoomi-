const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "assets", "js", "supabase-config.js");

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://YOUR_PROJECT_REF.supabase.co";

const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const table = process.env.SUPABASE_CONTACT_TABLE || "contact_messages";

const content = `window.BHOOMI_SUPABASE_CONFIG = {
  url: ${JSON.stringify(supabaseUrl)},
  anonKey: ${JSON.stringify(supabaseKey)},
  table: ${JSON.stringify(table)},
};
`;

fs.writeFileSync(configPath, content);
console.log(`Generated ${path.relative(process.cwd(), configPath)}`);
