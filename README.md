# AI Text Lookup

A Chrome extension that provides AI-powered explanations for any selected text on the web. Highlight any word, phrase, or sentence and get instant definitions and explanations powered by the Groq API.

![AI Text Lookup Demo](https://img.shields.io/badge/Chrome-Extension-green?style=for-the-badge&logo=google-chrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge)
![Groq API](https://img.shields.io/badge/Powered%20by-Groq-purple?style=for-the-badge)

## ✨ Features

- **Instant AI Explanations**: Select any text and click "Ask AI" to get clear, concise explanations
- **Clean UI**: Modern, non-intrusive popup and dialog design
- **Markdown Support**: AI responses render with proper formatting (bold, italic, code)
- **Works Everywhere**: Functions on any webpage you visit

## 🚀 Installation

### Method 1: Easy Install (Packed Extension)

1. **Download the Extension**

   - Go to the [Releases page](https://github.com/akshattkashyap/aihelp-extension/releases).
   - Download the latest `aihelp-extension.crx` file to your computer.
   - **Important:** Right-click the asset link and choose "Save link as..." if clicking it directly doesn't work.

2. **Open Extensions Page**

   - In Chrome, navigate to `chrome://extensions/`.
   - **Enable Developer Mode** by toggling the switch in the top-right corner.

3. **Install via Drag-and-Drop**
   - Open the folder on your computer where you downloaded the `.crx` file.
   - **Drag and drop** the `.crx` file directly onto the `chrome://extensions/` page.
   - Click **"Add extension"** when prompted.

> **Note:** Do NOT double-click the `.crx` file to open it. Chrome blocks direct installs securely. You MUST drag and drop it onto the extensions page with Developer Mode on.

### Method 2: Load from Source (For Developers)

1. **Download the Source Code**

   ```bash
   git clone https://github.com/akshattkashyap/aihelp-extension.git
   ```

   Or download and extract the Source Code ZIP file.

2. **Load Unpacked**
   - Go to `chrome://extensions/`
   - Enable **Developer Mode** (top-right).
   - Click **"Load unpacked"**.
   - Select the extracted `aihelp-extension` folder.

## ⚙️ Configuration

### Setting Up Your API Key

This extension requires a Groq API key to function.

1. **Get an API Key**

   - Visit https://console.groq.com/keys
   - Create an API key and copy it

2. **Configure the Extension**
   - Right-click the extension icon in Chrome's toolbar
   - Select "Options" (or click the extension icon → ⚙️)
   - Paste your API key in the input field
   - Click "Save API Key"

> **Note**: Your API key is stored securely in Chrome's sync storage and never shared with third parties.

## 📖 Usage

1. Select any text on a webpage by highlighting it
2. A small "Ask AI" button will appear near your selection
3. Click the button to get an AI-powered explanation
4. A dialog box will display the response

### Dialog Controls

- **Close**: Click the X button or press `Escape`
- **More**: Click "More »" to search the term on Google
- **Click Outside**: Clicking outside the dialog closes it

## 🔧 Technical Details

### Permissions

| Permission   | Purpose                              |
| ------------ | ------------------------------------ |
| `storage`    | Save your API key securely           |
| `<all_urls>` | Enable the extension on all websites |

### API Configuration

- **Max Tokens**: 1000 tokens per response
- **Temperature**: 0.7 (balanced creativity/accuracy)

## 🐛 Troubleshooting

### "API key not configured" Error

1. Right-click the extension icon → Options
2. Enter your API key
3. Click "Save API Key"

### "Ask AI" Button Not Appearing

- Make sure text is properly selected (highlighted)
- Refresh the page and try again
- Check if the extension is enabled in `chrome://extensions/`

### Slow or No Response

- Check your internet connection
- Verify your API key is valid at https://console.groq.com/keys
- The Groq API may have temporary rate limits

### Extension Not Working on Certain Pages

- The extension cannot run on Chrome's internal pages (`chrome://`, `chrome-extension://`)
- Some websites may block content scripts

## 🔐 Privacy

- Your API key is stored locally in Chrome's sync storage
- Selected text is sent only to the Groq API
- No data is collected, stored, or shared by this extension
- All communication uses HTTPS

## 📄 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
   Made with ❤️ using Groq
</p>
