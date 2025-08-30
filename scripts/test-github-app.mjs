#!/usr/bin/env node

// Test GitHub App authentication
// Run with: node test-github-app.mjs

import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

// Load environment variables from .env.local
import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnvFile() {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key] = value;
        }
      }
    });

    return envVars;
  } catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    return {};
  }
}

async function testGitHubApp() {
  console.log('🔍 Testing GitHub App Authentication\n');

  // Load environment variables
  const env = loadEnvFile();

  // Check required environment variables
  const requiredVars = [
    'GITHUB_APP_ID',
    'GITHUB_APP_PRIVATE_KEY',
    'GITHUB_APP_INSTALLATION_ID',
    'GITHUB_OWNER',
    'GITHUB_REPO'
  ];

  console.log('📋 Environment Variables Check:');
  const missingVars = [];
  requiredVars.forEach(varName => {
    const exists = !!env[varName];
    console.log(`  ${exists ? '✅' : '❌'} ${varName}: ${exists ? 'Set' : 'Missing'}`);
    if (!exists) missingVars.push(varName);
  });

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
    return;
  }

  console.log('\n🔧 GitHub App Configuration:');
  console.log(`  App ID: ${env.GITHUB_APP_ID}`);
  console.log(`  Installation ID: ${env.GITHUB_APP_INSTALLATION_ID}`);
  console.log(`  Repository: ${env.GITHUB_OWNER}/${env.GITHUB_REPO}`);
  console.log(`  Private Key Length: ${env.GITHUB_APP_PRIVATE_KEY?.length || 0} characters`);

  try {
    // Create GitHub App instance
    console.log('\n🚀 Creating GitHub App instance...');
    const app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
    });

    console.log('✅ GitHub App instance created');

    // Test installation access
    console.log('\n🔐 Testing installation access...');
    const installationId = parseInt(env.GITHUB_APP_INSTALLATION_ID);

    // Get installation Octokit directly
    console.log('\n🐙 Creating installation Octokit client...');
    const octokit = await app.getInstallationOctokit(installationId);

    console.log('✅ Octokit client created');

    // Test repository access
    console.log('\n📁 Testing repository access...');

    const { data: repo } = await octokit.request('GET /repos/{owner}/{repo}', {
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
    });

    console.log('✅ Repository access successful');
    console.log(`  Repository: ${repo.full_name}`);
    console.log(`  Private: ${repo.private}`);
    console.log(`  Permissions: ${JSON.stringify(repo.permissions, null, 2)}`);

    // Test content access
    console.log('\n📄 Testing content access...');
    try {
      const { data: contents } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: env.GITHUB_OWNER,
        repo: env.GITHUB_REPO,
        path: 'posts',
      });

      console.log('✅ Content access successful');
      if (Array.isArray(contents)) {
        console.log(`  Found ${contents.length} items in posts directory`);
      }
    } catch (contentError) {
      console.log('⚠️  Content access failed (posts directory might not exist)');
      console.log(`  Error: ${contentError.message}`);
    }

    console.log('\n🎉 GitHub App authentication is working correctly!');

  } catch (error) {
    console.error('\n❌ GitHub App authentication failed:');
    console.error(`  Error: ${error.message}`);

    if (error.status) {
      console.error(`  Status: ${error.status}`);
    }

    if (error.message.includes('installation')) {
      console.log('\n💡 Possible solutions:');
      console.log('  1. Verify the GitHub App is installed on the etsa-tech organization');
      console.log('  2. Check that the installation ID is correct');
      console.log('  3. Ensure the app has access to the etsa.tech repository');
    }

    if (error.message.includes('private key')) {
      console.log('\n💡 Private key issue:');
      console.log('  1. Verify the private key is correctly formatted');
      console.log('  2. Ensure newlines are properly escaped (\\n)');
      console.log('  3. Check that the private key matches the App ID');
    }
  }
}

testGitHubApp().catch(console.error);
