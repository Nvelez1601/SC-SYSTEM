Place the required .woff2 font files here so the app can work offline.

Expected filenames used by the CSS in `src/styles/index.css`:

- Sora-300.woff2
- Sora-400.woff2
- Sora-500.woff2
- Sora-600.woff2
- Sora-700.woff2
- SpaceGrotesk-500.woff2
- SpaceGrotesk-600.woff2
- SpaceGrotesk-700.woff2

Where to get them:
- Download Sora and Space Grotesk from Google Fonts and export the .woff2 files.
- Or use the variable font versions and update `src/styles/index.css` to point to the variable file.

After adding the files, run `npm run build` to include them in the `dist` bundle.