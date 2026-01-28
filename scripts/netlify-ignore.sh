#!/bin/bash

# Netlify build ignore script
# This script determines whether Netlify should build based on what files changed
# Exit code 0 = build, Exit code 1 = skip build

# Get the list of changed files
CHANGED_FILES=$(git diff --name-only $CACHED_COMMIT_REF $COMMIT_REF)

# If no cached commit (first build), always build
if [ -z "$CACHED_COMMIT_REF" ]; then
  echo "First build detected, proceeding with build"
  exit 0
fi

# Files/directories that should NOT trigger a build
IGNORE_PATTERNS=(
  "^\.github/"
  "^.*\.md$"           # All markdown files
  "^LICENSE$"
  "^commitlint\.config\.js$"
  "^renovate\.json$"
  "^sonar-project\.properties$"
  "^\.gitignore$"
  "^\.editorconfig$"
)

# Check if any changed file should trigger a build
SHOULD_BUILD=false

while IFS= read -r file; do
  # Skip empty lines
  [ -z "$file" ] && continue

  # Check if file matches any ignore pattern
  SHOULD_IGNORE=false
  for pattern in "${IGNORE_PATTERNS[@]}"; do
    if echo "$file" | grep -qE "$pattern"; then
      SHOULD_IGNORE=true
      echo "Ignoring: $file"
      break
    fi
  done

  # If file doesn't match ignore patterns, we should build
  if [ "$SHOULD_IGNORE" = false ]; then
    echo "Build triggered by: $file"
    SHOULD_BUILD=true
  fi
done <<< "$CHANGED_FILES"

# Exit based on whether we should build
if [ "$SHOULD_BUILD" = true ]; then
  echo "Changes detected that require a build"
  exit 0
else
  echo "Only CI/documentation files changed, skipping build"
  exit 1
fi
