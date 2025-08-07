# UEMCP Release Checklist

Use this checklist when preparing a new release of UEMCP.

## Pre-Release

### 1. Code Quality
- [ ] All CI tests passing on main branch
- [ ] No critical issues in issue tracker
- [ ] Code reviewed by at least one maintainer
- [ ] Documentation updated for new features

### 2. Testing
- [ ] Plugin tested in UE 5.3
- [ ] Plugin tested in UE 5.4
- [ ] Server tested with Claude Desktop
- [ ] Server tested with Claude Code
- [ ] Installation script tested on macOS
- [ ] Installation script tested on Windows
- [ ] Installation script tested on Linux

### 3. Version Updates
- [ ] Run appropriate version bump command:
  ```bash
  cd server
  npm run version:patch  # for bug fixes
  npm run version:minor  # for new features
  npm run version:major  # for breaking changes
  ```
- [ ] Verify version updated in:
  - [ ] `plugin/UEMCP.uplugin`
  - [ ] `server/package.json`
  - [ ] `server/package-lock.json`

### 4. Documentation
- [ ] Update docs/CHANGELOG.md with all changes
- [ ] Update README.md if needed
- [ ] Update docs/development/versioning.md compatibility matrix
- [ ] Review and update API documentation

## Release Process

### 1. Final Checks
- [ ] Working directory is clean: `git status`
- [ ] On main branch: `git branch`
- [ ] Up to date: `git pull origin main`

### 2. Commit Version Changes
```bash
git add -A
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

### 3. Create Release Tag
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 4. Monitor Release
- [ ] Check GitHub Actions release workflow
- [ ] Verify all artifacts uploaded:
  - [ ] `UEMCP-Plugin-vX.Y.Z.zip`
  - [ ] `UEMCP-Server-vX.Y.Z.zip`
  - [ ] `UEMCP-Full-vX.Y.Z.zip`
  - [ ] `checksums-vX.Y.Z.txt`
- [ ] Review auto-generated release notes
- [ ] Edit release notes if needed

## Post-Release

### 1. Verification
- [ ] Download and test release artifacts
- [ ] Verify checksums match
- [ ] Test installation with downloaded package

### 2. Announcements
- [ ] Update project website/wiki
- [ ] Post to Discord/Slack channels
- [ ] Tweet about release (optional)
- [ ] Update forum posts

### 3. Next Steps
- [ ] Create milestone for next version
- [ ] Update project board
- [ ] Plan next release features

## Emergency Rollback

If critical issues found after release:

1. **Delete the release** (keep tag for history)
2. **Fix the issue** on a hotfix branch
3. **Create new patch release** (e.g., v0.1.1)
4. **Document the issue** in release notes

## Version Numbering Examples

- Bug fix: `0.1.0` → `0.1.1`
- New features: `0.1.0` → `0.2.0`
- Breaking changes: `0.1.0` → `1.0.0`
- Beta release: `0.2.0-beta.1`
- Release candidate: `0.2.0-rc.1`