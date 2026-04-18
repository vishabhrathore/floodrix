// scripts/export-ui-files.js
const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '../src/components/ui');
const OUTPUT_FILE = path.join(__dirname, 'ui-files.txt');

function readFilesRecursively(dir) {
    let results = [];

    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results = results.concat(readFilesRecursively(filePath));
        } else {
            results.push(filePath);
        }
    });

    return results;
}

function exportFiles() {
    const files = readFilesRecursively(UI_DIR);

    let output = '';

    files.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');

        output += `\n\n===== FILE: ${filePath} =====\n\n`;
        output += content;
    });

    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    console.log(`✅ Exported ${files.length} files to ${OUTPUT_FILE}`);
}

exportFiles();