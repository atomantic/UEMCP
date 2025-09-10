# UEMCP Release Process

This document outlines the complete release process for UEMCP, from feature development to GitHub release publication.

## Overview

The UEMCP release process follows a structured workflow to ensure quality, consistency, and proper documentation:

1. **Feature Development** → Individual feature branches merged to `main`
2. **Release Preparation** → Version increment and release notes in dedicated branch
3. **Release Publication** → GitHub release with tags after merge

## Phase 1: Feature Development

### Development Workflow

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/your-feature-name

# Develop and test your feature
# ... make changes ...

# Create PR to main
gh pr create --title "feat: your feature description" --body "Feature details..."
```

### Before Merging Features

**Required Checks:**
- [ ] All tests pass
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Python files compile without errors
- [ ] Documentation updated if needed
- [ ] Code review approval

## Phase 2: Release Preparation

### When to Create a Release

Create a new release when:
- Major features are complete and tested
- Significant bug fixes are ready
- Following the roadmap milestones (see PLAN.md)
- At regular intervals for maintenance releases

### Release Preparation Steps

#### Step 1: Create Release Preparation Branch

```bash
# Ensure you're on latest main
git checkout main
git pull origin main

# Create release preparation branch
git checkout -b prep/vX.Y.Z-release-notes
```

#### Step 2: Update Version Numbers

Update version numbers in these files:

**Server Package:**
```bash
# Edit server/package.json
"version": "X.Y.Z"
```

**Plugin Configuration:**
```bash
# Edit plugin/UEMCP.uplugin
"VersionName": "X.Y.Z"
```

**Optional Version Flags:**
```bash
# For production releases, consider updating:
"IsBetaVersion": false,  # Set to false for stable releases
"IsExperimentalVersion": false
```

#### Step 3: Create Release Notes

Create `docs/release-notes/vX.Y.Z.md` following this structure:

```markdown
# UEMCP vX.Y.Z Release Notes

**Release Date:** [Month Year]  
**Theme:** [Brief theme description]

## 🎉 Overview
[Brief overview of what this release accomplishes]

## ✨ Major Features
[Detailed feature descriptions with code examples]

## 🔧 Technical Improvements
[Architecture and code quality improvements]

## 🐛 Bug Fixes
[List of bugs fixed]

## ⚠️ Breaking Changes
[Any breaking changes - prefer "None!" for backward compatibility]

## 📦 Installation
[Installation instructions - usually no changes]

## 🔄 Migration from vX.Y.Z-1
[Migration guide from previous version]

## 📚 Documentation Updates
[Documentation changes made]

## 🚀 What's Next
[Preview of next version objectives]

## 📊 Statistics
[Release statistics: new tools, bug fixes, etc.]

---

**Full Changelog**: https://github.com/atomantic/UEMCP/compare/vX.Y.Z-1...vX.Y.Z
```

#### Step 4: Update Project Documentation

**Update PLAN.md:**
- Mark completed version objectives as ✅
- Update current version status
- Update tool counts and statistics
- Outline next version priorities

**Check README.md:**
- Verify tool count is accurate
- Update feature lists if needed
- Confirm version mentions are current

#### Step 5: Verify Release Readiness

Run comprehensive checks:

```bash
# TypeScript compilation
cd server && npm run typecheck

# Linting
npm run lint

# Python compilation check
python -m py_compile plugin/Content/Python/ops/*.py
python -m py_compile plugin/Content/Python/utils/*.py

# Verify tool count matches documentation
grep -c "class.*Tool" server/src/tools/**/*.ts
```

#### Step 6: Commit and Create PR

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Release vX.Y.Z: [Theme] - [Brief Description]

- Add comprehensive vX.Y.Z release notes with detailed improvements
- Update version numbers to X.Y.Z in package.json and UEMCP.uplugin
- Update PLAN.md to reflect completed objectives and next roadmap
- [Other specific changes]

Key highlights:
- [Major feature 1]
- [Major feature 2] 
- [Major improvement]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push branch
git push -u origin prep/vX.Y.Z-release-notes

# Create PR
gh pr create --title "Release vX.Y.Z: [Theme] - [Brief Description]" \
  --body "## Summary
Prepare for UEMCP vX.Y.Z release with [brief description].

## Changes
- New release notes with detailed feature descriptions
- Updated version numbers across all files
- Updated project roadmap documentation

## Testing
✅ TypeScript compilation passes
✅ ESLint linting passes  
✅ Python compilation verified
✅ Documentation consistency verified

🤖 Generated with [Claude Code](https://claude.ai/code)"
```

## Phase 3: Release Publication

### After PR Merge

Once the release preparation PR is merged to main:

#### Step 1: Create and Push Tag

```bash
# Switch to main and pull latest
git checkout main
git pull origin main

# Create annotated tag
git tag -a vX.Y.Z -m "Release vX.Y.Z: [Theme]

[Brief description of major features and improvements]

Full release notes: https://github.com/atomantic/UEMCP/blob/main/docs/release-notes/vX.Y.Z.md"

# Push tag
git push origin vX.Y.Z
```

#### Step 2: Create GitHub Release

```bash
# Create GitHub release using the tag
gh release create vX.Y.Z \
  --title "UEMCP vX.Y.Z: [Theme] - [Brief Description]" \
  --notes-file docs/release-notes/vX.Y.Z.md \
  --latest
```

**Or via GitHub Web UI:**
1. Go to https://github.com/atomantic/UEMCP/releases
2. Click "Create a new release"  
3. Choose the tag `vX.Y.Z`
4. Set title: `UEMCP vX.Y.Z: [Theme] - [Brief Description]`
5. Copy contents from `docs/release-notes/vX.Y.Z.md` 
6. Check "Set as the latest release"
7. Click "Publish release"

## Version Numbering Guidelines

UEMCP follows semantic versioning:

- **Major (X.0.0)**: Breaking changes, major architecture changes
- **Minor (X.Y.0)**: New features, significant improvements  
- **Patch (X.Y.Z)**: Bug fixes, minor improvements

### Current Versioning Strategy

- **v0.x.x**: Pre-1.0 development releases
- **v1.0.0**: First production release
- **v1.x.x**: Post-1.0 stable releases

## Quality Checklist

### Before Creating Release Preparation PR

- [ ] All features are complete and tested
- [ ] No known critical bugs in core functionality
- [ ] Code review feedback addressed
- [ ] Documentation is current and accurate
- [ ] Version numbers updated consistently
- [ ] Release notes are comprehensive and accurate

### Before Publishing GitHub Release

- [ ] Release preparation PR is merged to main
- [ ] All CI checks pass on main branch
- [ ] Tag is created with proper annotation
- [ ] Release notes are formatted correctly
- [ ] Links and references work properly

## Rollback Procedures

### If Issues Found After Release

1. **Create hotfix branch** from the release tag
2. **Fix the critical issue**  
3. **Follow release process** for patch version (X.Y.Z+1)
4. **Clearly document** what was fixed in release notes

### If Release Must Be Withdrawn

```bash
# Delete tag locally and remotely
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z

# Mark GitHub release as draft or delete it
gh release delete vX.Y.Z
```

## Release Communication

After publishing a release:

1. **Update project documentation** links if needed
2. **Announce in relevant channels** (if applicable)
3. **Update any downstream projects** that depend on UEMCP
4. **Monitor for issues** and user feedback

## Tools and Automation

### Helpful Scripts

Consider creating these scripts to automate common tasks:

```bash
# scripts/bump-version.sh - Automate version updates
# scripts/create-release-notes.sh - Generate release notes template  
# scripts/verify-release.sh - Run all verification checks
```

### GitHub Actions (Future)

Consider adding GitHub Actions for:
- Automated testing on PRs
- Version validation
- Release note generation
- Automated tagging

## Best Practices

1. **Always test releases** in a separate environment first
2. **Keep release notes detailed** but focused on user impact  
3. **Maintain backward compatibility** whenever possible
4. **Use descriptive commit messages** for release preparation
5. **Tag releases consistently** with semantic versioning
6. **Document breaking changes** clearly and provide migration paths
7. **Verify all links** in release notes work correctly

---

**This process ensures consistent, high-quality releases that maintain UEMCP's production-ready standards.**