# 🚀 Git Workflow Quick Reference

## 📌 Daily Workflow (The Only Commands You Need)

### Starting New Work
```bash
git checkout main
git pull origin main
git checkout -b fix/your-feature-name
```

### Making Changes
```bash
# ... make your code changes ...
git add -A
git commit -m "fix: describe what you fixed"
git push origin fix/your-feature-name
```

### Creating Pull Request
1. Go to GitHub repo
2. Click **"Compare & pull request"** (green button)
3. Fill in title and description
4. Click **"Create pull request"**
5. Wait for review/approval
6. Click **"Merge pull request"** (green button)
7. Click **"Delete branch"**

### After Merge
```bash
git checkout main
git pull origin main
git branch -d fix/your-feature-name
```

---

## 🚫 Never Do This

```bash
# ❌ DON'T push to main directly
git push origin main

# ❌ DON'T merge locally
git checkout main
git merge my-branch
git push origin main

# ❌ DON'T force push to main
git push origin main --force
```

---

## ✅ Always Do This

```bash
# ✅ DO create feature branches
git checkout -b fix/my-fix

# ✅ DO push feature branches
git push origin fix/my-fix

# ✅ DO create PRs on GitHub
# (use the web UI)

# ✅ DO delete branches after merge
git branch -d fix/my-fix
```

---

## 🎯 Branch Names

| Type | Example |
|------|---------|
| Bug fix | `fix/reporting-manager-sync` |
| New feature | `feat/employee-search` |
| Refactor | `refactor/api-cleanup` |
| Documentation | `docs/setup-guide` |
| Chore | `chore/update-deps` |

---

## 💬 Commit Messages

```bash
# Bug fix
git commit -m "fix: resolve reporting manager mismatch"

# New feature
git commit -m "feat: add employee bulk import"

# Refactor
git commit -m "refactor: extract submission logic to service"

# Documentation
git commit -m "docs: add API documentation"
```

---

## 🆘 Common Scenarios

### I'm on the wrong branch!
```bash
# Stash your changes
git stash

# Switch to correct branch
git checkout -b fix/correct-branch

# Apply your changes
git stash pop
```

### I committed to main by accident!
```bash
# DON'T PUSH! Instead:
git reset HEAD~1  # Undo last commit (keeps changes)
git checkout -b fix/my-branch  # Create branch
git add -A
git commit -m "fix: my changes"
git push origin fix/my-branch
```

### I need to update my branch with latest main
```bash
git checkout main
git pull origin main
git checkout fix/my-branch
git rebase main  # or: git merge main
git push origin fix/my-branch --force-with-lease
```

---

## 📞 Need Help?

- See full guide: `.github/BRANCH_PROTECTION_GUIDE.md`
- GitHub docs: https://docs.github.com/en/pull-requests

---

**Tip:** Print this page and keep it next to your monitor! 📋

