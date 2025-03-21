// utils/security.js
// Handle security and data protection features

/**
 * Creates a mapping between original field names and obfuscated versions
 * @param {Object} metadata - The metadata object to process
 * @returns {Object} Object containing obfuscated metadata and mapping
 */
/**
 * Creates a mapping for field names and returns an obfuscated version of the metadata
 * @param {Object} metadata - The original metadata object
 * @returns {Object} Object containing obfuscated metadata and reverse mapping
 */
function createFieldMapping(metadata) {
  // Create a deep copy of the metadata
  const obfuscatedMetadata = JSON.parse(JSON.stringify(metadata));
  const fieldMap = {};
  const reverseMap = {};
  let fieldCounter = 1;
  
  // Get field protection settings
  const protectCustomFields = localStorage.getItem('protectCustomFields') !== 'false';
  const protectStandardFields = localStorage.getItem('protectStandardFields') !== 'false';
  const protectSensitiveFields = localStorage.getItem('protectSensitiveFields') !== 'false';
  
  // Function to recursively process objects and replace field names
  function processObject(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach(item => processObject(item));
      return;
    }
    
    // Process object properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        // If it's a string and might contain field references, process it
        if (typeof value === 'string' && 
            (key === 'errorConditionFormula' || key === 'formula' || key === 'Body')) {
          obj[key] = obfuscateFieldsInFormula(value, fieldMap, reverseMap, fieldCounter);
          // Update field counter based on new mappings
          fieldCounter = Object.keys(fieldMap).length + 1;
        } 
        // If it's an object or array, process recursively
        else if (value && typeof value === 'object') {
          processObject(value);
        }
      }
    }
  }
  
  // Process the metadata object
  processObject(obfuscatedMetadata);
  
  return { obfuscatedMetadata, reverseMap };
}

/**
 * Obfuscates field names in a formula string
 * @param {string} formula - The formula string
 * @param {Object} fieldMap - Mapping from original field name to obfuscated name
 * @param {Object} reverseMap - Mapping from obfuscated name to original field name
 * @param {number} counter - Counter for generating field names
 * @returns {string} Obfuscated formula
 */
function obfuscateFieldsInFormula(formula, fieldMap, reverseMap, counter) {
  let currentCounter = counter;
  let obfuscatedFormula = formula;
  
  // Get field protection settings
  const protectCustomFields = localStorage.getItem('protectCustomFields') !== 'false';
  const protectStandardFields = localStorage.getItem('protectStandardFields') !== 'false';
  const protectSensitiveFields = localStorage.getItem('protectSensitiveFields') !== 'false';
  
  // Regular expression to find field references in formulas
  // This pattern looks for standard and custom fields
  const fieldPattern = /\b([A-Za-z0-9_]+__[cr])\b|\.([A-Za-z0-9_]+)\b/g;
  
  // Find all field references and replace them
  obfuscatedFormula = obfuscatedFormula.replace(fieldPattern, (match, customField, standardField) => {
    const fieldName = customField || standardField;
    
    // Skip if it's a function name or reserved keyword
    const reservedKeywords = ['AND', 'OR', 'NOT', 'IF', 'CASE', 'ISNEW', 'ISBLANK', 'ISPICKVAL', 'TRUE', 'FALSE'];
    if (reservedKeywords.includes(fieldName)) {
      return match;
    }
    
    // Determine if we should protect this field
    let shouldProtect = false;
    
    if (customField && protectCustomFields) {
      // Custom field ending with __c or __r
      shouldProtect = true;
    } else if (standardField && protectStandardFields) {
      // Standard field
      shouldProtect = true;
    }
    
    // Check for sensitive fields if enabled
    if (protectSensitiveFields) {
      const sensitivePatterns = ['ssn', 'email', 'phone', 'address', 'zip', 'postal', 'credit', 'card', 'password', 'secret'];
      if (sensitivePatterns.some(pattern => fieldName.toLowerCase().includes(pattern))) {
        shouldProtect = true;
      }
    }
    
    // If we should protect this field and it's not already mapped
    if (shouldProtect && !fieldMap[fieldName]) {
      const obfuscatedName = `field${currentCounter++}`;
      fieldMap[fieldName] = obfuscatedName;
      reverseMap[obfuscatedName] = fieldName;
      
      // Replace the field reference
      if (customField) {
        return obfuscatedName;
      } else {
        return '.' + obfuscatedName;
      }
    } else if (shouldProtect && fieldMap[fieldName]) {
      // Field is already mapped
      if (customField) {
        return fieldMap[fieldName];
      } else {
        return '.' + fieldMap[fieldName];
      }
    }
    
    // Return the original if we shouldn't protect it
    return match;
  });
  
  return obfuscatedFormula;
}

/**
 * Restores original field names in AI-generated text
 * @param {string} summary - The text with obfuscated field names
 * @param {Object} reverseMap - Mapping from obfuscated to original names
 * @returns {string} Text with original field names restored
 */
function restoreFieldNames(summary, reverseMap) {
  let restoredSummary = summary;
  
  // Replace all occurrences of each obfuscated field name with the original
  Object.entries(reverseMap).forEach(([obfuscatedName, originalName]) => {
    const regex = new RegExp(obfuscatedName, 'g');
    restoredSummary = restoredSummary.replace(regex, originalName);
  });
  
  return restoredSummary;
}

/**
 * Infers the type of field based on name and value patterns
 * @param {string} fieldName - The name of the field
 * @param {any} value - The value of the field
 * @returns {string} Inferred field type
 */
function inferFieldType(fieldName, value) {
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(value)) {
    return 'numericField';
  } else if (/date/i.test(fieldName)) {
    return 'dateField';
  } else if (/email/i.test(fieldName)) {
    return 'emailField';
  } else if (/status|stage|phase|type/i.test(fieldName)) {
    return 'statusField';
  }
  return 'textField';
}

/**
 * Stores field mapping in session storage
 * @param {string} id - The ID of the metadata (flow, validation rule, etc.)
 * @param {Object} fieldMap - The field mapping to store
 */
function storeFieldMapping(id, fieldMap) {
  chrome.storage.session.set({
    [`fieldMap_${id}`]: fieldMap
  });
}

/**
 * Retrieves field mapping from session storage
 * @param {string} id - The ID of the metadata
 * @returns {Promise<Object>} The stored field mapping
 */
async function getFieldMapping(id) {
  return new Promise(resolve => {
    chrome.storage.session.get([`fieldMap_${id}`], result => {
      resolve(result[`fieldMap_${id}`] || {});
    });
  });
}

// Export all functions
export {
  createFieldMapping,
  restoreFieldNames,
  inferFieldType,
  storeFieldMapping,
  getFieldMapping
};