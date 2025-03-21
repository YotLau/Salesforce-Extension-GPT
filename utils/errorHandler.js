// utils/errorHandler.js
// Centralized error handling for the extension

/**
 * Handle API errors in a consistent way
 * @param {Error} error - The error object
 * @param {String} componentType - The type of component being processed (validation rule, flow, etc.)
 * @returns {String} User-friendly error message
 */
function handleApiError(error, componentType) {
  // Capture error details
  const errorDetails = {
    message: error.message,
    componentType,
    timestamp: new Date().toISOString(),
    stack: error.stack
  };
  
  // Log structured error
  console.error(`Salesforce Explainer Error (${componentType}):`, errorDetails);
  
  // Return user-friendly error message
  return `Unable to explain ${componentType}. ${error.message.includes('OpenAI API') ? 
    'There was an issue with the AI service.' : 
    'Please check your connection and try again.'}`;
}

export { handleApiError };