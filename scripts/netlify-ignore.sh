#!/bin/bash
set -e

# Netlify build ignore script
# IMPORTANT: Netlify's ignore command works OPPOSITE to typical conventions:
# Exit code 1 = BUILD (proceed with deployment)
# Exit code 0 = SKIP BUILD (ignore changes, no deployment)

echo "========================================="
echo "Netlify Build Ignore Script"
echo "========================================="

# Print environment for debugging
echo "Environment:"
echo "  CONTEXT: $CONTEXT"
echo "  BRANCH: $BRANCH"
echo "  HEAD: $HEAD"
echo "  COMMIT_REF: $COMMIT_REF"
echo "  CACHED_COMMIT_REF: $CACHED_COMMIT_REF"
echo ""

# Define files/patterns that should NOT trigger a build
IGNORE_PATTERNS=(
  "^\.github/"
  "^README\.md$"
  "^CHANGELOG\.md$"
  "^CONTRIBUTING\.md$"
  "^SECURITY\.md$"
  "^SEMANTIC_RELEASE_SUMMARY\.md$"
  "^docs/.*\.md$"
  "^LICENSE$"
  "^commitlint\.config\.js$"
  "^renovate\.json$"
  "^sonar-project\.properties$"
  "^\.gitignore$"
  "^\.editorconfig$"
)

# Function to check if a file should be ignored
should_ignore_file() {
  local file="$1"
  for pattern in "${IGNORE_PATTERNS[@]}"; do
    if echo "$file" | grep -qE "$pattern"; then
      return 0  # true - should ignore
    fi
  done
  return 1  # false - should not ignore
}

# Determine which commits to compare
echo "Determining commit range..."

if [ -z "$CACHED_COMMIT_REF" ]; then
  # First build - always build
  echo "First build detected (no CACHED_COMMIT_REF)"
  echo "Decision: BUILD"
  exit 1  # Exit 1 = BUILD
fi

# Get changed files between commits
echo "Comparing: $CACHED_COMMIT_REF...$COMMIT_REF"
CHANGED_FILES=$(git diff --name-only "$CACHED_COMMIT_REF" "$COMMIT_REF" 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected"
  echo "Decision: BUILD (safety default)"
  exit 1  # Exit 1 = BUILD
fi

echo ""
echo "Changed files:"
echo "$CHANGED_FILES"
echo ""

# Check each changed file
BUILD_REQUIRED=false
IGNORED_FILES=()
TRIGGER_FILES=()

while IFS= read -r file; do
  [ -z "$file" ] && continue

  if should_ignore_file "$file"; then
    IGNORED_FILES+=("$file")
  else
    TRIGGER_FILES+=("$file")
    BUILD_REQUIRED=true
  fi
done <<< "$CHANGED_FILES"

# Print summary
echo "Summary:"
echo "  Total changed files: $(echo "$CHANGED_FILES" | wc -l | tr -d ' ')"
echo "  Ignored files: ${#IGNORED_FILES[@]}"
echo "  Files triggering build: ${#TRIGGER_FILES[@]}"
echo ""

if [ ${#IGNORED_FILES[@]} -gt 0 ]; then
  echo "Ignored files:"
  printf '  - %s\n' "${IGNORED_FILES[@]}"
  echo ""
fi

if [ ${#TRIGGER_FILES[@]} -gt 0 ]; then
  echo "Files triggering build:"
  printf '  - %s\n' "${TRIGGER_FILES[@]}"
  echo ""
fi

# Make decision
if [ "$BUILD_REQUIRED" = true ]; then
  echo "Decision: BUILD"
  echo "========================================="
  exit 1  # Exit 1 = BUILD
else
  echo "Decision: SKIP BUILD"
  echo "Reason: Only documentation/CI files changed"
  echo "========================================="
  exit 0  # Exit 0 = SKIP
fi
