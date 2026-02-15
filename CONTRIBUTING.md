# How to Remove Secrets From Your Git History and Push to GitHub

Your push was blocked because a secret (a service account key) was found in your commit history. Simply deleting the file isn't enough; you must remove it from all of your repository's history.

This guide provides two methods. **Method 1 is the recommended and simplest approach.**

---

### Method 1: Using BFG Repo-Cleaner (Recommended)

The BFG is a simpler, faster alternative to `git-filter-repo` specifically designed for removing unwanted data.

**Step 1: Download the BFG**

1.  Download the BFG tool from the official site. You'll get a `.jar` file (e.g., `bfg-1.14.0.jar`).
    *   **Official Download Link:** [https://rtyley.github.io/bfg-repo-cleaner/](https://rtyley.github.io/bfg-repo-cleaner/)

**Step 2: Clone a Fresh Copy of Your Repository**

The BFG works best on a fresh, "bare" clone of your repository.

```bash
git clone --mirror https://github.com/kranthisuryadevara25-cpu/aaura.git
```

**Step 3: Run the BFG to Remove the Secret File**

Navigate into your newly cloned `aaura.git` directory and run the BFG command. Replace `bfg.jar` with the name of the file you downloaded.

```bash
# Make sure you are inside the 'aaura.git' directory
java -jar bfg.jar --delete-files serviceAccountKey.json
```

**Step 4: Clean Up and Push the Changes**

The BFG has created a cleaned history. Now, you need to apply it.

```bash
# Still inside 'aaura.git'
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push
```

After this, your repository on GitHub will be clean. You can now delete the `aaura.git` folder from your local machine and continue working in your original project directory.

---

### Method 2: Using `git-filter-repo` (Advanced)

If you prefer `git-filter-repo`, ensure it's installed first.

**Prerequisites: Install `git-filter-repo`**

You can install it with Python's package manager, `pip`:

```bash
pip install git-filter-repo
```
If that command fails, try `pip3 install git-filter-repo`. If you still get a `command not found` error, you may need to install Python first or adjust your system's PATH.

**Step 1: Remove the Secret File from All History**

Run this command from the root directory of your project.

```bash
git filter-repo --path serviceAccountKey.json --path src/lib/firebase/secrets/serviceAccountKey.json --invert-paths
```

**Step 2: Add All Changes and Commit**

```bash
git add .
git commit -m "feat: Remove service account keys from git history"
```

**Step 3: Force Push to GitHub**

Because you have rewritten the history, you must perform a "force push".

```bash
git push origin main --force
```
