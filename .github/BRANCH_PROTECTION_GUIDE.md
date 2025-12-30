# 🛡️ Branch Protection Setup Guide

## ✅ Step 1: Enable Branch Protection on GitHub

### Navigate to Settings
1. Go to: https://github.com/Oldane-PM/Invoicing-Platform/settings
2. Click **Branches** (left sidebar)
3. Under "Branch protection rules", click **Add rule**

---

### Configure Protection for `main`

**Branch name pattern:**
```
main
```

**Required Settings:**

#### ✅ Protect matching branches
- [x] **Require a pull request before merging**
  - Required approvals: `1` (or `0` if solo dev, but still enforces PR workflow)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (optional)

#### ✅ Require status checks before merging
- [x] Require branches to be up to date before merging

#### ✅ Other restrictions
- [x] **Require conversation resolution before merging** (ensures all comments addressed)
- [x] **Include administrators** (no one can bypass, including repo owner)
- [ ] Allow force pushes: **LEAVE UNCHECKED** ❌
- [ ] Allow deletions: **LEAVE UNCHECKED** ❌

#### ✅ Rules applied to everyone
- [x] **Do not allow bypassing the above settings**

**Click "Create" or "Save changes"**

---

## 📋 Step 2: Proper Git Workflow (From Now On)

### Creating a New Feature/Fix

```bash
# 1. Always start from main
git checkout main
git pull origin main

# 2. Create feature branch (use descriptive names)
git checkout -b fix/bug-description
# or
git checkout -b feat/feature-name
# or
git checkout -b refactor/what-you-refactored

# 3. Make your changes
# ... edit files ...

# 4. Stage and commit
git add -A
git commit -m "fix: clear description of what you fixed"

# 5. Push to feature branch (NOT main!)
git push origin fix/bug-description
```

---

### Creating a Pull Request

**Option A: Via GitHub CLI (if installed)**
```bash
gh pr create --title "Fix: Bug description" --body "Detailed description"
```

**Option B: Via GitHub Web UI (Recommended)**
1. Go to: https://github.com/Oldane-PM/Invoicing-Platform
2. GitHub will show a banner: **"fix/bug-description had recent pushes"**
3. Click **"Compare & pull request"**
4. Fill in:
   - **Title**: Clear summary (e.g., "Fix: Reporting manager mismatch")
   - **Description**: What, why, how, testing steps
   - **Reviewers**: Add if working with team
5. Click **"Create pull request"**

---

### Merging the Pull Request

**🚨 NEVER use command line to merge! Always use GitHub UI:**

1. Review the changes in GitHub PR view
2. Check the "Files changed" tab
3. Ensure all checks pass (if CI/CD enabled)
4. Click **"Merge pull request"** (green button)
5. Choose merge strategy:
   - **Create a merge commit** (recommended, preserves history)
   - **Squash and merge** (clean linear history)
   - **Rebase and merge** (no merge commit, clean history)
6. Click **"Confirm merge"**
7. Click **"Delete branch"** (cleans up remote)

---

### After Merge: Update Local

```bash
# Switch back to main
git checkout main

# Pull the merged changes
git pull origin main

# Delete local feature branch
git branch -d fix/bug-description

# Verify remote branch was deleted (should show "deleted")
git remote prune origin

# You're now ready for next feature!
git checkout -b feat/next-feature
```

---

## 🚫 What NOT to Do

### ❌ NEVER push directly to main
```bash
# BAD - DON'T DO THIS
git checkout main
git commit -m "quick fix"
git push origin main  # ❌ Will be blocked by branch protection
```

### ❌ NEVER force push to main
```bash
# BAD - DON'T DO THIS
git push origin main --force  # ❌ Blocked by protection
```

### ❌ NEVER merge locally then push
```bash
# BAD - DON'T DO THIS
git checkout main
git merge fix/my-branch  # ❌ Merge locally
git push origin main     # ❌ Push merged main
```

---

## ✅ What TO Do

### ✅ Always use Pull Requests
```bash
# GOOD
git checkout -b fix/my-fix
git commit -m "fix: something"
git push origin fix/my-fix
# Then create PR on GitHub
```

### ✅ Keep branches focused
- One feature = One branch = One PR
- Small, reviewable changes
- Clear commit messages

### ✅ Delete merged branches
- After PR is merged, delete the branch
- Keeps repo clean
- Prevents confusion

---

## 🔧 Branch Naming Conventions

Use prefixes to indicate type:

| Prefix | Use Case | Example |
|--------|----------|---------|
| `fix/` | Bug fixes | `fix/reporting-manager-sync` |
| `feat/` | New features | `feat/employee-dashboard` |
| `refactor/` | Code refactoring | `refactor/api-structure` |
| `chore/` | Maintenance | `chore/update-dependencies` |
| `docs/` | Documentation | `docs/api-guide` |
| `test/` | Tests only | `test/employee-api` |

---

## 📝 Commit Message Format

```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**Types:**
- `fix:` - Bug fix
- `feat:` - New feature
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Test additions/changes
- `perf:` - Performance improvements

**Examples:**
```bash
git commit -m "fix: resolve reporting manager mismatch in drawer"

git commit -m "feat: add employee search filter"

git commit -m "refactor: extract manager assignment logic to DAL"
```

---

## 🎯 Current Status After Revert

✅ **Main branch**: Reverted back to commit `41ed5fa`  
✅ **Feature branch**: `fix/reporting-manager-sync` still has your changes  
✅ **Next step**: Create PR from feature branch

---

## 📖 Additional Resources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Creating a Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Created:** December 30, 2025  
**Purpose:** Enforce proper git workflow and prevent direct pushes to main

