# GlowUp Empire Dress Store

A static ecommerce-style dress catalogue for GitHub Pages. The catalogue has 100 fixed dress slots. Each slot uses hard-coded front/back image filenames, while the admin page edits the text details for each dress. Customers browse dresses, view front and back images, fill a short order form, and continue to WhatsApp with the message auto-filled for `+233546904688`.

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
- `data/dresses.json` stores the 100 fixed dress slots plus editable names, descriptions, sizes, prices, and visibility settings.
- `assets/uploads/dress-slots/` stores the manually uploaded front/back dress photos.
- `assets/uploads/dress-placeholder.svg` is shown when a slot image has not been added yet.
- `tools/admin-server.js` runs the local admin server that can save, commit, and push uploads.

## Image Slot Names

Each slot has fixed image filenames. Place your manually uploaded images here:

```text
assets/uploads/dress-slots/dress-001-front.jpg
assets/uploads/dress-slots/dress-001-back.jpg
assets/uploads/dress-slots/dress-002-front.jpg
assets/uploads/dress-slots/dress-002-back.jpg
...
assets/uploads/dress-slots/dress-100-front.jpg
assets/uploads/dress-slots/dress-100-back.jpg
```

The store will show a placeholder image until the matching JPG exists. Do not rename the slot paths inside `data/dresses.json`; they are intentionally hard-coded.

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

3. Put any new dress JPGs into `assets/uploads/dress-slots/` using the exact slot filenames.
4. Open `http://127.0.0.1:8080/login.html` and log in.
5. Select a slot, edit the dress text, and click `Save text edits`.
6. Click `Upload & push`.

`Upload & push` saves `data/dresses.json`, stages `assets/uploads/` so your manually added images are included, creates a commit, and runs `git push`.

If the local admin server is not running, the admin page falls back to `Download JSON` for the text edits. Manually added images should still be placed in `assets/uploads/dress-slots/`.

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
