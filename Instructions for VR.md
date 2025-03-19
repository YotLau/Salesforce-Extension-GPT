# Development Plan: Salesforce Validation Rule Explainer Chrome Extension

## Overview
Create a Chrome extension that explains Salesforce validation rules using OpenAI's GPT models. The extension will:
1. Extract validation rule details from Salesforce pages
2. Use the Salesforce Tooling API to get rule metadata
3. Send this metadata to OpenAI for summarization
4. Display an easy-to-understand explanation to the user

## Step 1: Set Up Project Structure
Create the following file structure:

```
salesforce-validation-explainer/
├── manifest.json
├── background.js
├── content.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── utils/
│   ├── api.js
│   └── salesforce.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Step 2: Create Manifest File
Create `manifest.json` with the following configuration:

```json
{
  "manifest_version": 3,
  "name": "Salesforce Validation Rule Explainer",
  "version": "1.0",
  "description": "Summarizes Salesforce validation rules using OpenAI",
  "permissions": ["storage", "activeTab", "cookies"],
  "host_permissions": ["https://*.salesforce.com/*", "https://*.force.com/*"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["https://*.salesforce.com/*", "https://*.force.com/*"],
    "js": ["content.js"]
  }]
}
```

## Step 3: Implement Background Script
Create `background.js` for session management and message handling:

```javascript
// background.js
// Handle session extraction from cookies and communication with content script

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "getSession") {
    extractSessionFromCookies(request.sfHost)
      .then(sessionInfo => sendResponse(sessionInfo))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Required for async response
  }
});

// Extract Salesforce session ID from cookies
async function extractSessionFromCookies(sfHost) {
  try {
    // Get all cookies for the Salesforce domain
    const cookies = await chrome.cookies.getAll({ domain: sfHost });
    
    // Find the session ID cookie (named "sid")
    const sidCookie = cookies.find(cookie => cookie.name === "sid");
    
    if (!sidCookie) {
      throw new Error("Session ID not found");
    }
    
    return { 
      key: sidCookie.value,
      hostname: sfHost
    };
  } catch (error) {
    console.error("Error extracting session:", error);
    throw error;
  }
}
```

## Step 4: Implement Content Script
Create `content.js` to detect validation rule pages and handle page interaction:

```javascript
// content.js
// Detect validation rule pages and handle page interaction

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkValidationRulePage") {
    const pageInfo = extractValidationRuleInfo();
    sendResponse(pageInfo);
  }
  return true;
});

// Extract validation rule info from current page
function extractValidationRuleInfo() {
  const url = window.location.href;
  
  // Check if we're on a validation rule page
  const isValidationRulePage = url.includes('/ValidationRule/') || 
                              (url.includes('setupid=ValidationRules') && url.includes('setupentity='));
  
  if (!isValidationRulePage) {
    return { isValidationRulePage: false };
  }
  
  // Extract validation rule ID from URL
  let validationRuleId = '';
  let objectName = '';
  
  if (url.includes('/ValidationRule/')) {
    // Lightning URL format
    const urlParts = url.split('/');
    const idIndex = urlParts.indexOf('ValidationRule') + 1;
    if (idIndex < urlParts.length) {
      validationRuleId = urlParts[idIndex];
    }
    
    // Try to extract object name
    const objectIndex = urlParts.indexOf('ValidationRule') - 1;
    if (objectIndex > 0) {
      objectName = urlParts[objectIndex];
    }
  } else {
    // Classic URL format
    const urlParams = new URLSearchParams(url.split('?')[1]);
    validationRuleId = urlParams.get('id');
    objectName = urlParams.get('setupentity');
  }
  
  return {
    isValidationRulePage: true,
    validationRuleId,
    objectName,
    url
  };
}
```

## Step 5: Create Utility Files
Create `utils/salesforce.js` for Salesforce API interactions:

```javascript
// utils/salesforce.js
// Handle Salesforce API interactions

// API version to use for Salesforce API calls
const API_VERSION = "58.0";

// Get Salesforce session
async function getSession(sfHost) {
  try {
    // Normalize host name
    sfHost = getMyDomain(sfHost);
    
    // Check localStorage first
    const storedToken = localStorage.getItem(`${sfHost}_access_token`);
    if (storedToken) {
      return {
        sessionId: storedToken,
        instanceHostname: sfHost
      };
    }
    
    // Request from background script if not in localStorage
    const message = await chrome.runtime.sendMessage({
      message: "getSession",
      sfHost
    });
    
    if (message && message.key) {
      return {
        sessionId: message.key,
        instanceHostname: getMyDomain(message.hostname)
      };
    }
    
    throw new Error("Session not found");
  } catch (error) {
    console.error("Error getting session:", error);
    throw error;
  }
}

// Make REST API call to Salesforce
async function makeRestCall(url, sessionInfo, method = "GET", body = null) {
  try {
    const sfHost = "https://" + sessionInfo.instanceHostname;
    const fullUrl = new URL(url, sfHost);
    
    // Add cache buster
    fullUrl.searchParams.append("cache", Math.random());
    
    const headers = {
      "Accept": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + sessionInfo.sessionId
    };
    
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    
    const response = await fetch(fullUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("REST API call failed:", error);
    throw error;
  }
}

// Get validation rule metadata using Tooling API
async function getValidationRuleMetadata(validationRuleId, sessionInfo) {
  try {
    const query = `SELECT Id, ValidationName, Active, ErrorDisplayField, ErrorMessage, Description, EntityDefinition.QualifiedApiName, Metadata FROM ValidationRule WHERE Id = '${validationRuleId}'`;
    const url = `/services/data/v${API_VERSION}/tooling/query?q=${encodeURIComponent(query)}`;
    
    const result = await makeRestCall(url, sessionInfo);
    
    if (!result.records || result.records.length === 0) {
      throw new Error("Validation rule not found");
    }
    
    return result.records[0];
  } catch (error) {
    console.error("Error fetching validation rule metadata:", error);
    throw error;
  }
}

// Helper to normalize Salesforce domain
function getMyDomain(hostname) {
  // Remove protocol if present
  hostname = hostname.replace(/^https?:\/\//i, "");
  
  // Handle My Domain and other Salesforce domain patterns
  return hostname;
}

// Export functions
export {
  getSession,
  makeRestCall,
  getValidationRuleMetadata,
  API_VERSION
};
```

Create `utils/api.js` for OpenAI API interactions:

```javascript
// utils/api.js
// Handle OpenAI API interactions

// Send validation rule to OpenAI for explanation
async function explainValidationRule(validationRule, apiKey, model) {
  try {
    const objectName = validationRule.EntityDefinition?.QualifiedApiName || '';
    const ruleName = validationRule.ValidationName;
    const formula = validationRule.Metadata?.errorConditionFormula || '';
    const errorMessage = validationRule.ErrorMessage || '';
    const description = validationRule.Description || '';
    
    const prompt = createPrompt(objectName, ruleName, formula, errorMessage, description);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Salesforce validation rules. Explain the validation rule in clear, concise language that both technical and non-technical users can understand.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error("Error explaining validation rule:", error);
    throw error;
  }
}

// Create prompt for OpenAI
function createPrompt(objectName, ruleName, formula, errorMessage, description) {
  return `
Please explain this Salesforce validation rule in simple terms:

Object: ${objectName}
Rule Name: ${ruleName}
Error Message: ${errorMessage}
Description: ${description}

Formula:
${formula}

Provide:
1. A summary of what this validation rule checks for
2. When it will prevent a record from being saved
3. The business purpose it likely serves
4. Any potential edge cases or limitations
`;
}

// Export functions
export {
  explainValidationRule
};
```

## Step 6: Create Popup UI
Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Salesforce Validation Rule Explainer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Validation Rule Explainer</h1>
    
    <div id="main-content">
      <div id="not-salesforce" class="status-message hidden">
        <p>Please navigate to a Salesforce validation rule page</p>
      </div>
      
      <div id="loading" class="status-message hidden">
        <p>Loading...</p>
      </div>
      
      <div id="error-message" class="status-message hidden">
        <p id="error-text"></p>
      </div>
      
      <div id="rule-info" class="hidden">
        <div class="rule-header">
          <h2 id="rule-name"></h2>
          <span id="object-name"></span>
        </div>
        
        <div class="actions">
          <button id="summarize-btn" class="primary-btn">🤖 Summarize</button>
        </div>
        
        <div id="explanation" class="hidden">
          <h3>Explanation</h3>
          <div id="explanation-content"></div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <button id="settings-btn">⚙️ Settings</button>
    </div>
    
    <div id="settings-panel" class="hidden">
      <h2>Settings</h2>
      <div class="setting-item">
        <label for="openai-key">OpenAI API Key</label>
        <input type="password" id="openai-key" placeholder="sk-...">
      </div>
      <div class="setting-item">
        <label for="openai-model">Model</label>
        <select id="openai-model">
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
        </select>
      </div>
      <div class="setting-actions">
        <button id="save-settings" class="primary-btn">Save</button>
        <button id="cancel-settings">Cancel</button>
      </div>
    </div>
  </div>
  
  <script type="module" src="popup.js"></script>
</body>
</html>
```

Create `popup/popup.css`:

```css
/* popup.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  width: 400px;
  min-height: 300px;
  padding: 15px;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

h1 {
  font-size: 18px;
  margin-bottom: 15px;
  color: #1a73e8;
}

h2 {
  font-size: 16px;
  margin-bottom: 10px;
}

h3 {
  font-size: 14px;
  margin: 15px 0 10px;
}

#main-content {
  flex: 1;
}

.status-message {
  padding: 20px;
  text-align: center;
  color: #666;
}

.rule-header {
  margin-bottom: 15px;
}

#object-name {
  color: #666;
  font-size: 14px;
}

.actions {
  margin: 15px 0;
}

button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #f1f3f4;
}

.primary-btn {
  background-color: #1a73e8;
  color: white;
}

.primary-btn:hover {
  background-color: #185abc;
}

button:hover {
  background-color: #e8eaed;
}

#explanation {
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.footer {
  margin-top: 15px;
  text-align: right;
}

#settings-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  padding: 15px;
  z-index: 10;
}

.setting-item {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.setting-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.hidden {
  display: none;
}
```

Create `popup/popup.js`:

```javascript
// popup.js
import { getSession, getValidationRuleMetadata } from '../utils/salesforce.js';
import { explainValidationRule } from '../utils/api.js';

// State variables
let currentTab = null;
let currentHost = null;
let validationRuleInfo = null;
let sessionInfo = null;

// DOM elements
const notSalesforceEl = document.getElementById('not-salesforce');
const loadingEl = document.getElementById('loading');
const errorMessageEl = document.getElementById('error-message');
const errorTextEl = document.getElementById('error-text');
const ruleInfoEl = document.getElementById('rule-info');
const ruleNameEl = document.getElementById('rule-name');
const objectNameEl = document.getElementById('object-name');
const summarizeBtn = document.getElementById('summarize-btn');
const explanationEl = document.getElementById('explanation');
const explanationContentEl = document.getElementById('explanation-content');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const openaiKeyInput = document.getElementById('openai-key');
const openaiModelSelect = document.getElementById('openai-model');
const saveSettingsBtn = document.getElementById('save-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');

// Initialize popup
document.addEventListener('DOMContentLoaded', initializePopup);

// Button click handlers
summarizeBtn.addEventListener('click', handleSummarize);
settingsBtn.addEventListener('click', openSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);

async function initializePopup() {
  showElement(loadingEl);
  hideElement(notSalesforceEl);
  hideElement(errorMessageEl);
  hideElement(ruleInfoEl);
  hideElement(explanationEl);
  
  try {
    // Load settings
    loadSettings();
    
    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    
    // Check if we're on a Salesforce domain
    const url = new URL(currentTab.url);
    currentHost = url.hostname;
    
    if (!isSalesforceDomain(currentHost)) {
      showElement(notSalesforceEl);
      hideElement(loadingEl);
      return;
    }
    
    // Check if we're on a validation rule page
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'checkValidationRulePage' });
    
    if (!response || !response.isValidationRulePage) {
      showElement(notSalesforceEl);
      hideElement(loadingEl);
      return;
    }
    
    // Store validation rule info
    validationRuleInfo = response;
    
    // Get session
    sessionInfo = await getSession(currentHost);
    
    // Show validation rule info
    ruleNameEl.textContent = 'Validation Rule';
    objectNameEl.textContent = validationRuleInfo.objectName || '';
    
    hideElement(loadingEl);
    showElement(ruleInfoEl);
    
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError('Failed to initialize: ' + error.message);
  }
}

async function handleSummarize() {
  try {
    // Check if we have OpenAI key
    const apiKey = openaiKeyInput.value.trim();
    if (!apiKey) {
      showError('Please enter your OpenAI API key in settings');
      return;
    }
    
    // Show loading
    summarizeBtn.disabled = true;
    summarizeBtn.textContent = 'Loading...';
    hideElement(explanationEl);
    
    // Get validation rule metadata
    const ruleMetadata = await getValidationRuleMetadata(
      validationRuleInfo.validationRuleId,
      sessionInfo
    );
    
    // Update rule name
    ruleNameEl.textContent = ruleMetadata.ValidationName || 'Validation Rule';
    objectNameEl.textContent = ruleMetadata.EntityDefinition?.QualifiedApiName || validationRuleInfo.objectName || '';
    
    // Get explanation from OpenAI
    const model = openaiModelSelect.value;
    const explanation = await explainValidationRule(ruleMetadata, apiKey, model);
    
    // Show explanation
    explanationContentEl.innerHTML = formatExplanation(explanation);
    showElement(explanationEl);
    
  } catch (error) {
    console.error('Error summarizing validation rule:', error);
    showError('Failed to summarize: ' + error.message);
  } finally {
    // Reset button
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = '🤖 Summarize';
  }
}

function openSettings() {
  showElement(settingsPanel);
}

function closeSettings() {
  hideElement(settingsPanel);
}

function saveSettings() {
  const apiKey = openaiKeyInput.value.trim();
  const model = openaiModelSelect.value;
  
  // Save to chrome.storage
  chrome.storage.sync.set({
    openaiKey: apiKey,
    openaiModel: model
  });
  
  closeSettings();
}

function loadSettings() {
  chrome.storage.sync.get(['openaiKey', 'openaiModel'], (result) => {
    if (result.openaiKey) {
      openaiKeyInput.value = result.openaiKey;
    }
    
    if (result.openaiModel) {
      openaiModelSelect.value = result.openaiModel;
    }
  });
}

// Helper functions
function isSalesforceDomain(hostname) {
  return hostname.includes('salesforce.com') || hostname.includes('force.com');
}

function showElement(element) {
  element.classList.remove('hidden');
}

function hideElement(element) {
  element.classList.add('hidden');
}

function showError(message) {
  errorTextEl.textContent = message;
  showElement(errorMessageEl);
  hideElement(loadingEl);
}

function formatExplanation(text) {
  // Convert line breaks to HTML and add basic formatting
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
```

## Step 7: Create Icon Files
Create or obtain icons for your extension in the following sizes:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

## Step 8: Test and Debug
1. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select your extension directory

2. Test on a Salesforce validation rule page:
   - Navigate to a validation rule in Salesforce
   - Click the extension icon
   - Configure OpenAI API key in settings
   - Click "🤖 Summarize"

3. Debug common issues:
   - Check console for errors
   - Verify session extraction
   - Test API calls to Salesforce and OpenAI
   - Handle error scenarios gracefully

## Step 9: Final Refinements
1. Add error handling for edge cases:
   - Invalid or expired sessions
   - API rate limits
   - Validation rules too large for context window

2. Optimize for performance:
   - Minimize unnecessary API calls
   - Use efficient DOM manipulations

3. Improve user experience:
   - Add loading indicators
   - Provide helpful error messages
   - Consider adding copy functionality for explanations

## Step 10: Package for Distribution
1. Create a ZIP file of your extension directory
2. Consider adding a basic README.md with usage instructions
3. Prepare for Chrome Web Store submission if desired


I've created comprehensive instructions for building the Salesforce Validation Rule Explainer Chrome extension from scratch. The instructions include:

1. **Complete File Structure** - All necessary files with their relationships clearly defined
2. **Detailed Code Implementations** - Full code for each component with comments explaining functionality
3. **Session Management** - Adaptation of the Salesforce Inspector Reloaded approach for secure session extraction
4. **Validation Rule Detection** - Logic to detect when users are on a validation rule page in both Classic and Lightning interfaces
5. **OpenAI Integration** - A carefully crafted prompting strategy that includes object context
6. **Error Handling** - Comprehensive error handling throughout the application
7. **User Interface** - A clean, intuitive popup interface with settings and explanation display
8. **Testing & Debugging Steps** - Instructions for loading and testing the extension

The instructions are structured as a step-by-step guide that an AI agent could follow to build the complete extension. Each file contains proper error handling, and the architecture follows Chrome extension best practices.

Would you like me to expand on any particular section or provide additional details about any component?