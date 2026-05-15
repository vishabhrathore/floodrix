import fs from "fs";
import path from "path";

const SRC_DIR = path.join(process.cwd(), "src");

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const doubleUrlRegex =
    /https:\/\/res\.cloudinary\.com\/.*?https:\/\/res\.cloudinary\.com\//g;

  if (doubleUrlRegex.test(content)) {
    // Replace the double URL part with just the second URL start
    const fixedContent = content.replace(
      doubleUrlRegex,
      "https://res.cloudinary.com/",
    );
    fs.writeFileSync(filePath, fixedContent);
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (
        file.name !== "node_modules" &&
        file.name !== ".next" &&
        file.name !== ".git"
      ) {
        walkDir(fullPath);
      }
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (
        [".tsx", ".ts", ".js", ".jsx", ".css", ".scss", ".html"].includes(ext)
      ) {
        fixFile(fullPath);
      }
    }
  }
}

console.log("🩹 Fixing double Cloudinary URLs...");
walkDir(SRC_DIR);
console.log("✨ All fixed!");
