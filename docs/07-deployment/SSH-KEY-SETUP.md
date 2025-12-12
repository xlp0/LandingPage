# SSH Key Setup for GitHub

## Overview

This guide explains how to set up SSH key authentication with GitHub so you don't need to enter your passphrase every time you push.

---

## What We Did

### 1. **Added GitHub to SSH Config**

Added the following to `~/.ssh/config`:

```ssh
# GitHub - Auto-load SSH key
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    AddKeysToAgent yes
    UseKeychain yes
```

**What this does:**
- `AddKeysToAgent yes` - Automatically adds key to SSH agent
- `UseKeychain yes` - Stores passphrase in macOS Keychain

### 2. **Added Key to macOS Keychain**

Ran this command:
```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

**What this does:**
- Adds your SSH key to the macOS Keychain
- Stores the passphrase securely
- Automatically loads on system restart

---

## How It Works

### Before
```
git push origin main
→ Enter passphrase for key '/Users/Henrykoo/.ssh/id_ed25519': ❌
→ (You had to type it every time)
```

### After
```
git push origin main
→ Enumerating objects...
→ Writing objects...
→ To github.com:xlp0/LandingPage.git ✅
→ (No passphrase prompt!)
```

---

## Benefits

### Security
- ✅ Passphrase still protects your key
- ✅ Stored securely in macOS Keychain
- ✅ Only accessible to your user account

### Convenience
- ✅ No typing passphrase every time
- ✅ Automatic on system restart
- ✅ Works for all git operations (push, pull, fetch)

### Performance
- ✅ Faster git operations
- ✅ No interruptions in workflow
- ✅ Better for automation

---

## Verification

### Test SSH Connection
```bash
ssh -T git@github.com
```

**Expected output:**
```
Hi xlp0! You've successfully authenticated, but GitHub does not provide shell access.
```

### Test Git Push
```bash
git push origin main
```

**Expected:**
- No passphrase prompt
- Push succeeds immediately

---

## Troubleshooting

### Still Asking for Passphrase

**Problem:** Git still prompts for passphrase

**Solutions:**

1. **Check if key is loaded:**
   ```bash
   ssh-add -l
   ```
   Should show: `256 SHA256:... lckoo1230@gmail.com (ED25519)`

2. **Re-add key to keychain:**
   ```bash
   ssh-add --apple-use-keychain ~/.ssh/id_ed25519
   ```

3. **Check SSH config:**
   ```bash
   cat ~/.ssh/config | grep -A 5 "github.com"
   ```
   Should show the GitHub configuration

### Key Not Loading on Restart

**Problem:** Key not automatically loaded after restart

**Solution:**

Add this to `~/.ssh/config` (already done):
```ssh
Host *
    AddKeysToAgent yes
    UseKeychain yes
```

Or add to `~/.zshrc`:
```bash
# Auto-load SSH keys
ssh-add --apple-load-keychain 2>/dev/null
```

### Wrong Key Being Used

**Problem:** Git uses wrong SSH key

**Solution:**

1. **Check which keys are loaded:**
   ```bash
   ssh-add -l
   ```

2. **Remove all keys:**
   ```bash
   ssh-add -D
   ```

3. **Add only GitHub key:**
   ```bash
   ssh-add --apple-use-keychain ~/.ssh/id_ed25519
   ```

---

## SSH Config Explained

### Full GitHub Configuration

```ssh
Host github.com
    HostName github.com          # GitHub's server
    User git                     # Always 'git' for GitHub
    IdentityFile ~/.ssh/id_ed25519  # Your SSH key
    AddKeysToAgent yes           # Auto-add to SSH agent
    UseKeychain yes              # Store in macOS Keychain
```

### Optional Settings

```ssh
Host github.com
    # ... (above settings)
    IdentitiesOnly yes           # Only use this key for GitHub
    PreferredAuthentications publickey  # Use SSH key, not password
```

---

## Security Best Practices

### 1. **Keep Passphrase Strong**
- Use a strong passphrase for your SSH key
- Don't remove the passphrase
- Keychain stores it securely

### 2. **Protect Your Key**
```bash
# Ensure correct permissions
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

### 3. **Backup Your Key**
- Keep a secure backup of `~/.ssh/id_ed25519`
- Store in encrypted location
- Don't commit to git!

### 4. **Use Different Keys for Different Services**
```bash
# GitHub
ssh-keygen -t ed25519 -C "github@example.com" -f ~/.ssh/github_ed25519

# GitLab
ssh-keygen -t ed25519 -C "gitlab@example.com" -f ~/.ssh/gitlab_ed25519
```

---

## Alternative: Remove Passphrase (Not Recommended)

If you want to remove the passphrase entirely (less secure):

```bash
# Remove passphrase from key
ssh-keygen -p -f ~/.ssh/id_ed25519
# Press Enter twice for empty passphrase
```

**⚠️ Warning:** This makes your key less secure. Anyone with access to your computer can use it.

---

## macOS Keychain Access

### View Stored Passphrases

1. Open **Keychain Access** app
2. Search for "SSH"
3. Find your key entry
4. Double-click to view details

### Remove Stored Passphrase

1. Find SSH key in Keychain Access
2. Right-click → Delete
3. Next `git push` will ask for passphrase again

---

## Multiple GitHub Accounts

If you have multiple GitHub accounts:

```ssh
# Personal GitHub
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_personal
    AddKeysToAgent yes
    UseKeychain yes

# Work GitHub
Host github-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work
    AddKeysToAgent yes
    UseKeychain yes
```

**Clone with work account:**
```bash
git clone git@github-work:company/repo.git
```

---

## Summary

**What We Set Up:**
- ✅ SSH config for GitHub
- ✅ Automatic key loading
- ✅ Passphrase stored in Keychain
- ✅ No more passphrase prompts

**How It Works:**
1. SSH agent loads key from Keychain
2. Passphrase retrieved automatically
3. Git uses authenticated SSH connection
4. No user interaction needed

**Security:**
- ✅ Passphrase still protects key
- ✅ Stored in encrypted Keychain
- ✅ Only accessible to your user

**Result:**
```bash
git push origin main
# No passphrase prompt! 🎉
```

**Your GitHub authentication is now seamless! 🔑✨**
