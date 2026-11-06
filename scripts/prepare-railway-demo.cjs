const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "madaraka-railways-demo", "public");
const output = path.join(root, "public", "demo");
fs.mkdirSync(output, { recursive: true });

for (const file of ["app.js", "admin.js", "i18n.js"]) {
  fs.copyFileSync(path.join(source, file), path.join(output, file));
}
fs.cpSync(path.join(source, "img"), path.join(root, "public", "img"), { recursive: true });

let css = fs.readFileSync(path.join(source, "styles.css"), "utf8");
css = css
  .replace("--brand:#0E5E6F", "--brand:oklch(0.38 0.13 10)")
  .replace("--brand-d:#0a4552", "--brand-d:oklch(0.3 0.1 10)")
  .replace("--accent:#F4B942", "--accent:oklch(0.64 0.19 36)")
  .replace("--accent-d:#d99a1c", "--accent-d:oklch(0.56 0.17 36)")
  .replace("--bg:#f4f7f7", "--bg:oklch(1 0 0)")
  .replace("--text:#1c2a30", "--text:oklch(0.24 0 0)")
  .replace("--muted:#5f7178", "--muted:oklch(0.5 0 0)")
  .replace("--line:#dbe4e6", "--line:oklch(0.9 0 0)")
  .replace("--seat:#e3eef0", "--seat:oklch(0.97 0.01 20)")
  .replace("--brand:#17808f", "--brand:oklch(0.93 0.01 80)");

const stylesheet = postcss.parse(css);
stylesheet.walkRules((rule) => {
  rule.selectors = rule.selectors.map((value) => {
    const selector = value.trim();
    if (selector === ":root" || selector === "html" || selector === "body") return ".portal-app";
    if (selector.startsWith(":root")) return `.portal-app${selector.slice(5)}`;
    if (selector.startsWith("html") || selector.startsWith("body")) return selector.replace(/^(html|body)/, ".portal-app");
    if (selector.startsWith("[data-theme=dark]")) return `.portal-app${selector}`;
    return `.portal-app ${selector}`;
  });
});
stylesheet.append(postcss.parse(`.portal-app { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); } .portal-app .demo-footer { display: none; }`));
fs.writeFileSync(path.join(output, "styles.css"), stylesheet.toString());
