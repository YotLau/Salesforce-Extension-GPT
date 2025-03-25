// utils/salesforce.js
// Handle Salesforce API interactions

// API version to use for Salesforce API calls
const API_VERSION = "58.0";

// Get Salesforce session
async function getSession(sfHost) {
  try {
    // Normalize host name - this will now handle complex domain patterns
    const originalHost = sfHost;
    sfHost = getMyDomain(sfHost);
    
    if (originalHost !== sfHost) {
      console.log(`Domain transformed from ${originalHost} to ${sfHost} for API access`);
    }
    
    // Check localStorage first
    const storedToken = localStorage.getItem(`${sfHost}_access_token`);
    const tokenTimestamp = localStorage.getItem(`${sfHost}_token_timestamp`);
    const currentTime = Date.now();
    
    // Check if token exists and is less than 1 hour old
    if (storedToken && tokenTimestamp && (currentTime - parseInt(tokenTimestamp) < 3600000)) {
      console.log('Using cached session token for host:', sfHost);
      return {
        sessionId: storedToken,
        instanceHostname: sfHost
      };
    }
    
    console.log('Requesting fresh session token for host:', sfHost);
    // Request from background script if not in localStorage or token is old
    const message = await chrome.runtime.sendMessage({
      message: "getSession",
      sfHost
    });
    
    if (message && message.key) {
      // Store the new token with a timestamp
      localStorage.setItem(`${sfHost}_access_token`, message.key);
      localStorage.setItem(`${sfHost}_token_timestamp`, Date.now().toString());
      
      return {
        sessionId: message.key,
        instanceHostname: sfHost
      };
    }
    
    throw new Error("Session not found");
  } catch (error) {
    console.error("Error getting session:", error);
    throw error;
  }
}

// Make REST API call to Salesforce
async function makeRestCall(url, sessionInfo, method = "GET", body = null) {
  try {
    const sfHost = "https://" + sessionInfo.instanceHostname;
    const fullUrl = new URL(url, sfHost);
    
    // Add cache buster
    fullUrl.searchParams.append("cache", Math.random());
    
    const headers = {
      "Accept": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + sessionInfo.sessionId
    };
    
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    
    console.log('Making API call to:', fullUrl.toString());
    console.log('Using session for host:', sessionInfo.instanceHostname);
    
    try {
      const response = await fetch(fullUrl.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        // If we get a 401, the session might have expired or be invalid for this domain
        if (response.status === 401) {
          console.error('Authentication failed (401). Session may have expired or be invalid for this domain.');
          console.error('Current host:', sessionInfo.instanceHostname);
          // Clear the stored token to force re-authentication
          localStorage.removeItem(`${sessionInfo.instanceHostname}_access_token`);
          throw new Error(`Authentication failed. Please refresh the page and try again.`);
        }
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (fetchError) {
      // Handle network errors and CORS issues
      if (fetchError.message === 'Failed to fetch') {
        console.error('Network error or CORS issue when accessing:', fullUrl.toString());
        throw new Error(`Network error or CORS issue. This might be due to domain restrictions. Please try refreshing the page or check your Salesforce domain settings.`);
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("REST API call failed:", error);
    throw error;
  }
}

// Get validation rule metadata using Tooling API
async function getValidationRuleMetadata(validationRuleId, sessionInfo) {
  try {
    const query = `SELECT Id, ValidationName, Active, ErrorDisplayField, ErrorMessage, Description, EntityDefinition.QualifiedApiName, Metadata FROM ValidationRule WHERE Id = '${validationRuleId}'`;
    const url = `/services/data/v${API_VERSION}/tooling/query?q=${encodeURIComponent(query)}`;
    
    const result = await makeRestCall(url, sessionInfo);
    
    if (!result.records || result.records.length === 0) {
      throw new Error("Validation rule not found");
    }
    
    return result.records[0];
  } catch (error) {
    console.error("Error fetching validation rule metadata:", error);
    throw error;
  }
}

// Helper to normalize Salesforce domain
function getMyDomain(hostname) {
  // Remove protocol if present
  hostname = hostname.replace(/^https?:\/\//i, "");
  
  // Handle My Domain and other Salesforce domain patterns
  // For lightning domains, we might need special handling
  if (hostname.includes('lightning.force.com')) {
    console.log('Lightning domain detected:', hostname);
    
    // Extract org name and sandbox name from the lightning domain
    // Pattern: [orgName]--[sandboxName].lightning.force.com
    const parts = hostname.split('.');
    if (parts.length > 0) {
      const firstPart = parts[0]; // e.g., "yotam--sandbox"
      if (firstPart.includes('--')) {
        // This is likely a sandbox with org name
        const [orgName, sandboxName] = firstPart.split('--');
        console.log(`Detected org: ${orgName}, sandbox: ${sandboxName}`);
        
        // Try to construct the proper domain for API access
        // Format: orgName--sandboxName.sandbox.my.salesforce-setup.com
        return `${orgName}--${sandboxName}.sandbox.my.salesforce-setup.com`;
      }
    }
  }
  
  // Handle production URLs (e.g., yotamorg.my.salesforce.com)
  if (hostname.includes('.my.salesforce.com') && !hostname.includes('--')) {
    console.log('Production domain detected:', hostname);
    return hostname;
  }
  
  // Handle sandbox setup domains (e.g., orgname--sandboxname.sandbox.my.salesforce-setup.com)
  if (hostname.includes('sandbox.my.salesforce-setup.com')) {
    console.log('Sandbox setup domain detected:', hostname);
    return hostname; // Already in the correct format for API access
  }
  
  // Handle production setup domains (e.g., orgname.my.salesforce-setup.com)
  if (hostname.includes('.my.salesforce-setup.com') && !hostname.includes('sandbox')) {
    console.log('Production setup domain detected:', hostname);
    return hostname; // Already in the correct format for API access
  }
  
  return hostname;
}

// Get Flow metadata using Tooling API
async function getFlowMetadata(flowId, sessionInfo) {
  try {
    if (!flowId) {
      throw new Error("Flow ID is required");
    }
    
    const url = `/services/data/v${API_VERSION}/tooling/sobjects/Flow/${flowId}`;
    console.log('Fetching flow metadata from URL:', url);
    
    const result = await makeRestCall(url, sessionInfo);
    
    if (!result) {
      throw new Error("Flow not found");
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching flow metadata:", error);
    throw error;
  }
}

// Get Apex Class metadata
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

// Single export statement for all functions
// Get Formula Field metadata
async function getFormulaFieldMetadata(fieldId, sessionInfo) {
  try {
    const query = `SELECT Id, DeveloperName, Description, Metadata, FullName 
                 FROM CustomField WHERE Id = '${fieldId}'`;
    const url = `/services/data/v${API_VERSION}/tooling/query?q=${encodeURIComponent(query)}`;
    const result = await makeRestCall(url, sessionInfo);
    
    if (!result.records || result.records.length === 0) {
      throw new Error("Formula field not found");
    }
    
    const record = result.records[0];
    return {
      ...record,
      type: record?.Metadata?.type,
      formula: record?.Metadata?.formula
    };
  } catch (error) {
    console.error("Error fetching formula field metadata:", error);
    throw error;
  }
}

export {
  getSession,
  getValidationRuleMetadata,
  getFlowMetadata,
  getApexClassMetadata,
  getFormulaFieldMetadata,
  makeRestCall
};
