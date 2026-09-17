import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("stage 6 PWA foundation exists and is wired into root layout", () => {
  const required = [
    "app/stage6.css",
    "app/stage6-polish.css",
    "app/manifest.ts",
    "components/brand/BrandLogo.tsx",
    "components/pwa/PWARegister.tsx",
    "public/sw.js",
    "app/offline/page.tsx",
    "public/brand/bina-insan-logo.svg",
    "public/icons/icon.svg",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/apple-touch-icon.png",
  ];
  for (const file of required) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
  }

  const layout = read("app/layout.tsx");
  assert.match(layout, /import "\.\/stage6\.css"/);
  assert.match(layout, /import "\.\/stage6-polish\.css"/);
  assert.match(layout, /PWARegister/);
  assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.match(layout, /apple-touch-icon\.png/);
});

test("manifest is installable on Android and supports maskable icons", () => {
  const manifest = read("app/manifest.ts");
  assert.match(manifest, /display:\s*"standalone"/);
  assert.match(manifest, /start_url:\s*"\/"/);
  assert.match(manifest, /\/icons\/icon-192\.png/);
  assert.match(manifest, /\/icons\/icon-512\.png/);
  assert.match(manifest, /purpose:\s*"maskable"/);
});

test("official visible logo is vector and transparent", () => {
  const logo = read("public/brand/bina-insan-logo.svg");
  assert.match(logo, /Bina Insan Palu High School/);
  assert.match(logo, /viewBox=/);
  assert.doesNotMatch(logo, /<rect[^>]+fill=["']#fff/i);
});

test("service worker never caches authenticated or Supabase data", () => {
  const sw = read("public/sw.js");
  assert.match(sw, /request\.mode\s*===\s*"navigate"/);
  assert.match(sw, /fetch\(request\).*catch/s);
  assert.match(sw, /url\.origin\s*!==\s*self\.location\.origin/);
  assert.match(sw, /STATIC_PREFIXES/);
  assert.match(sw, /\/brand\//);
  assert.match(sw, /\/_next\/static\//);
  assert.match(sw, /icon-192\.png/);
  assert.match(sw, /icon-512\.png/);
  assert.doesNotMatch(sw, /caches\.put\(request,\s*response\).*student/s);
  assert.doesNotMatch(sw, /caches\.put\(request,\s*response\).*counseling/s);
});
