# Contributing to etsa.tech

Thank you for your interest in contributing to etsa.tech! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Conventional Commits](#conventional-commits)
- [Pull Request Process](#pull-request-process)
- [Semantic Versioning & Releases](#semantic-versioning--releases)
- [Changelog](#changelog)

## Code of Conduct

Please be respectful and constructive in all interactions with the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/etsa.tech.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b your-feature-branch`
5. Make your changes
6. Test your changes: `npm run build && npm run lint`
7. Commit your changes following the [Conventional Commits](#conventional-commits) specification
8. Push to your fork: `git push origin your-feature-branch`
9. Create a Pull Request

## Development Workflow

### Running the Development Server

See Quick Start from [README](README.md)

### Linting

```bash
npm run lint
```

To automatically fix linting issues:

```bash
npm run lint:fix
```

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean and semantic commit history. All pull request titles **must** follow this format.

### Format

```
<type>(<scope>): <subject>
```

- **type**: The type of change (required)
- **scope**: The area of the codebase affected (optional)
- **subject**: A brief description of the change (required)

### Valid Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Examples

```
feat(auth): add OAuth2 login support
fix(api): resolve race condition in user endpoint
docs(readme): update installation instructions
style(components): format code with prettier
refactor(utils): simplify date formatting logic
perf(images): optimize image loading
test(auth): add unit tests for login flow
build(deps): update next.js to v16
ci(workflows): add automated changelog generation
chore(config): update eslint rules
```

### Rules

- Type must be lowercase
- Scope is optional but must be lowercase if provided
- Subject must not be empty
- Subject must not end with a period
- Header must not exceed 100 characters
- Use imperative mood in the subject line (e.g., "add" not "added" or "adds")

## Pull Request Process

1. **Create a Pull Request** with a title that follows the Conventional Commits format
2. **PR Title Validation**: Our CI will automatically validate your PR title
   - If validation fails, you'll receive a comment with guidance
   - Update your PR title to match the required format
3. **Code Review**: Wait for maintainers to review your PR
4. **Address Feedback**: Make any requested changes
5. **Merge**: Once approved, a maintainer will merge your PR
6. **Changelog**: The changelog will be automatically updated when your PR is merged

### Branch Protection

- Direct pushes to the `main` branch are **not allowed**
- All changes must go through pull requests
- PR titles must follow Conventional Commits format
- The only exceptions are:
  - Merge commits from approved pull requests
  - Automated changelog updates
  - Emergency hotfixes (must still follow Conventional Commits format)

## Semantic Versioning & Releases

This project follows [Semantic Versioning](https://semver.org/) (SemVer). Versions are automatically determined based on the type of changes in your PR.

### Version Bump Rules

When a PR is merged to `main`, the version is automatically bumped according to these rules:

- **Major version** (X.0.0): Breaking changes

  - Indicated by `BREAKING CHANGE:` in the PR description
  - Example: `1.2.3` → `2.0.0`

- **Minor version** (0.X.0): New features

  - PR title starts with `feat:`
  - Example: `1.2.3` → `1.3.0`

- **Patch version** (0.0.X): Bug fixes and performance improvements

  - PR title starts with `fix:` or `perf:`
  - Example: `1.2.3` → `1.2.4`

- **No version bump**: Other changes
  - PR titles with `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:`
  - These are included in the changelog but don't trigger a version bump

### Breaking Changes

To indicate a breaking change, add `BREAKING CHANGE:` to your PR description:

```markdown
## Description

This PR refactors the authentication system to use OAuth2.

BREAKING CHANGE: The old API key authentication method is no longer supported.
Users must migrate to OAuth2 tokens.
```

### Release Process

When a PR is merged to `main`:

1. **Semantic Release Workflow** runs first:

   - Analyzes the PR title and description
   - Determines the version bump type
   - Updates `package.json` with the new version
   - Creates a Git tag (e.g., `v1.2.3`)
   - Creates a GitHub Release with auto-generated release notes

2. **Changelog Workflow** runs after:
   - Updates `CHANGELOG.md` with the new version section
   - Adds the PR details under the appropriate category
   - Commits the changelog update to `main`

### Manual Version Check

You can check the current version:

```bash
node -p "require('./package.json').version"
```

## Changelog

The changelog is automatically maintained using the PR titles. When your PR is merged to `main`:

1. The changelog workflow extracts information from your PR title
2. It categorizes the change based on the commit type
3. It adds an entry to the `CHANGELOG.md` file under the "Unreleased" section
4. The entry includes your PR number, link, and GitHub username

### Changelog Sections

Changes are organized into the following sections:

- ✨ **Features** (`feat`)
- 🐛 **Bug Fixes** (`fix`)
- ⚡ **Performance Improvements** (`perf`)
- ⏪ **Reverts** (`revert`)
- 📚 **Documentation** (`docs`)
- 💄 **Styles** (`style`)
- ♻️ **Code Refactoring** (`refactor`)
- ✅ **Tests** (`test`)
- 📦 **Build System** (`build`)
- 👷 **CI/CD** (`ci`)
- 🔧 **Chores** (`chore`)

## Questions?

If you have any questions or need help, please:

1. Check existing issues and pull requests
2. Create a new issue with your question
3. Reach out to the maintainers

Thank you for contributing! 🎉
