# GlowUp Empire Dress Store

A static ecommerce-style dress catalogue for GitHub Pages. Customers browse dresses, open details, fill a short order form, and continue to WhatsApp with the message auto-filled for `+233546904688`.

## Ready for GitHub

Upload or commit this whole project folder to GitHub, but do not upload `.git/`, `.agents/`, or `.codex/`. The `.gitignore` file already excludes workspace-only folders and common temporary files.

Required project files:

- `.nojekyll`
- `index.html`
- `login.html`
- `admin.html`
- `README.md`
- `package.json`
- `assets/`
- `data/`
- `tools/`

After pushing to GitHub, enable GitHub Pages:

1. Open the GitHub repository.
2. Go to `Settings` > `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select your main branch and `/root`.
5. Save, then open the GitHub Pages URL after GitHub finishes publishing.

The public customer store works directly on GitHub Pages. No build step is required.

## Files

- `index.html` is the public shop.
- `login.html` is the admin login page.
- `admin.html` is the catalogue upload manager.
- `data/dresses.json` stores product names, descriptions, sizes, prices, and image paths.
- `assets/uploads/` stores dress photos.
- `tools/admin-server.js` runs the local admin server that can save, commit, and push uploads.

## Admin Login

Default credentials:

- Username: `admin`
- Password: `GlowUp@2026`

This is a static GitHub Pages site, so the login is only a local content-management gate. Anyone who can inspect the public JavaScript can see how it works. The customer page links to `login.html`, and the upload/push feature is meant to be used from your local computer through the admin server.

## Add Dresses

Recommended local publishing flow:

1. Make sure this folder is a Git repo with a GitHub remote and that `git push` works from your terminal.
2. Run the local admin server from the project folder:

   ```powershell
   node tools/admin-server.js 8080
   ```

3. Open `http://127.0.0.1:8080/login.html` and log in.
4. Add or edit a dress, choose a photo, and click `Save dress`.
5. Click `Upload & push`.

`Upload & push` saves `data/dresses.json`, saves any new images into `assets/uploads/`, runs `git add`, creates a commit, and runs `git push`.

If the local admin server is not running, the admin page falls back to `Download JSON`. Any downloaded image files should go in `assets/uploads/`.

## Run Customer Store Locally

From this folder:

```powershell
node tools/local-server.js 8080
```

Then open:

- Store: `http://127.0.0.1:8080/`
- Login: `http://127.0.0.1:8080/login.html`

## GitHub Pages

Push this folder to GitHub, then enable Pages for the repository branch in GitHub settings. No build step is required.

## Check Before Uploading

Run:

```powershell
node --check assets/js/store.js
node --check assets/js/app.js
node --check assets/js/login.js
node --check assets/js/admin.js
node --check tools/local-server.js
node --check tools/admin-server.js
```

This checks the JavaScript files for syntax errors.

## Change WhatsApp Number

Edit `whatsappNumber` in `assets/js/store.js`.
