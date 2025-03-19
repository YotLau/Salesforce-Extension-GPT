// popup.js
import { getSession, getValidationRuleMetadata } from '../utils/salesforce.js';
import { explainValidationRule } from '../utils/api.js';

// State variables
let currentTab = null;
let currentHost = null;
let validationRuleInfo = null;
let sessionInfo = null;
let currentFlowId = null;  // Add this line

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

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);

// Add event listeners
summarizeBtn.addEventListener('click', handleSummarize);
settingsBtn.addEventListener('click', openSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);

// Add a variable to store the Apex Class ID
let currentApexClassId = null;

// Update the initializePopup function to check for Apex Class pages
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
    try {
      console.log('Checking validation rule page:', currentTab.url);
      const vrResponse = await chrome.tabs.sendMessage(currentTab.id, { action: 'checkValidationRulePage' });
      console.log('Content script response:', vrResponse);
      
      if (vrResponse && vrResponse.isValidationRulePage) {
        // Store validation rule info
        validationRuleInfo = vrResponse;
        
        // Get session
        sessionInfo = await getSession(currentHost);
        
        // Show validation rule info
        ruleNameEl.textContent = 'Validation Rule';
        objectNameEl.textContent = validationRuleInfo.objectName || '';
        
        hideElement(loadingEl);
        showElement(ruleInfoEl);
        return;
      }
      
      // Check if it's a flow page
      console.log('Checking flow page:', currentTab.url);
      const flowResponse = await chrome.tabs.sendMessage(currentTab.id, { action: 'checkFlowPage' });
      console.log('Flow check response:', flowResponse);
      
      if (flowResponse && flowResponse.isFlowPage) {
        // Store flow ID
        currentFlowId = flowResponse.flowId;
        
        // Get session
        sessionInfo = await getSession(currentHost);
        
        // Show flow info
        ruleNameEl.textContent = 'Salesforce Flow';
        objectNameEl.textContent = `Flow ID: ${currentFlowId}`;
        
        hideElement(loadingEl);
        showElement(ruleInfoEl);
        return;
      }
      
      // Check if it's an Apex Class page
      console.log('Checking Apex Class page:', currentTab.url);
      const apexResponse = await chrome.tabs.sendMessage(currentTab.id, { action: 'checkApexClassPage' });
      console.log('Apex Class check response:', apexResponse);
      
      if (apexResponse && apexResponse.isApexClassPage) {
        // Store Apex Class ID
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
      
      // Not on a supported page
      showElement(notSalesforceEl);
      hideElement(loadingEl);
      
    } catch (error) {
      console.error('Error communicating with content script:', error);
      showError('Content script not responding. Please refresh the page and try again. URL: ' + currentTab.url);
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError('Error initializing: ' + error.message);
  }
}

// Update the handleSummarize function to process Apex Classes
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
    
    // Determine if we're handling a validation rule, flow, or apex class
    if (validationRuleInfo && validationRuleInfo.validationRuleId) {
      // Handle validation rule - existing code
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
    } 
    else if (currentFlowId) {
      // Handle flow - existing code
      // Import required modules
      const { getFlowMetadata } = await import('../utils/salesforce.js');
      const { explainFlow } = await import('../utils/api.js');
      
      // Get flow metadata
      const flowMetadata = await getFlowMetadata(currentFlowId, sessionInfo);
      
      // Get explanation from OpenAI
      const model = openaiModelSelect.value;
      const explanation = await explainFlow(flowMetadata, apiKey, model);
      
      // Show explanation
      explanationContentEl.innerHTML = formatExplanation(explanation);
      showElement(explanationEl);
    }
    else if (currentApexClassId) {
      // Handle Apex Class
      console.log('Processing Apex Class with ID:', currentApexClassId);
      
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
    } else {
      throw new Error('No validation rule, flow, or Apex class identified');
    }
    
  } catch (error) {
    console.error('Error summarizing:', error);
    showError(`Error summarizing: ${error.message}`);
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
  // Update to include salesforce-setup.com domain
  return hostname.includes('salesforce.com') || 
         hostname.includes('force.com') || 
         hostname.includes('salesforce-setup.com');
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

// Add these functions to your existing popup.js file

// Check if current page is a flow page
async function checkForFlowPage() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tabs[0].id, { action: "checkFlowPage" });
    
    if (response && response.isFlowPage) {
      // We're on a flow page
      document.getElementById('not-salesforce').classList.add('hidden');
      document.getElementById('rule-info').classList.remove('hidden');
      
      // Update UI to show flow info
      document.getElementById('rule-name').textContent = "Salesforce Flow";
      document.getElementById('object-name').textContent = `Flow ID: ${response.flowId}`;
      
      // Store flow ID for later use
      currentFlowId = response.flowId;
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking for flow page:", error);
    return false;
  }
}

// Explain the current flow
async function explainCurrentFlow() {
  try {
    if (!currentFlowId) {
      showError("No flow ID found");
      return;
    }
    
    // Show loading state
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('explanation').classList.add('hidden');
    
    // Get API key from storage
    const { openaiKey, openaiModel } = await chrome.storage.sync.get(['openaiKey', 'openaiModel']);
    
    if (!openaiKey) {
      showError("Please set your OpenAI API key in the settings");
      return;
    }
    
    // Get active tab to determine Salesforce domain
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tabs[0].url);
    const sfHost = url.hostname;
    
    // Import required modules
    const { getSession, getFlowMetadata } = await import('../utils/salesforce.js');
    const { explainFlow } = await import('../utils/api.js');
    
    // Get Salesforce session
    const session = await getSession(sfHost);
    
    // Get flow metadata
    const flowMetadata = await getFlowMetadata(currentFlowId, session);
    
    // Get explanation from OpenAI
    const explanation = await explainFlow(flowMetadata, openaiKey, openaiModel);
    
    // Update UI with explanation
    document.getElementById('explanation-content').innerHTML = formatExplanation(explanation);
    document.getElementById('explanation').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
  } catch (error) {
    showError(`Error explaining flow: ${error.message}`);
  }
}

// Modify your initialization function to check for both validation rules and flows
async function initPopup() {
  try {
    // Show loading state
    document.getElementById('loading').classList.remove('hidden');
    
    // Check if we're on a Salesforce page
    const isValidationRulePage = await checkForValidationRulePage();
    
    if (!isValidationRulePage) {
      // If not a validation rule page, check if it's a flow page
      const isFlowPage = await checkForFlowPage();
      
      if (!isFlowPage) {
        // Not on a relevant Salesforce page
        document.getElementById('not-salesforce').classList.remove('hidden');
        document.getElementById('rule-info').classList.add('hidden');
      }
    }
    
    // Hide loading state
    document.getElementById('loading').classList.add('hidden');
    
    // Set up event listeners
    document.getElementById('summarize-btn').addEventListener('click', async () => {
      if (currentValidationRuleId) {
        await explainCurrentValidationRule();
      } else if (currentFlowId) {
        await explainCurrentFlow();
      }
    });
    
    // Other event listeners...
  } catch (error) {
    showError(`Error initializing popup: ${error.message}`);
  }
}