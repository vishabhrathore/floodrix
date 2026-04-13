#!/bin/bash

# Output file
OUTPUT_FILE="structure.txt"

# Folders to ignore
IGNORE_DIRS=("node_modules" ".git" "dist" "build" ".next" ".turbo" "out")

echo "Generating folder structure..."

# Build prune expression
PRUNE_EXPR=""
for dir in "${IGNORE_DIRS[@]}"; do
  PRUNE_EXPR="$PRUNE_EXPR -name $dir -o"
done

# Remove trailing -o
PRUNE_EXPR=${PRUNE_EXPR::-3}

# Generate structure
find . \( $PRUNE_EXPR \) -prune -o -print \
| sed -e 's;[^/]*/;│   ;g' -e 's;│   \([^│]\);├── \1;g' \
> "$OUTPUT_FILE"

echo "Structure saved to $OUTPUT_FILE"