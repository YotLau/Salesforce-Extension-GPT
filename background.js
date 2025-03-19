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