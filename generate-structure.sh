#!/bin/bash

# Output file
OUTPUT_FILE="structure.txt"

# Folders to ignore
IGNORE_DIRS=("node_modules" ".git" "dist" "build")

# Function to join ignore dirs into -path format
build_ignore() {
  local ignore=""
  for dir in "${IGNORE_DIRS[@]}"; do
    ignore="$ignore -path ./$dir -prune -o"
  done
  echo "$ignore"
}

echo "Generating folder structure..."

# Generate structure
eval "find . $(build_ignore) -print" | sed -e 's;[^/]*/;│   ;g' -e 's;│   \([^│]\);├── \1;g' > "$OUTPUT_FILE"

echo "Structure saved to $OUTPUT_FILE"