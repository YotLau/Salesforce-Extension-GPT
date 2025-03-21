# 🔍 Salesforce AI Explainer

![Salesforce AI Explainer](https://img.shields.io/badge/Salesforce-AI%20Explainer-blue)
![Version](https://img.shields.io/badge/version-1.1-green)
![License](https://img.shields.io/badge/license-MIT-orange)

A Chrome extension that uses AI to explain complex Salesforce configurations in simple terms. Currently supports:
- ✅ Validation Rules
- ✅ Flows
- ✅ Apex Classes

## 🌟 Features

- **Validation Rule Explainer**: Analyzes validation rule formulas and explains them in plain English
- **Flow Explainer**: Breaks down complex Salesforce flows into understandable summaries
- **Apex Class Explainer**: Summarizes Apex code to help developers understand functionality quickly
- **Secure Authentication**: Uses your existing Salesforce session - no credentials stored
- **Privacy-Focused**: Your OpenAI API key stays in your browser, never sent to any server
- **Field Obfuscation**: Protects sensitive field names when sending data to OpenAI
- **Customizable Security**: Configure which types of fields should be protected
- **Simple UI**: Clean, intuitive interface that works seamlessly within Salesforce
- **Developer Mode**: Debug API interactions and see detailed logs

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
4. Select your preferred model (GPT-4o Mini, GPT-4o, or GPT-4)
5. Configure security settings for field protection
6. Click Save

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

### Explaining Apex Classes
1. Navigate to any Salesforce Apex Class in Setup
2. Click the extension icon
3. Click the 🤖 Summarize button
4. View the AI-generated explanation of the class purpose, methods, and patterns

### Security Settings
1. In the Settings panel, toggle "Protect Field Names" to enable/disable field obfuscation
2. Click "Customize Protected Fields" to configure which types of fields should be protected:
   - Custom Fields (ending with __c)
   - Standard Fields
   - Sensitive Fields (containing keywords like "password", "ssn", etc.)

### Developer Mode
1. To enable Developer Mode, open the browser console and type: `localStorage.setItem('devMode', 'true')`
2. With Developer Mode enabled, you'll see detailed logs of API interactions in the console
3. To disable: `localStorage.setItem('devMode', 'false')` or `localStorage.removeItem('devMode')`

## 🔒 Security & Privacy

- Your OpenAI API key is stored locally in Chrome's secure storage
- No data is sent to any server except OpenAI (for generating explanations)
- The extension uses your existing authenticated Salesforce session
- Field obfuscation replaces actual field names with generic placeholders before sending to OpenAI
- You can customize which types of fields are protected
- Only the minimum necessary metadata is extracted for analysis

## 🧩 Architecture

The extension has been refactored with a modular architecture:
- **Centralized Configuration**: API keys and models managed in a dedicated module
- **Improved Error Handling**: Consistent error handling across all components
- **Generic Component Explainer**: Unified approach to explaining different Salesforce components
- **Enhanced Prompts**: Better structured prompts for more accurate and useful explanations
- **Security Utilities**: Comprehensive field protection with customizable settings

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
