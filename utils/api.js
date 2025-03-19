// utils/api.js
// Handle API interactions with OpenAI

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
async function explainValidationRule(ruleMetadata, apiKey, model) {
  try {
    const prompt = createPrompt(ruleMetadata);
    
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
    return result.choices[0].message.content;
  } catch (error) {
    console.error("Error explaining validation rule:", error);
    throw error;
  }
}

// Explain a flow using OpenAI
async function explainFlow(flowMetadata, apiKey, model) {
  try {
    // Import the flow utility functions
    const { simplifyFlow, createFlowPrompt } = await import('./flow.js');
    
    // Process the flow metadata
    const processedFlow = simplifyFlow(flowMetadata);
    
    // Create the prompt for OpenAI
    const prompt = createFlowPrompt(processedFlow);
    
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
    return result.choices[0].message.content;
  } catch (error) {
    console.error("Error explaining flow:", error);
    throw error;
  }
}

// Explain an Apex Class using OpenAI
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

// Export all functions - ensure explainFlow is included
export {
  explainValidationRule,
  explainFlow,
  explainApexClass,
  createPrompt
};