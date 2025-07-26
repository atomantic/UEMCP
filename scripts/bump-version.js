#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const versionType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'patch';
const prerelease = args.find(arg => arg.startsWith('--prerelease='))?.split('=')[1];

// Files to update
const PLUGIN_FILE = path.join(__dirname, '..', 'plugin', 'UEMCP.uplugin');
const SERVER_PACKAGE = path.join(__dirname, '..', 'server', 'package.json');

// Read current versions
const pluginData = JSON.parse(fs.readFileSync(PLUGIN_FILE, 'utf8'));
const serverPackage = JSON.parse(fs.readFileSync(SERVER_PACKAGE, 'utf8'));

// Get current version (they should match)
const currentVersion = pluginData.VersionName;
if (currentVersion !== serverPackage.version) {
  console.error(`Version mismatch! Plugin: ${currentVersion}, Server: ${serverPackage.version}`);
  process.exit(1);
}

console.log(`Current version: ${currentVersion}`);

// Parse version
const versionParts = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
if (!versionParts) {
  console.error('Invalid version format');
  process.exit(1);
}

let [, major, minor, patch, prereleaseTag] = versionParts;
major = parseInt(major);
minor = parseInt(minor);
patch = parseInt(patch);

// Calculate new version
let newVersion;

if (prerelease) {
  // Handle prerelease versions
  if (prereleaseTag && prereleaseTag.startsWith(prerelease)) {
    // Increment prerelease number
    const num = parseInt(prereleaseTag.split('.')[1] || 0) + 1;
    newVersion = `${major}.${minor}.${patch}-${prerelease}.${num}`;
  } else {
    // New prerelease
    if (versionType === 'major') {
      newVersion = `${major + 1}.0.0-${prerelease}.0`;
    } else if (versionType === 'minor') {
      newVersion = `${major}.${minor + 1}.0-${prerelease}.0`;
    } else {
      newVersion = `${major}.${minor}.${patch + 1}-${prerelease}.0`;
    }
  }
} else {
  // Regular version bump
  switch (versionType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
}

console.log(`New version: ${newVersion}`);

// Update plugin file
pluginData.VersionName = newVersion;
pluginData.Version = parseInt(newVersion.split('.')[0]); // Major version number
fs.writeFileSync(PLUGIN_FILE, JSON.stringify(pluginData, null, 2) + '\n');
console.log(`Updated ${PLUGIN_FILE}`);

// Update server package.json
serverPackage.version = newVersion;
fs.writeFileSync(SERVER_PACKAGE, JSON.stringify(serverPackage, null, 2) + '\n');
console.log(`Updated ${SERVER_PACKAGE}`);

// Update server package-lock.json if it exists
const SERVER_LOCK = path.join(__dirname, '..', 'server', 'package-lock.json');
if (fs.existsSync(SERVER_LOCK)) {
  const lockData = JSON.parse(fs.readFileSync(SERVER_LOCK, 'utf8'));
  lockData.version = newVersion;
  if (lockData.packages && lockData.packages['']) {
    lockData.packages[''].version = newVersion;
  }
  fs.writeFileSync(SERVER_LOCK, JSON.stringify(lockData, null, 2) + '\n');
  console.log(`Updated ${SERVER_LOCK}`);
}

console.log('\nVersion bump complete!');
console.log('\nNext steps:');
console.log('1. Review the changes: git diff');
console.log('2. Commit the changes: git add -A && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('3. Create and push tag: git tag v' + newVersion + ' && git push origin main --tags');