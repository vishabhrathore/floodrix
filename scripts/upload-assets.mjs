import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ASSETS_DIR = path.join(process.cwd(), "public");
const OUTPUT_FILE = path.join(process.cwd(), "cloudinary-assets.json");
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
  ".mp4",
  ".webm",
  ".ogg",
];

const assetMap = {};

async function uploadFile(filePath, relativePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return;

  // Use the relative path as the public_id to maintain structure
  // Remove extension and leading slash
  const publicId = relativePath.replace(ext, "").replace(/^\//, "");
  const resourceType =
    ext === ".mp4" || ext === ".webm" || ext === ".ogg" ? "video" : "auto";

  console.log(`Uploading: ${relativePath} ...`);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      folder: "floodrix", // Root folder on Cloudinary
      resource_type: resourceType,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });

    assetMap[relativePath] = result.secure_url;
    console.log(`✅ Success: ${result.secure_url}`);
  } catch (error) {
    console.error(`❌ Failed to upload ${relativePath}:`, error.message);
  }
}

async function walkDir(dir, relativeDir = "") {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    const relPath = path.join(relativeDir, file.name);

    if (file.isDirectory()) {
      await walkDir(fullPath, relPath);
    } else {
      await uploadFile(fullPath, relPath);
    }
  }
}

async function main() {
  console.log("🚀 Starting asset upload to Cloudinary...");

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("❌ Error: Cloudinary credentials missing in environment.");
    process.exit(1);
  }

  await walkDir(ASSETS_DIR);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(assetMap, null, 2));
  console.log(`\n✨ Done! Uploaded ${Object.keys(assetMap).length} assets.`);
  console.log(`📄 Asset map saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
