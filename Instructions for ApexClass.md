# Apex Class Summarization Workflow

I'll create a text file outlining the workflow for implementing Apex Class summarization in your Salesforce AI Explainer extension.

```plaintext:c:\Projects\Salesforce Extension GPT\apex_class_workflow.txt
# Salesforce AI Explainer: Apex Class Summarization Workflow

## Overview
This document outlines the implementation plan for adding Apex Class summarization to the Salesforce AI Explainer Chrome extension, building on the existing architecture for Validation Rules and Flows.

## 1. User Interaction Flow

1. **Extension Activation**
   - User navigates to a Salesforce Apex Class page in Setup
   - User clicks the extension icon in Chrome toolbar
   - The popup.html loads and initializes

2. **Page Detection**
   - The extension checks if the current page is a Salesforce Apex Class page
   - This happens in the `initializePopup()` function in popup.js

3. **UI Preparation**
   - If on an Apex Class page, the extension shows the "Summarize" button
   - Basic Apex Class info is displayed (class name)

4. **Summarization Request**
   - User clicks the "🤖 Summarize" button
   - This triggers the `handleSummarize()` function with Apex Class handling

## 2. Technical Implementation Steps

### Step 1: Content Script Detection
Add Apex Class page detection to content.js:

```javascript
function extractApexClassInfo() {
  const url = window.location.href;
  console.log('Checking URL for Apex Class in content script:', url);
  
  // Check if we're on an Apex Class page
  const isApexClassPage = 
    url.includes('/ApexClass/') || 
    url.includes('setupid=ApexClasses') ||
    url.includes('setup/ApexClassDetail');
  
  if (!isApexClassPage) {
    return { isApexClassPage: false };
  }
  
  // Extract Apex Class ID from URL
  let apexClassId = '';
  
  // Different URL patterns for Lightning vs Classic
  if (url.includes('/ApexClass/')) {
    // Lightning URL format
    const urlParts = url.split('/');
    const idIndex = urlParts.indexOf('ApexClass') + 1;
    if (idIndex < urlParts.length) {
      apexClassId = urlParts[idIndex];
    }
  } else {
    // Classic URL format or other patterns
    const urlParams = new URLSearchParams(window.location.search);
    apexClassId = urlParams.get("id") || urlParams.get("classId");
  }
  
  return {
    isApexClassPage: true,
    apexClassId
  };
}
```

### Step 2: Update Message Handling in content.js
Add a new message handler for Apex Class detection:

```javascript
// In the existing chrome.runtime.onMessage.addListener function
if (request.action === 'checkApexClassPage') {
  sendResponse(extractApexClassInfo());
  return true;
}
```

### Step 3: Create Apex Class Utility File
Create utils/apex.js for Apex-specific processing:

```javascript
// utils/apex.js
// Handle Apex Class metadata processing

// Process Apex Class for AI analysis
function processApexClass(apexMetadata) {
  return {
    name: apexMetadata.Name,
    apiVersion: apexMetadata.ApiVersion,
    description: apexMetadata.Description || "",
    body: apexMetadata.Body || ""
  };
}

// Create prompt for OpenAI to analyze Apex Class
function createApexClassPrompt(apexData) {
  return `
Below is the source code for a Salesforce Apex Class named "${apexData.name}".

Please provide a concise summary that explains:
1. The main purpose of this class
2. Key methods and their functionality
3. Important patterns or design principles used
4. Any dependencies or external services it interacts with
5. Potential performance considerations

Make the summary clear and concise, focusing on what a developer would need to understand about this class at a glance.

Apex Class Name: ${apexData.name}
API Version: ${apexData.apiVersion}
${apexData.description ? `Description: ${apexData.description}` : ''}

Code:
${apexData.body}
`;
}

// Export functions
export {
  processApexClass,
  createApexClassPrompt
};
```

### Step 4: Add Apex Class Metadata Retrieval to salesforce.js

```javascript
// Add to utils/salesforce.js
async function getApexClassMetadata(apexClassId, sessionInfo) {
  try {
    if (!apexClassId) {
      throw new Error("Apex Class ID is required");
    }
    
    const url = `/services/data/v${API_VERSION}/tooling/sobjects/ApexClass/${apexClassId}`;
    console.log('Fetching Apex Class metadata from URL:', url);
    
    const result = await makeRestCall(url, sessionInfo);
    
    if (!result) {
      throw new Error("Apex Class not found");
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching Apex Class metadata:", error);
    throw error;
  }
}

// Add to export statement
export {
  // existing exports
  getApexClassMetadata
};
```

### Step 5: Add Apex Class Explanation to api.js

```javascript
// Add to utils/api.js
async function explainApexClass(apexClassMetadata, apiKey, model) {
  try {
    // Import the apex utility functions
    const { processApexClass, createApexClassPrompt } = await import('./apex.js');
    
    // Process the apex class metadata
    const processedApex = processApexClass(apexClassMetadata);
    
    // Create the prompt for OpenAI
    const prompt = createApexClassPrompt(processedApex);
    
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
            content: 'You are an expert in Salesforce Apex development. Explain the Apex code in clear, concise language that helps developers understand its purpose and functionality.'
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
    console.error("Error explaining Apex Class:", error);
    throw error;
  }
}

// Add to export statement
export {
  // existing exports
  explainApexClass
};
```

### Step 6: Update popup.js to Handle Apex Classes
Modify the initializePopup function to check for Apex Class pages:

```javascript
// After checking for validation rule and flow pages
// Check if it's an Apex Class page
console.log('Checking Apex Class page:', currentTab.url);
const apexResponse = await chrome.tabs.sendMessage(currentTab.id, { action: 'checkApexClassPage' });
console.log('Apex Class check response:', apexResponse);

if (apexResponse && apexResponse.isApexClassPage) {
  // We're on an Apex Class page
  currentApexClassId = apexResponse.apexClassId;
  
  // Get session
  sessionInfo = await getSession(currentHost);
  
  // Show Apex Class info
  ruleNameEl.textContent = 'Salesforce Apex Class';
  objectNameEl.textContent = `Class ID: ${currentApexClassId}`;
  
  hideElement(loadingEl);
  showElement(ruleInfoEl);
  return;
}
```

### Step 7: Update handleSummarize to Process Apex Classes
Add Apex Class handling to the handleSummarize function:

```javascript
// Add after validation rule and flow handling
else if (currentApexClassId) {
  // Handle Apex Class
  // Import required modules
  const { getApexClassMetadata } = await import('../utils/salesforce.js');
  const { explainApexClass } = await import('../utils/api.js');
  
  // Get Apex Class metadata
  const apexMetadata = await getApexClassMetadata(currentApexClassId, sessionInfo);
  
  // Update display name
  ruleNameEl.textContent = apexMetadata.Name || 'Apex Class';
  objectNameEl.textContent = `Version: ${apexMetadata.ApiVersion}`;
  
  // Get explanation from OpenAI
  const model = openaiModelSelect.value;
  const explanation = await explainApexClass(apexMetadata, apiKey, model);
  
  // Show explanation
  explanationContentEl.innerHTML = formatExplanation(explanation);
  showElement(explanationEl);
}
```

## 3. Special Considerations for Apex Classes

1. **Token Limits**
   - Apex Classes can be large, potentially exceeding OpenAI token limits
   - For large classes, implement truncation or focus on key sections
   - Consider adding a "partial analysis" warning for very large classes

2. **Performance Optimization**
   - Cache Apex Class explanations locally to reduce API calls
   - Implement progressive loading for large code bases

3. **Enhanced Analysis**
   - Consider specialized prompts for different types of Apex (triggers, batch jobs, etc.)
   - Add code quality suggestions based on Salesforce best practices

4. **UI Enhancements**
   - Add syntax highlighting for code snippets in the explanation
   - Provide collapsible sections for different parts of the analysis

## 4. README Updates
Update the README.md to include the new Apex Class feature:

- Add "Apex Class Explainer" to the Features section
- Add usage instructions for Apex Classes
- Update screenshots to show Apex Class analysis

## 5. Testing Plan
1. Test with different types of Apex Classes:
   - Simple utility classes
   - Complex trigger handlers
   - Batch Apex classes
   - API integration classes
   - Classes with many methods
2. Test with different Salesforce UI versions
3. Test with different token limits and model versions
```

This workflow document provides a comprehensive plan for implementing Apex Class summarization in your extension, building on your existing architecture while addressing the unique challenges of Apex code analysis.