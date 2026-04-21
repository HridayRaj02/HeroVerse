# ⚡ HeroVerse

> **Browse. Compare. Save.** — A superhero intelligence app built with pure HTML, CSS & JavaScript.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![No Framework](https://img.shields.io/badge/No_Framework-000000?style=for-the-badge&logo=ghost&logoColor=white)

---

## 🦸 What is HeroVerse?

HeroVerse is a dark-themed superhero browser that lets you explore **731 Marvel & DC characters** — search them, filter by alignment, compare their power stats side by side, and save your favourites. No build tools, no frameworks, no setup. Just open and go.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏠 **Dashboard** | Stat cards showing total heroes, Marvel/DC split, heroes vs villains + top 9 most powerful |
| 🔍 **Search** | Live search by name across all tabs |
| 🎛️ **Filter** | Filter by alignment — Heroes, Villains, or Neutral |
| 🃏 **Hero Cards** | Image, publisher tag, alignment dot, Save & Compare buttons |
| 📋 **Hero Modal** | Full bio, appearance details, and animated power stat bars |
| ⚔️ **Compare** | Pick 2 heroes for a side-by-side stat breakdown with a winner |
| ❤️ **Favourites** | Save heroes from any tab and view them together |
| 📱 **Responsive** | Works on mobile with a hamburger nav |

---

## 🗂️ File Structure

```
heroverse/
├── 📄 index.html      ← all markup and layout
├── 🎨 style.css       ← all styling (plain hex colors, no variables)
└── ⚙️  script.js      ← all logic: fetch, render, filter, modal, compare, favs
```

Three files. That's it.

---

## 🚀 Getting Started

### Option 1 — Just open it
```bash
git clone https://github.com/your-username/heroverse.git
cd heroverse
open index.html
```

### Option 2 — Serve locally
```bash
npx serve .
```
```bash
python -m http.server 8000
```

No `npm install`. No `.env`. No config files.

---

## 🌐 Data Source

All hero data comes from the free **[Superhero API](https://github.com/akabab/superhero-api)** by akabab — served via jsDelivr CDN. No API key required.

```
https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/all.json
```

On load, all **731 heroes** are fetched once and stored in memory. Every search, filter, and pagination happens locally — no further requests.

---

## 🛠️ Tech Stack

```
✅ HTML5          — structure & layout
✅ CSS3           — styling, animations, responsive design
✅ Vanilla JS     — all logic, zero dependencies
✅ jsDelivr CDN   — serves the hero data
❌ No React
❌ No jQuery
❌ No Tailwind
❌ No build step
```

---

## 📸 Pages Overview

### 🏠 Dashboard
Animated counter cards for total, Marvel, DC, heroes, and villains — plus a grid of the 9 highest power-score characters.

### 🦸 All Heroes
Full paginated grid (24 per page) with live search and alignment filters. Each card shows the hero image, publisher tag, alignment dot, and action buttons.

### 🔴 Marvel / 🔵 DC
Same grid experience filtered to a single universe with their own search box.

### ❤️ Favourites
All your saved heroes in one place. Remove individually or clear all at once.

### ⚔️ Compare
Select any 2 heroes from any tab — a sticky bar appears at the bottom. Hit **Go** for a side-by-side stat breakdown across Intelligence, Strength, Speed, Durability, Power, and Combat.

---

## ⚠️ Known Limitations

- 💾 **Favourites don't persist** — clearing the tab resets them (no localStorage used)
- 🖼️ **Some images missing** — a few heroes in the API have broken image URLs, handled gracefully
- 📦 **Static data** — API is pinned to v0.3.0, no live updates

---

## 📁 Project Stats

```
index.html  →   ~90 lines
style.css   →  ~230 lines
script.js   →  ~220 lines
─────────────────────────
Total       →  ~540 lines of clean, readable code
```

---

## 📜 License

**MIT** — free to use, modify, and share.

---

<div align="center">
  Made with ❤️ using zero frameworks
</div>
