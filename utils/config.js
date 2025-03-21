// utils/config.js
// Centralized configuration management for API keys and models

/**
 * Get API configuration from Chrome storage
 * @returns {Promise<Object>} Configuration object with apiKey, model, and fieldObfuscationEnabled
 */
async function getApiConfig() {
  const {
    openaiKey,
    openaiModel = 'gpt-4o-mini',
    fieldObfuscationEnabled = true
  } = await chrome.storage.sync.get(['openaiKey', 'openaiModel', 'fieldObfuscationEnabled']);
  
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  return {
    apiKey: openaiKey,
    model: openaiModel,
    fieldObfuscationEnabled
  };
}

/**
 * Make a request to the OpenAI API
 * @param {Array} messages - Array of message objects to send to OpenAI
 * @param {String} customModel - Optional custom model to use instead of the default
 * @returns {Promise<Object>} OpenAI API response
 */
async function makeOpenAiRequest(messages, customModel = null) {
  const { apiKey, model } = await getApiConfig();
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: customModel || model,
      messages,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }
  
  return await response.json();
}

export { getApiConfig, makeOpenAiRequest };