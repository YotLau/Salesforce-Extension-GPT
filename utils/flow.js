// utils/flow.js
// Handle Flow metadata processing

// Simplify flow metadata to focus on logical components
function simplifyFlow(flow) {
  // Extract core start element details
  const start = flow.Metadata?.start || {};
  const simplifiedStart = {
    object: start.object,
    filterFormula: start.filterFormula,
    triggerType: start.triggerType,
    connector: start.connector ? start.connector.targetReference : null
  };

  // Process action calls: remove layout info and metadata values
  const simplifiedActions = (flow.Metadata?.actionCalls || []).map(action => ({
    actionName: action.actionName,
    label: action.label,
    target: action.connector ? action.connector.targetReference : null,
    inputParameters: (action.inputParameters || []).map(param => ({
      name: param.name,
      elementReference: param.value ? param.value.elementReference : null
    }))
  }));

  // Process decisions: extract only logical conditions and connectors
  const simplifiedDecisions = (flow.Metadata?.decisions || []).map(decision => ({
    label: decision.label,
    name: decision.name,
    defaultTarget: decision.defaultConnector ? decision.defaultConnector.targetReference : null,
    rules: (decision.rules || []).map(rule => ({
      label: rule.label,
      conditionLogic: rule.conditionLogic,
      conditions: (rule.conditions || []).map(cond => {
        const rightValue = cond.rightValue || {};
        return {
          leftValueReference: cond.leftValueReference,
          operator: cond.operator,
          rightValue: rightValue.stringValue || rightValue.booleanValue
        };
      }),
      ruleTarget: rule.connector ? rule.connector.targetReference : null
    }))
  }));

  // Process loops: focus on collection reference and next connector
  const simplifiedLoops = (flow.Metadata?.loops || []).map(loop => ({
    name: loop.name,
    label: loop.label,
    collectionReference: loop.collectionReference,
    nextTarget: loop.nextValueConnector ? loop.nextValueConnector.targetReference : null
  }));

  // Process record lookups: include object and filter criteria only
  const simplifiedRecordLookups = (flow.Metadata?.recordLookups || []).map(lookup => ({
    name: lookup.name,
    object: lookup.object,
    filters: (lookup.filters || []).map(filter => {
      const valueObj = filter.value || {};
      return {
        field: filter.field,
        operator: filter.operator,
        value: valueObj.elementReference || valueObj.stringValue
      };
    })
  }));

  // Process text templates if they are used in the logic
  const simplifiedTextTemplates = (flow.Metadata?.textTemplates || []).map(template => ({
    name: template.name,
    text: template.text
  }));

  return {
    flowName: flow.MasterLabel || flow.FullName || "Unknown Flow",
    flowDescription: flow.Description || "",
    start: simplifiedStart,
    actions: simplifiedActions,
    decisions: simplifiedDecisions,
    loops: simplifiedLoops,
    recordLookups: simplifiedRecordLookups,
    textTemplates: simplifiedTextTemplates
  };
}

// Create prompt for OpenAI to analyze flow
function createFlowPrompt(flowData) {
  return `
Below is a simplified JSON representing the core logic of a Salesforce Flow named "${flowData.flowName}".
${flowData.flowDescription ? `Flow Description: ${flowData.flowDescription}` : ''}

Please provide a concise, bullet-point summary that explains the main components and flow logic. Include details such as:
1. The trigger conditions (what starts the flow)
2. Decision points and their criteria
3. Actions performed
4. Any looping behavior
5. The overall business purpose this flow likely serves

The summary should be coherent, avoid unnecessary details, and be no more than a few paragraphs.

Flow Data:
${JSON.stringify(flowData, null, 2)}
`;
}

// Export functions
export {
  simplifyFlow,
  createFlowPrompt
};