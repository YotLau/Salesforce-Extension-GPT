// utils/api.js
// Handle API interactions with OpenAI

// Import security utilities
import { createFieldMapping, restoreFieldNames, storeFieldMapping, getFieldMapping } from './security.js';

// Create a prompt for OpenAI based on validation rule metadata
function createPrompt(ruleMetadata) {
  // Extract the formula from metadata
  const formula = ruleMetadata.Metadata?.errorConditionFormula || '';
  const ruleName = ruleMetadata.ValidationName || 'Unnamed Rule';
  const objectName = ruleMetadata.EntityDefinition?.QualifiedApiName || 'Unknown Object';
  const errorMessage = ruleMetadata.ErrorMessage || '';
  const description = ruleMetadata.Description || '';
  
  // Create a prompt for OpenAI
  return `
Please explain this Salesforce validation rule in simple terms:

Rule Name: ${ruleName}
Object: ${objectName}
${description ? `Description: ${description}` : ''}
Error Message: ${errorMessage}

Formula:
${formula}

Explain what this validation rule does, when it will block a record from being saved, and how a user can fix the error. Please be concise and use bullet points where appropriate.
`;
}

// Explain a validation rule using OpenAI
// Add this function near the top of the file
function logApiInteraction(prompt, response, metadata, isObfuscated = false) {
  console.group('🔍 OpenAI API Interaction');
  console.log('📤 Sending to OpenAI:');
  console.log(prompt);
  
  if (isObfuscated) {
    console.log('🔒 Using obfuscated field names');
    console.log('Original metadata:', metadata);
  }
  
  console.log('📥 Received from OpenAI:');
  console.log(response);
  console.groupEnd();
}

// Modify the explainValidationRule function
async function explainValidationRule(ruleMetadata, apiKey, model) {
  try {
    // Check if field obfuscation is enabled
    const { fieldObfuscationEnabled = true } = await chrome.storage.sync.get(['fieldObfuscationEnabled']);
    
    let prompt;
    let originalMetadata = null;
    
    if (fieldObfuscationEnabled) {
      // Create obfuscated version with mapping
      const { obfuscatedMetadata, reverseMap } = createFieldMapping(ruleMetadata);
      originalMetadata = JSON.parse(JSON.stringify(ruleMetadata));
      prompt = createPrompt(obfuscatedMetadata);
      
      // Store the mapping for later use
      storeFieldMapping(ruleMetadata.Id, reverseMap);
    } else {
      prompt = createPrompt(ruleMetadata);
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Salesforce validation rules. Explain the validation rule in clear, concise language that helps users understand its purpose and how to comply with it.'
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
    const content = result.choices[0].message.content;
    
    // Log the interaction if dev mode is enabled
    if (localStorage.getItem('devMode') === 'true') {
      logApiInteraction(prompt, content, originalMetadata, fieldObfuscationEnabled);
    }
    
    // If using field obfuscation, restore original field names
    if (fieldObfuscationEnabled && originalMetadata) {
      const fieldMap = await getFieldMapping(ruleMetadata.Id);
      return restoreFieldNames(content, fieldMap);
    }
    
    return content;
  } catch (error) {
    console.error("Error explaining validation rule:", error);
    throw error;
  }
}

// Similarly update explainFlow function
async function explainFlow(flowMetadata, apiKey, model) {
  try {
    // Import the flow utility functions
    const { simplifyFlow, createFlowPrompt } = await import('./flow.js');
    
    // Check if field obfuscation is enabled
    const { fieldObfuscationEnabled = true } = await chrome.storage.sync.get(['fieldObfuscationEnabled']);
    
    let prompt;
    let originalMetadata = null;
    
    if (fieldObfuscationEnabled) {
      // Create obfuscated version with mapping
      const { obfuscatedMetadata, reverseMap } = createFieldMapping(flowMetadata);
      originalMetadata = JSON.parse(JSON.stringify(flowMetadata));
      const processedFlow = simplifyFlow(obfuscatedMetadata);
      prompt = createFlowPrompt(processedFlow);
      
      // Store the mapping for later use
      storeFieldMapping(flowMetadata.Id || flowMetadata.DurableId, reverseMap);
    } else {
      const processedFlow = simplifyFlow(flowMetadata);
      prompt = createFlowPrompt(processedFlow);
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Salesforce flows. Explain the flow in clear, concise language that helps developers understand its purpose and functionality.'
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
    const content = result.choices[0].message.content;
    
    // Log the interaction
    logApiInteraction(prompt, content, originalMetadata, fieldObfuscationEnabled);
    
    // If using field obfuscation, restore original field names
    if (fieldObfuscationEnabled && originalMetadata) {
      const fieldMap = await getFieldMapping(flowMetadata.Id || flowMetadata.DurableId);
      return restoreFieldNames(content, fieldMap);
    }
    
    return content;
  } catch (error) {
    console.error("Error explaining flow:", error);
    throw error;
  }
}

// Similarly update explainApexClass function
async function explainApexClass(apexClassMetadata, apiKey, model) {
  try {
    // Import the apex utility functions
    const { processApexClass, createApexClassPrompt } = await import('./apex.js');
    
    // Check if field obfuscation is enabled
    const { fieldObfuscationEnabled = true } = await chrome.storage.sync.get(['fieldObfuscationEnabled']);
    
    let prompt;
    let originalMetadata = null;
    
    if (fieldObfuscationEnabled) {
      // Create obfuscated version with mapping
      const { obfuscatedMetadata, reverseMap } = createFieldMapping(apexClassMetadata);
      originalMetadata = JSON.parse(JSON.stringify(apexClassMetadata));
      const processedApex = processApexClass(obfuscatedMetadata);
      prompt = createApexClassPrompt(processedApex);
      
      // Store the mapping for later use
      storeFieldMapping(apexClassMetadata.Id, reverseMap);
    } else {
      const processedApex = processApexClass(apexClassMetadata);
      prompt = createApexClassPrompt(processedApex);
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
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
    const content = result.choices[0].message.content;
    
    // Log the interaction
    logApiInteraction(prompt, content, originalMetadata, fieldObfuscationEnabled);
    
    // If using field obfuscation, restore original field names
    if (fieldObfuscationEnabled && originalMetadata) {
      const fieldMap = await getFieldMapping(apexClassMetadata.Id);
      return restoreFieldNames(content, fieldMap);
    }
    
    return content;
  } catch (error) {
    console.error("Error explaining Apex Class:", error);
    throw error;
  }
}

// Export all functions
export {
  explainValidationRule,
  explainFlow,
  explainApexClass,
  createPrompt
};