import fs from 'fs';
import path from 'path';

const ASSET_MAP_FILE = path.join(process.cwd(), 'cloudinary-assets.json');
const SRC_DIR = path.join(process.cwd(), 'src');

if (!fs.existsSync(ASSET_MAP_FILE)) {
  console.error('❌ Error: cloudinary-assets.json not found. Run the upload script first.');
  process.exit(1);
}

const assetMap = JSON.parse(fs.readFileSync(ASSET_MAP_FILE, 'utf8'));

// Prepare replacements: sort by length descending to avoid partial matches
const replacements = Object.entries(assetMap).sort((a, b) => b[0].length - a[0].length);

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [localPath, remoteUrl] of replacements) {
    // Search for patterns like "/asset.jpg" or "asset.jpg" if it's unique enough
    // We'll focus on "/asset.jpg" as it's the standard for Next.js public assets
    const searchPattern = `/${localPath}`;
    if (content.includes(searchPattern)) {
      // Use split/join for simple replacement of all occurrences
      content = content.split(searchPattern).join(remoteUrl);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (file.name !== 'node_modules' && file.name !== '.next' && file.name !== '.git') {
        walkDir(fullPath);
      }
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (['.tsx', '.ts', '.js', '.jsx', '.css', '.scss', '.html'].includes(ext)) {
        updateFile(fullPath);
      }
    }
  }
}

console.log('🔄 Updating asset references in code...');
walkDir(SRC_DIR);
// Also check the root directory for things like calculator.html
walkDir(process.cwd()); 

console.log('✨ All references updated!');
