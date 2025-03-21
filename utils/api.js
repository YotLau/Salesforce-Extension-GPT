// utils/api.js
// Handle API interactions with OpenAI

// Import security utilities
import { createFieldMapping, restoreFieldNames, storeFieldMapping, getFieldMapping } from './security.js';
import { makeOpenAiRequest, getApiConfig } from './config.js';
import { handleApiError } from './errorHandler.js';

// Create an improved prompt for OpenAI based on validation rule metadata
function createPrompt(ruleMetadata) {
  // Extract the formula from metadata
  const formula = ruleMetadata.Metadata?.errorConditionFormula || '';
  const ruleName = ruleMetadata.ValidationName || 'Unnamed Rule';
  const objectName = ruleMetadata.EntityDefinition?.QualifiedApiName || 'Unknown Object';
  const errorMessage = ruleMetadata.ErrorMessage || '';
  const description = ruleMetadata.Description || '';
  
  // Create an improved prompt with better structure
  return `
Please analyze this Salesforce validation rule and provide a clear explanation:

RULE INFORMATION:
- Name: ${ruleName}
- Object: ${objectName}
${description ? `- Description: ${description}` : ''}
- Error Message shown to users: "${errorMessage}"

FORMULA:
\`\`\`
${formula}
\`\`\`

REQUESTED OUTPUT:
1. Purpose: In 1-2 sentences, explain what this validation rule is checking for.
2. Trigger Conditions: Bullet points explaining when this rule will prevent saving a record.
3. How to Fix: Concrete steps a user should take when they encounter this error.
4. Technical Analysis (optional): Brief explanation of any complex formula logic.

Please be concise and use plain, non-technical language where possible. Focus on what a user needs to know to successfully work with this rule.
`;
}

// Log API interactions for debugging
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

/**
 * Generic function to explain any Salesforce component
 * @param {Object} metadata - The component metadata
 * @param {String} componentType - The type of component (validationRule, flow, apexClass)
 * @param {String} apiKey - Optional API key for backward compatibility
 * @param {String} model - Optional model for backward compatibility
 * @returns {Promise<String>} The explanation text
 */
async function explainSalesforceComponent(metadata, componentType, apiKey = null, model = null) {
  try {
    // If apiKey and model are provided directly, use them instead of storage
    const config = apiKey && model ? { apiKey, model } : await getApiConfig();
    const { fieldObfuscationEnabled } = await chrome.storage.sync.get(['fieldObfuscationEnabled']);
    
    // Get the appropriate utilities based on component type
    const { processMetadata, createComponentPrompt } = await getComponentUtils(componentType);
    
    let prompt;
    let originalMetadata = null;
    
    if (fieldObfuscationEnabled) {
      // Create obfuscated version with mapping
      const { obfuscatedMetadata, reverseMap } = createFieldMapping(metadata);
      originalMetadata = JSON.parse(JSON.stringify(metadata));
      const processedMetadata = processMetadata(obfuscatedMetadata);
      prompt = createComponentPrompt(processedMetadata);
      
      // Store the mapping for later use
      const idField = componentType === 'flow' ? (metadata.Id || metadata.DurableId) : metadata.Id;
      storeFieldMapping(idField, reverseMap);
    } else {
      const processedMetadata = processMetadata(metadata);
      prompt = createComponentPrompt(processedMetadata);
    }
    
    const systemContent = getSystemPromptForComponent(componentType);
    
    // Use either the direct API call or the centralized function
    let content;
    if (apiKey && model) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      const result = await response.json();
      content = result.choices[0].message.content;
    } else {
      const result = await makeOpenAiRequest([
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt }
      ]);
      content = result.choices[0].message.content;
    }
    
    // Log the interaction if dev mode is enabled
    if (localStorage.getItem('devMode') === 'true') {
      logApiInteraction(prompt, content, originalMetadata, fieldObfuscationEnabled);
    }
    
    // If using field obfuscation, restore original field names
    if (fieldObfuscationEnabled && originalMetadata) {
      const idField = componentType === 'flow' ? (metadata.Id || metadata.DurableId) : metadata.Id;
      const fieldMap = await getFieldMapping(idField);
      return restoreFieldNames(content, fieldMap);
    }
    
    return content;
  } catch (error) {
    console.error(`Error explaining ${componentType}:`, error);
    return handleApiError(error, componentType);
  }
}

/**
 * Helper for getting the right utilities for each component type
 * @param {String} componentType - The type of component
 * @returns {Promise<Object>} Object with processMetadata and createPrompt functions
 */
async function getComponentUtils(componentType) {
  switch (componentType) {
    case 'validationRule':
      return {
        processMetadata: (metadata) => metadata, // No special processing needed
        createComponentPrompt: createPrompt
      };
    case 'flow':
      const { simplifyFlow, createFlowPrompt } = await import('./flow.js');
      return {
        processMetadata: simplifyFlow,
        createComponentPrompt: createFlowPrompt
      };
    case 'apexClass':
      const { processApexClass, createApexClassPrompt } = await import('./apex.js');
      return {
        processMetadata: processApexClass,
        createComponentPrompt: createApexClassPrompt
      };
    default:
      throw new Error(`Unknown component type: ${componentType}`);
  }
}

/**
 * Get appropriate system prompts for different component types
 * @param {String} componentType - The type of component
 * @returns {String} The system prompt
 */
function getSystemPromptForComponent(componentType) {
  const prompts = {
    validationRule: 'You are an expert in Salesforce validation rules. Explain the validation rule in clear, concise language that helps users understand its purpose and how to comply with it.',
    flow: 'You are an expert in Salesforce flows. Explain the flow in clear, concise language that helps developers understand its purpose and functionality.',
    apexClass: 'You are an expert in Salesforce Apex development. Explain the Apex code in clear, concise language that helps developers understand its purpose and functionality.'
  };
  
  return prompts[componentType] || 'You are an expert in Salesforce development.';
}

// Maintain backward compatibility with existing code
async function explainValidationRule(ruleMetadata, apiKey, model) {
  return explainSalesforceComponent(ruleMetadata, 'validationRule', apiKey, model);
}

// Similarly update explainFlow function for backward compatibility
async function explainFlow(flowMetadata, apiKey, model) {
  return explainSalesforceComponent(flowMetadata, 'flow', apiKey, model);
}

// Similarly update explainApexClass function for backward compatibility
async function explainApexClass(apexClassMetadata, apiKey, model) {
  return explainSalesforceComponent(apexClassMetadata, 'apexClass', apiKey, model);
}

// Export all functions
export {
  explainValidationRule,
  explainFlow,
  explainApexClass,
  explainSalesforceComponent,
  createPrompt
};