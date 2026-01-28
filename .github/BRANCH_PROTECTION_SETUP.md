# Branch Protection Setup for CI Workflows

## Problem

The release and changelog workflows need to commit directly to `main` for automated version bumps and changelog updates, but GitHub's repository rules are blocking these commits with:

```
Repository rule violations found
Changes must be made through a pull request.
Code scanning is waiting for results from CodeQL for the commit.
3 of 3 required status checks are expected.
```

## Solution Options

### Option 1: Allow GitHub Actions to Bypass Branch Protection (Recommended)

This is the simplest solution and doesn't require any tokens.

#### Steps:

1. Go to **Settings** → **Branches** → **Branch protection rules** for `main`
2. Scroll down to **"Rules applied to everyone including administrators"**
3. Check the box: **"Allow specified actors to bypass required pull requests"**
4. Click **"Add bypass"** and select **"github-actions[bot]"**
5. Save changes

This allows the GitHub Actions bot to push commits directly to `main` while still requiring PRs for human contributors.

### Option 2: Use Repository Rulesets (GitHub Enterprise/Pro)

If you're using GitHub's newer Repository Rulesets:

1. Go to **Settings** → **Rules** → **Rulesets**
2. Edit the ruleset that applies to `main`
3. Under **"Bypass list"**, add **"github-actions[bot]"**
4. Save changes

### Option 3: Create a GitHub App (Most Secure)

For maximum security and control:

1. Create a GitHub App with `contents: write` permission
2. Install the app on your repository
3. Generate a private key
4. Add the private key as a repository secret (e.g., `APP_PRIVATE_KEY`)
5. Add the app ID as a repository secret (e.g., `APP_ID`)
6. Update workflows to use the app token instead of `GITHUB_TOKEN`

Example workflow change:

```yaml
- name: Generate token
  id: generate_token
  uses: tibdex/github-app-token@v1
  with:
    app_id: ${{ secrets.APP_ID }}
    private_key: ${{ secrets.APP_PRIVATE_KEY }}

- name: Checkout code
  uses: actions/checkout@v6
  with:
    token: ${{ steps.generate_token.outputs.token }}
```

### Option 4: Use a Personal Access Token (PAT) - Not Recommended

⚠️ **Not recommended** for security reasons, but works as a quick fix:

1. Create a PAT with `repo` scope
2. Add it as a repository secret (e.g., `PAT_TOKEN`)
3. Update workflows to use the PAT:

```yaml
- name: Checkout code
  uses: actions/checkout@v6
  with:
    token: ${{ secrets.PAT_TOKEN }}
```

## Recommended Approach

**Use Option 1** - it's the simplest and most appropriate for this use case:

- ✅ No secrets to manage
- ✅ Built-in GitHub functionality
- ✅ Clear audit trail (commits show as `github-actions[bot]`)
- ✅ Scoped to only the actions that need it

## After Configuration

Once you've configured the bypass, the workflows will be able to:

- ✅ Bump version in `package.json` and `package-lock.json`
- ✅ Create Git tags for releases
- ✅ Update `CHANGELOG.md` with PR entries
- ✅ Create GitHub Releases

All while maintaining branch protection for human contributors!

## Testing

After configuration, test by:

1. Creating a test PR with a `feat:` title
2. Merging the PR
3. Watching the workflows run successfully
4. Verifying the version was bumped and changelog updated

## Troubleshooting

If you still see errors:

- Verify the bypass is configured for `github-actions[bot]` (not just `github-actions`)
- Check that repository rulesets aren't overriding branch protection rules
- Ensure required status checks allow the workflows to complete before pushing
