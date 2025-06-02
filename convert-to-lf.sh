#!/bin/bash

# Script to convert CRLF to LF line endings in the project
# Save this as convert-to-lf.sh in your project root directory

# Find all text files (focusing on common source code extensions)
# and convert them to LF line endings

find . -type f \( \
    -name "*.ts" -o \
    -name "*.js" -o \
    -name "*.json" -o \
    -name "*.md" -o \
    -name "*.yml" -o \
    -name "*.yaml" -o \
    -name "*.gitignore" -o \
    -name "*.env*" \
    \) -exec bash -c 'dos2unix "$0" 2>/dev/null || sed -i "s/\r$//" "$0"' {} \;

echo "Conversion to LF line endings complete!"
