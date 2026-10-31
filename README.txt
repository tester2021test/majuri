MAJURI PRO V2.7 — SIMPLE WEBSITE (NO PWA)

FILES:
- index.html: complete app, Firebase configuration, Google sign-in and Firestore integration in one file.
- firestore.rules.txt: paste these rules into Firebase Console > Firestore Database > Rules, then Publish.

GITHUB UPLOAD:
1. Open repository tester2021test/majuri.
2. Upload/replace ONLY index.html in the folder that currently serves the site.
3. Commit changes.
4. Keep the URL https://tester2021test.github.io/majuri/
5. No firebase folder, manifest, or service worker is needed. This version does not register a service worker or use a web app manifest.

FIREBASE:
- Authentication > Sign-in method: enable Google.
- Authentication > Settings > Authorized domains: add tester2021test.github.io.
- Firestore Database: create database in Production mode.
- Firestore > Rules: paste firestore.rules.txt and Publish.
- Approved email in this build: vivekdn2504@gmail.com.
- Firebase web config is embedded in index.html. It is a public client config, not a private key.

LOGIN:
The button uses signInWithRedirect, not a popup. Browser should navigate to Google and return to this page.
Use https://tester2021test.github.io/majuri/ (HTTPS), not a local file:// copy.
