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