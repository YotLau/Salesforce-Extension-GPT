// content.js
// Detect validation rule pages and handle page interaction

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkValidationRulePage") {
    const pageInfo = extractValidationRuleInfo();
    sendResponse(pageInfo);
  } else if (request.action === "checkFlowPage") {
    const flowInfo = extractFlowInfo();
    sendResponse(flowInfo);
  }
  return true;
});

// Extract validation rule info from current page
function extractValidationRuleInfo() {
  const url = window.location.href;
  console.log('Checking URL in content script:', url);
  
  // Check if we're on a validation rule page - expand the patterns to match your URL
  const isValidationRulePage = 
    url.includes('/ValidationRule') || 
    url.includes('setupid=ValidationRules') || 
    url.includes('setupentity=') ||
    /\/03d[a-zA-Z0-9]{12,15}(?:\/|$)/.test(url); // This pattern matches IDs like 03d0X0000009Lom
  
  console.log('Is validation rule page?', isValidationRulePage);
  
  if (!isValidationRulePage) {
    return { isValidationRulePage: false };
  }
  
  // Extract validation rule ID from URL
  let validationRuleId = '';
  let objectName = '';
  
  if (url.includes('/ValidationRule/')) {
    // Lightning URL format
    const urlParts = url.split('/');
    const idIndex = urlParts.indexOf('ValidationRule') + 1;
    if (idIndex < urlParts.length) {
      validationRuleId = urlParts[idIndex];
    }
    
    // Try to extract object name
    const objectIndex = urlParts.indexOf('ValidationRule') - 1;
    if (objectIndex > 0) {
      objectName = urlParts[objectIndex];
    }
  } else if (/\/03d[a-zA-Z0-9]{12,15}(?:\/|$)/.test(url)) {
    // Extract ID directly from URL for IDs like 03d0X0000009Lom
    const matches = url.match(/\/03d[a-zA-Z0-9]{12,15}/);
    if (matches && matches[0]) {
      validationRuleId = matches[0].substring(1); // Remove the leading slash
    }
  } else {
    // Classic URL format
    const urlParams = new URLSearchParams(url.split('?')[1]);
    validationRuleId = urlParams.get('id');
    objectName = urlParams.get('setupentity');
  }
  
  console.log('Extracted validation rule ID:', validationRuleId);
  console.log('Extracted object name:', objectName);
  
  return {
    isValidationRulePage: true,
    validationRuleId,
    objectName
  };
}

// Extract flow info from current page
function extractFlowInfo() {
  const url = window.location.href;
  console.log('Checking URL for Flow in content script:', url);
  
  // Check if we're on a flow builder page
  const isFlowPage = 
    url.includes('/flowBuilder.app') || 
    url.includes('builder_platform_interaction/flowBuilder.app');
  
  console.log('Is flow page?', isFlowPage);
  
  if (!isFlowPage) {
    return { isFlowPage: false };
  }
  
  // Extract flow ID from URL
  let flowId = '';
  
  const urlParams = new URLSearchParams(window.location.search);
  flowId = urlParams.get("flowId");
  
  console.log('Extracted flow ID:', flowId);
  
  return {
    isFlowPage: true,
    flowId
  };
}