# AI Text Lookup

A Chrome extension that provides AI-powered explanations for any selected text on the web. Highlight any word, phrase, or sentence and get instant definitions and explanations powered by Google's Gemini AI.

![AI Text Lookup Demo](https://img.shields.io/badge/Chrome-Extension-green?style=for-the-badge&logo=google-chrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge)
![Gemini API](https://img.shields.io/badge/Powered%20by-Gemini%20AI-purple?style=for-the-badge)

## ✨ Features

- **Instant AI Explanations**: Select any text and click "Ask AI" to get clear, concise explanations
- **Clean UI**: Modern, non-intrusive popup and dialog design
- **Markdown Support**: AI responses render with proper formatting (bold, italic, code)
- **Works Everywhere**: Functions on any webpage you visit

## 🚀 Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Download the Extension**

   ```bash
   git clone https://github.com/yourusername/aihelp-extension.git
   ```

   Or download and extract the ZIP file.

2. **Open Chrome Extensions**

   - Navigate to `chrome://extensions/` in your Chrome browser
   - Or go to Menu → More Tools → Extensions

3. **Enable Developer Mode**

   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**

   - Click "Load unpacked"
   - Select the `aihelp-extension` folder containing `manifest.json`

5. **Pin the Extension** (Optional)
   - Click the puzzle icon in Chrome's toolbar
   - Pin "AI Text Lookup" for easy access

## ⚙️ Configuration

### Setting Up Your API Key and Model

This extension requires a Google Gemini API key to function.

1. **Get a Free API Key**

   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy your new API key

2. **Configure the Extension**
   - Right-click the extension icon in Chrome's toolbar
   - Select "Options" (or click the extension icon → ⚙️)
   - **Select your preferred Gemini model** from the dropdown:
     - **Gemini 2.5 Flash** (Default - Recommended)
     - Gemini 1.5 Flash
     - Gemini 1.5 Pro (Slower, more capable)
     - Gemini 3 Flash Preview (Experimental)
   - Paste your API key in the input field
   - Click "Save API Key"

> **Note**: Your API key and model preference are stored securely in Chrome's sync storage and never shared with third parties.

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

- **Default Model**: `gemini-2.5-flash` (customizable in options)
- **Available Models**: Gemini 2.5 Flash, 1.5 Flash, 1.5 Pro, 3 Flash Preview
- **Max Tokens**: 1000 tokens per response
- **Temperature**: 0.7 (balanced creativity/accuracy)

## 🐛 Troubleshooting

### "API key not configured" Error

1. Right-click the extension icon → Options
2. Enter your Gemini API key
3. Click "Save API Key"

### "Ask AI" Button Not Appearing

- Make sure text is properly selected (highlighted)
- Refresh the page and try again
- Check if the extension is enabled in `chrome://extensions/`

### Slow or No Response

- Check your internet connection
- Verify your API key is valid at [Google AI Studio](https://aistudio.google.com/)
- The Gemini API may have temporary rate limits

### Extension Not Working on Certain Pages

- The extension cannot run on Chrome's internal pages (`chrome://`, `chrome-extension://`)
- Some websites may block content scripts

## 🔐 Privacy

- Your API key is stored locally in Chrome's sync storage
- Selected text is sent only to Google's Gemini API
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
  Made with ❤️ using Google Gemini AI
</p>
