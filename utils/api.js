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

// Add this function to your existing api.js file

// Send flow metadata to OpenAI for explanation
async function explainFlow(flowMetadata, apiKey, model) {
  try {
    // Import the flow utility functions
    const { simplifyFlow, createFlowPrompt } = await import('./flow.js');
    
    // Simplify the flow metadata
    const simplifiedFlow = simplifyFlow(flowMetadata);
    
    // Create the prompt for OpenAI
    const prompt = createFlowPrompt(simplifiedFlow);
    
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
            content: 'You are an expert in Salesforce flows. Explain the flow in clear, concise language that both technical and non-technical users can understand.'
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

// Update your export statement
export {
  explainValidationRule,
  explainFlow
};