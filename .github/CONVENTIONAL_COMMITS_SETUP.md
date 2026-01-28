# Conventional Commits Implementation

This document describes the conventional commits implementation for the etsa.tech repository.

## Overview

This repository enforces [Conventional Commits](https://www.conventionalcommits.org/) specification to maintain a clean commit history and automatically generate changelogs.

## Implementation Components

### 1. Dependencies

The following packages have been installed:

- `@commitlint/cli` - Validates commit messages
- `@commitlint/config-conventional` - Conventional commits configuration
- `conventional-changelog-cli` - Generates changelogs from commit history

### 2. Configuration Files

#### `commitlint.config.js`

Defines the conventional commits rules:
- Valid commit types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Type must be lowercase
- Subject must not be empty or end with a period
- Header max length: 100 characters
- Body and footer max line length: 100 characters

### 3. GitHub Workflows

#### `.github/workflows/pr-title-check.yml`

**Trigger**: On PR opened, edited, synchronize, or reopened

**Purpose**: Validates that PR titles follow conventional commits format

**Features**:
- Validates PR title using commitlint
- Posts helpful comment on validation failure with examples
- Posts success comment when validation passes
- Blocks PR merge if title is invalid

#### `.github/workflows/changelog.yml`

**Trigger**: When PR is merged to main

**Purpose**: Automatically updates CHANGELOG.md based on PR title

**Features**:
- Parses PR title to extract type, scope, and subject
- Categorizes changes into appropriate changelog sections
- Adds entry with PR number, link, and author
- Commits and pushes changelog update to main
- Creates CHANGELOG.md if it doesn't exist

**Changelog Sections**:
- ✨ Features (feat)
- 🐛 Bug Fixes (fix)
- ⚡ Performance Improvements (perf)
- ⏪ Reverts (revert)
- 📚 Documentation (docs)
- 💄 Styles (style)
- ♻️ Code Refactoring (refactor)
- ✅ Tests (test)
- 📦 Build System (build)
- 👷 CI/CD (ci)
- 🔧 Chores (chore)

#### `.github/workflows/branch-protection.yml`

**Trigger**: On push to main branch

**Purpose**: Prevents direct pushes to main (except for allowed cases)

**Features**:
- Detects if push is a merge commit from PR
- Allows changelog update commits
- Validates that direct pushes follow conventional commits format
- Creates issue for violations
- Fails the workflow for invalid direct pushes

**Allowed Direct Pushes**:
1. Merge commits from pull requests
2. Automated changelog updates (commits starting with `chore(changelog):`)
3. Emergency commits that follow conventional commits format

### 4. Documentation

#### `CONTRIBUTING.md`

Comprehensive contributing guide including:
- Conventional commits specification
- Valid commit types and examples
- PR title format requirements
- Development workflow
- Branch protection rules
- Changelog generation process

#### `README.md`

Updated with:
- Link to CONTRIBUTING.md
- Quick start guide for contributors
- PR title format examples
- Conventional commits requirements

#### `CHANGELOG.md`

Initialized with:
- Keep a Changelog format
- Unreleased section for upcoming changes
- Initial release entry (v0.1.0)
- Proper versioning links

### 5. NPM Scripts

Added to `package.json`:

```json
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "changelog:all": "conventional-changelog -p angular -i CHANGELOG.md -s -r 0"
  }
}
```

- `npm run changelog` - Generate changelog for new commits
- `npm run changelog:all` - Regenerate entire changelog from git history

## Usage

### For Contributors

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes and commit** (commits can be informal):
   ```bash
   git commit -m "wip: working on feature"
   ```

3. **Create a PR with a conventional commit title**:
   ```
   feat(auth): add OAuth2 login support
   ```

4. **Wait for validation**:
   - The PR title check workflow will validate your title
   - Fix the title if validation fails
   - Merge when approved

5. **Changelog is automatically updated** when PR is merged

### For Maintainers

#### Merging PRs

- Ensure PR title follows conventional commits format
- The changelog will be automatically updated after merge
- No manual changelog editing needed

#### Emergency Hotfixes

If you must push directly to main:

```bash
git commit -m "fix(critical): resolve security vulnerability"
git push origin main
```

The commit must follow conventional commits format or the workflow will fail.

#### Manual Changelog Generation

If needed, you can manually generate the changelog:

```bash
npm run changelog
```

## Branch Protection Rules (Recommended)

To fully enforce this workflow, configure these branch protection rules on GitHub:

1. Go to Settings → Branches → Branch protection rules
2. Add rule for `main` branch:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
     - Select: `Validate PR Title`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings

## Troubleshooting

### PR Title Validation Fails

**Problem**: PR title doesn't follow conventional commits format

**Solution**: Update your PR title to match the format:
```
<type>(<scope>): <subject>
```

Example: `feat(blog): add new post editor`

### Changelog Not Updated

**Problem**: Changelog wasn't updated after PR merge

**Solution**: 
1. Check the changelog workflow run in Actions tab
2. Ensure PR title followed conventional commits format
3. Manually run: `npm run changelog` if needed

### Direct Push Blocked

**Problem**: Push to main was rejected

**Solution**:
1. Create a feature branch
2. Push changes to the branch
3. Create a PR with proper title
4. Merge through PR process

## Benefits

1. **Automated Changelog**: No manual changelog maintenance
2. **Consistent History**: All changes follow the same format
3. **Better Collaboration**: Clear, semantic commit messages
4. **Automated Versioning**: Ready for semantic versioning
5. **Better Release Notes**: Automatically categorized changes
6. **Protected Main Branch**: Prevents accidental direct pushes

## References

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)

