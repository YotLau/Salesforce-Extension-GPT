# 🔍 Salesforce AI Explainer

![Salesforce AI Explainer](https://img.shields.io/badge/Salesforce-AI%20Explainer-blue)
![Version](https://img.shields.io/badge/version-1.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

A Chrome extension that uses AI to explain complex Salesforce configurations in simple terms. Currently supports:
- ✅ Validation Rules
- ✅ Flows

## 🌟 Features

- **Validation Rule Explainer**: Analyzes validation rule formulas and explains them in plain English
- **Flow Explainer**: Breaks down complex Salesforce flows into understandable summaries
- **Secure Authentication**: Uses your existing Salesforce session - no credentials stored
- **Privacy-Focused**: Your OpenAI API key stays in your browser, never sent to any server
- **Simple UI**: Clean, intuitive interface that works seamlessly within Salesforce

## 🛠️ Technologies Used

- **JavaScript**: Core extension functionality
- **HTML/CSS**: User interface
- **Chrome Extension API**: Browser integration
- **Salesforce Tooling API**: Metadata retrieval
- **OpenAI API**: AI-powered explanations

## 📋 Prerequisites

- Google Chrome browser
- Salesforce access with appropriate permissions
- OpenAI API key

## 🔧 Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Salesforce AI Explainer"
3. Click "Add to Chrome"

### Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your toolbar

## 🚀 Usage

### Setting Up
1. Click the extension icon in your Chrome toolbar
2. Click the ⚙️ Settings button
3. Enter your OpenAI API key
4. Select your preferred model (GPT-3.5 Turbo or GPT-4)
5. Click Save

### Explaining Validation Rules
1. Navigate to any Salesforce validation rule in your org
2. Click the extension icon
3. Click the 🤖 Summarize button
4. View the AI-generated explanation

### Explaining Flows
1. Navigate to any Salesforce flow in Flow Builder
2. Click the extension icon
3. Click the 🤖 Summarize button
4. View the AI-generated explanation

## 🔒 Security & Privacy

- Your OpenAI API key is stored locally in Chrome's secure storage
- No data is sent to any server except OpenAI (for generating explanations)
- The extension uses your existing authenticated Salesforce session
- Only the minimum necessary metadata is extracted for analysis

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add some new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
