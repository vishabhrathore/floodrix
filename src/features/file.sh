#!/bin/bash

OUTPUT_FILE="output.txt"
TARGET_DIR="workspace-canvas"

# साफ file start करने के लिए
> "$OUTPUT_FILE"

find "$TARGET_DIR" -type f | while read file; do
  echo "=====================================" >> "$OUTPUT_FILE"
  echo "FILE: $file" >> "$OUTPUT_FILE"
  echo "=====================================" >> "$OUTPUT_FILE"
  
  cat "$file" >> "$OUTPUT_FILE"
  
  echo -e "\n\n" >> "$OUTPUT_FILE"
done

echo "Done! Output saved in $OUTPUT_FILE"