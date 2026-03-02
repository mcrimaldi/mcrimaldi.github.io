# Eng. Mariano Crimaldi, Ph.D. - Personal Portfolio

A terminal-style personal portfolio website with CRT effects, live publication metrics from Scopus/OpenAlex, and responsive design.

🌐 **Live at**: [https://mcrimaldi.github.io](https://mcrimaldi.github.io)

## 🚀 Deploy to GitHub Pages

### Quick Setup (5 minutes)

1. **Create a new repository** on GitHub named exactly: `mcrimaldi.github.io`
   - Go to [github.com/new](https://github.com/new)
   - Repository name: `mcrimaldi.github.io`
   - Keep it **Public**
   - Do NOT initialize with README

2. **Upload all files** from this folder:
   - Go to your new repository
   - Click "uploading an existing file" or drag & drop all files
   - Make sure to include the hidden `.nojekyll` file!
   - Commit the changes

3. **Enable GitHub Pages** (usually automatic for user sites):
   - Go to Settings → Pages
   - Source should be "Deploy from a branch"
   - Branch: `main` (or `master`), folder: `/ (root)`
   - Save

4. **Wait 1-2 minutes** and visit: `https://mcrimaldi.github.io`

### Alternative: Using Git Command Line

```bash
# Clone your empty repository
git clone https://github.com/mcrimaldi/mcrimaldi.github.io.git
cd mcrimaldi.github.io

# Copy all files from this folder (including hidden files)
cp -r /path/to/terminal-landing/* .
cp /path/to/terminal-landing/.nojekyll .

# Push to GitHub
git add .
git commit -m "Initial portfolio deployment"
git push origin main
```

## ⚙️ Configuration

### Publications - Two Options

#### Option 1: OpenAlex/ORCID (Recommended - No API Key Needed!)

Edit `content/publications.json` and add your ORCID:

```json
{
  "orcid": "0000-0002-1234-5678",
  "scholarProfile": "https://scholar.google.com/citations?user=YOUR_ID",
  "scopusProfile": "https://www.scopus.com/authid/detail.uri?authorId=YOUR_ID"
}
```

✅ **That's it!** OpenAlex will fetch your publications automatically.

**Find your ORCID:** Go to [orcid.org](https://orcid.org) and sign in (or register).

#### Option 2: Scopus Data (Requires Local Script)

Scopus API doesn't support browser requests, so you need to fetch data locally:

1. **Create `.env` file** (copy from `.env.example`):
   ```
   SCOPUS_API_KEY=your_api_key_here
   SCOPUS_AUTHOR_ID=57191481522
   ```

2. **Run the fetch script:**
   ```bash
   node fetch-scopus.js
   ```

3. **Commit and push** the updated `content/publications.json`

⚠️ **Security:** The `.env` file is in `.gitignore` and will NOT be uploaded to GitHub.

---

### Profile Information

| File | Content |
|------|---------|
| `content/about.md` | Your bio/introduction |
| `content/skills.json` | Skills and proficiency levels |
| `content/projects.json` | Research projects |
| `content/experience.json` | Work experience timeline |
| `content/contact.json` | Contact info and social links |

### Profile Image

Replace `assets/profile.png` with your photo. For best results:
- Black & white or grayscale
- Square aspect ratio
- Minimum 200x200 pixels

### Quick Facts (About Section)

Edit `js/plugins/AboutSection.js` around line 80:

```javascript
const facts = [
  { label: 'Institution', value: 'Your University', icon: '◈' },
  { label: 'Department', value: 'Your Department', icon: '◆' },
  { label: 'Role', value: 'Your Role', icon: '◉' },
  { label: 'Location', value: 'Your City', icon: '◇' }
];
```

### ASCII Header Name

Edit `index.html` - the ASCII art block near line 88.

## 🎨 Themes

Press `T` or click the theme button to switch between:
- 🟢 Green Classic (default)
- 🟠 Amber Vintage
- 🔵 Cyan Modern
- 🟣 Purple Haze
- 🟢 Matrix

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-6` | Jump to section |
| `T` | Change theme |
| `E` | Toggle effects |
| `?` | Help |
| `Esc` | Collapse all sections |

## 📁 File Structure

```
mcrimaldi.github.io/
├── index.html              # Main page
├── config.json             # Global settings
├── .nojekyll               # Disable Jekyll processing
├── assets/
│   └── profile.png         # Your profile photo
├── content/
│   ├── about.md            # Bio content
│   ├── skills.json         # Skills data
│   ├── projects.json       # Projects data
│   ├── experience.json     # Experience data
│   ├── contact.json        # Contact info
│   └── publications.json   # Scopus/OpenAlex config
├── css/
│   └── base.css            # All styles
└── js/
    ├── main.js             # Entry point
    ├── core/               # Core modules
    ├── plugins/            # Section plugins
    ├── effects/            # Visual effects
    └── adapters/           # Content adapters
```

## 🔧 Troubleshooting

### Site not loading?
- Ensure `.nojekyll` file exists in root
- Check GitHub Pages settings (Settings → Pages)
- Wait a few minutes for deployment

### Publications not showing?
- Verify Scopus API key is valid
- Check browser console for errors (F12)
- Ensure you're accessing via HTTPS (required for API calls)

### CORS errors?
- Scopus API must be called from a proper domain
- GitHub Pages provides HTTPS which should work
- Some institutional API keys may have domain restrictions

## 📄 License

MIT License - Feel free to use and modify!

---

Made with ❤️ using vanilla JavaScript, no build tools required.
