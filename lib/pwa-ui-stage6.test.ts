import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(process.cwd(), file));

test("stage 6 ships an installable PWA shell", () => {
  assert.equal(exists("app/manifest.ts"), true, "manifest must exist");
  assert.equal(exists("public/sw.js"), true, "service worker must exist");
  assert.equal(exists("app/offline/page.tsx"), true, "offline fallback route must exist");
  assert.equal(exists("components/pwa/PWARegister.tsx"), true, "service worker registration component must exist");

  const manifest = read("app/manifest.ts");
  assert.match(manifest, /Bina Insan LifeMap/i);
  assert.match(manifest, /display:\s*["']standalone["']/i);
  assert.match(manifest, /\/icons\/icon-192\.png/);
  assert.match(manifest, /\/icons\/icon-512\.png/);

  const sw = read("public/sw.js");
  assert.match(sw, /\/offline/);
  assert.match(sw, /_next\/static/);
  assert.doesNotMatch(sw, /caches\.put\([^\n]*(assessment|student_auth|consultation|supabase)/i);
});

test("stage 6 uses the official Bina Insan identity and counselor name", () => {
  assert.equal(exists("public/brand/bina-insan-logo.png"), true, "transparent school logo must exist");
  const home = read("app/page.tsx");
  assert.match(home, /\/brand\/bina-insan-logo\.png/);
  assert.match(home, /Moh\. Ikbal, M\.Pd\./);
  assert.match(home, /Portal Siswa/);
  assert.match(home, /BK Control Center/);
});

test("stage 6 keeps the refreshed experience accessible and restrained", () => {
  assert.equal(exists("app/pwa-ui.css"), true, "global UI refinement stylesheet must exist");
  const css = read("app/pwa-ui.css");
  assert.match(css, /--brand-navy:/);
  assert.match(css, /--brand-sky:/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);

  const layout = read("app/layout.tsx");
  assert.match(layout, /PWARegister/);
  assert.match(layout, /pwa-ui\.css/);
  assert.match(layout, /themeColor/);
});
