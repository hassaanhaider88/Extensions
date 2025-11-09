# Browser Extensions by HMK CodeWeb

This repository contains three custom browser extensions built to improve productivity and workflow across popular platforms. Each extension focuses on a specific task, making common actions faster and easier.

---

## 1. **SVG Copier for React Icons**

A simple tool that adds a small copy button on top of every icon inside the React Icons website. With a single click, the SVG markup is copied to your clipboard.

### Features

* Detects icons dynamically as the page updates
* Injects a compact copy button on each SVG
* Copies clean, ready‑to‑use SVG code
* Works with search and infinite scroll

### Technologies

* JavaScript (Content Script)
* MutationObserver
* DOM Manipulation

---

## 2. **YouTube Shorts Hider**

A clean extension that removes the "Shorts" section across YouTube. Focuses on a distraction‑free viewing experience.

### Features

* Hides Shorts rows from the homepage
* Removes Shorts buttons and suggestions from sidebars
* Works on search results and channel pages
* Lightweight and runs automatically

### Technologies

* JavaScript (Content Script)
* CSS Injection

---

## 3. **Pinterest Image URI Copier (COPIRE)**

Adds a "Copy Image URL" button on every Pinterest pin card. Clicking the button copies the highest‑quality image URL directly to your clipboard.

### Features

* Detects all pin cards, even during infinite scrolling
* Extracts the best quality from `srcset`
* Injects a clean, small button on every image
* Visual feedback (Copy → Copied)
* Includes optional popup UI and custom icon

### Technologies

* Manifest V3 Extension
* Content Script + CSS
* Clipboard API
* MutationObserver

---

## Installation (For All Extensions)

1. Download or clone this repository.
2. Open Chrome or any Chromium‑based browser.
3. Go to `chrome://extensions/`.
4. Enable **Developer Mode**.
5. Click **Load Unpacked**.
6. Select the extension folder you want to install.

Each extension has its own folder with:

* `manifest.json`
* `content.js`
* `style.css` (if required)
* `icons/` (optional)
* `popup.html` (if included)

---

## Folder Structure

```
root/
 ├── svg‑copier/
 ├── YT_short_Hidder/
 └── PinsImgURICopy/
```

---

## Credits

Created with focus, coffee, and curiosity by **HMK CodeWeb**.

If you want improvements, new features, or more extensions, feel free to reach out.

---

## License

Open for personal and learning use. Commercial use requires permission from HMK CodeWeb.
