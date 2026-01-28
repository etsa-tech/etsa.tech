# GitHub App Setup for Automated Releases

## ✅ What's Been Done

The release and changelog workflows have been updated to use a GitHub App token instead of the default `GITHUB_TOKEN`. This allows the workflows to bypass repository rulesets and commit directly to `main`.

## 🤖 Setup Instructions

### Step 1: Create the GitHub App

1. Go to **GitHub Settings** → **Developer settings** → **GitHub Apps**

   - Organization: https://github.com/organizations/etsa-tech/settings/apps
   - Personal: https://github.com/settings/apps

2. Click **"New GitHub App"**

3. Fill in the details:

   - **GitHub App name**: `ETSA Release Bot` (or your preferred name)
   - **Homepage URL**: `https://etsa.tech`
   - **Webhook**: Uncheck "Active" (not needed)

4. **Repository permissions**:

   - **Contents**: Read and write ✅
   - **Metadata**: Read-only ✅ (auto-selected)
   - **Pull requests**: Read-only ✅

5. **Where can this GitHub App be installed?**

   - Select **"Only on this account"**

6. Click **"Create GitHub App"**

### Step 2: Generate Private Key

1. After creating the app, scroll to **"Private keys"**
2. Click **"Generate a private key"**
3. A `.pem` file will download - **save this securely!**

### Step 3: Note the App ID

At the top of the app settings page, copy the **App ID** (e.g., `123456`)

### Step 4: Install the App

1. In the left sidebar, click **"Install App"**
2. Click **"Install"** next to your organization
3. Select **"Only select repositories"**
4. Choose **`etsa.tech`**
5. Click **"Install"**

### Step 5: Add Repository Secrets

1. Go to: https://github.com/etsa-tech/etsa.tech/settings/secrets/actions
2. Click **"New repository secret"**

**Add these two secrets:**

**Secret 1:**

- Name: `RELEASE_APP_ID`
- Value: [paste the App ID from Step 3]

**Secret 2:**

- Name: `RELEASE_APP_PRIVATE_KEY`
- Value: [paste the entire contents of the .pem file, including the header and footer]

Example `.pem` format:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----
```

## 🎯 How It Works

The workflows now:

1. Generate a temporary token from the GitHub App
2. Use that token for all git operations and API calls
3. The app token has permissions to bypass repository rulesets
4. Commits appear as made by the app (e.g., `ETSA Release Bot[bot]`)

## ✅ Testing

After setup:

1. Merge your current PR to `main`
2. Create a test PR with title: `feat(test): verify automated release`
3. Merge the test PR
4. Watch the workflows run:
   - ✅ Version should be bumped
   - ✅ Git tag should be created
   - ✅ GitHub Release should be created
   - ✅ Changelog should be updated

## 🔒 Security

This approach is secure because:

- ✅ The app only has access to the specific repository
- ✅ Permissions are scoped to only what's needed
- ✅ The private key is stored as an encrypted secret
- ✅ The app can only do what the workflow files allow
- ✅ All actions are audited in the git history

## 🔧 Troubleshooting

### "Bad credentials" error

- Verify the `RELEASE_APP_PRIVATE_KEY` includes the full `.pem` file content
- Check that the `RELEASE_APP_ID` matches your app's ID

### "Resource not accessible by integration"

- Ensure the app has **Contents: Read and write** permission
- Verify the app is installed on the `etsa.tech` repository

### Commits still blocked

- Confirm the app is installed (not just created)
- Check that the secrets are named exactly: `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY`

## 📚 References

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [actions/create-github-app-token](https://github.com/actions/create-github-app-token)
