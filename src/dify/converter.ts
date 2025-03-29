import { DifyInfoResponse, DifyParametersResponse, DifyInputField } from "../types.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { WorkflowData } from "./service.js";

/**
 * ユーザー入力フォーム形式からパラメータプロパティを抽出する関数
 */
function extractPropertiesFromUserInputForm(
  userInputForm: any[], 
  properties: Record<string, any>, 
  required: string[]
): void {
  userInputForm.forEach((component, componentIndex) => {
    // Process each component
    for (const [componentType, field] of Object.entries(component)) {
      const typedField = field as DifyInputField;
      
      if (!typedField.variable) {
        console.error(`Warning: user_input_form[${componentIndex}] has no variable name:`, JSON.stringify(component, null, 2));
        continue;
      }
      
      const paramName = typedField.variable;
      
      // Determine parameter type based on component type
      let paramType = "string"; // Default is string
      
      switch(componentType) {
        case "select":
        case "radio":
          paramType = "string";
          break;
        case "checkbox":
          paramType = "array";
          break;
        case "number":
        case "slider":
          paramType = "number";
          break;
        case "switch":
          paramType = "boolean";
          break;
        default:
          paramType = "string";
      }
      
      properties[paramName] = {
        type: paramType,
        description: typedField.label || paramName
      };
      
      if (typedField.required) {
        required.push(paramName);
      }
    }
  });
}

/**
 * オブジェクト形式のパラメータを配列に変換する関数
 */
function convertParametersObjectToArray(parametersObj: Record<string, any>): Array<{
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
}> {
  return Object.entries(parametersObj).map(([key, value]) => {
    // Convert to appropriate object if value is not an object
    if (typeof value !== 'object' || value === null) {
      return { name: key, type: "string", description: "", required: false };
    }
    
    // If value is already a parameter object
    const paramObj = value as any;
    return {
      name: key,
      type: paramObj.type || "string",
      description: paramObj.description || "",
      required: !!paramObj.required
    };
  });
}

/**
 * パラメータ配列からプロパティを抽出する関数
 */
function extractPropertiesFromParametersArray(
  parameters: Array<any>, 
  properties: Record<string, any>, 
  required: string[]
): void {
  parameters.forEach((param, index) => {
    if (!param.name) {
      console.error(`Warning: Parameter[${index}] has no name:`, JSON.stringify(param, null, 2));
      return;
    }
    
    properties[param.name] = {
      type: param.type || "string",
      description: param.description || ""
    };
    
    if (param.required) {
      required.push(param.name);
    }
  });
}

/**
 * パラメータからプロパティと必須フィールドを抽出する関数
 */
function extractPropertiesFromParameters(
  paramsData: DifyParametersResponse
): { properties: Record<string, any>; required: string[] } {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  
  // Extract parameters from the new user_input_form format
  if (paramsData.user_input_form && Array.isArray(paramsData.user_input_form)) {
    extractPropertiesFromUserInputForm(paramsData.user_input_form, properties, required);
  } 
  // For backward compatibility, also support the old parameters format
  else if (paramsData.parameters) {
    // Check the structure of paramsData.parameters
    if (!Array.isArray(paramsData.parameters)) {
      console.error("Warning: paramsData.parameters is not an array");
      
      // Try to convert to an array if it's an object
      if (typeof paramsData.parameters === 'object') {
        try {
          const paramsArray = convertParametersObjectToArray(paramsData.parameters);
          extractPropertiesFromParametersArray(paramsArray, properties, required);
        } catch (error) {
          console.error("Parameter conversion error:", error);
        }
      }
    } else {
      // Normal processing if it's already an array
      extractPropertiesFromParametersArray(paramsData.parameters, properties, required);
    }
  } else {
    console.error("Warning: No parameter definition found. Neither user_input_form nor parameters exists.");
  }
  
  return { properties, required };
}

/**
 * ワークフロー名の一意性を確保する関数
 */
function getUniqueWorkflowName(baseName: string, workflowNames: Set<string>): string {
  let toolName = baseName;
  
  if (workflowNames.has(toolName)) {
    let counter = 1;
    while (workflowNames.has(`${baseName}-${counter}`)) {
      counter++;
    }
    toolName = `${baseName}-${counter}`;
  }
  
  return toolName;
}

/**
 * Difyワークフローデータを MCP ツール形式に変換する関数
 */
export function convertDifyWorkflowToMCPTools(workflowDataList: WorkflowData[]): Tool[] {
  const tools: Tool[] = [];
  const workflowNames = new Set<string>();
  
  // Process each API key and its corresponding workflow data
  workflowDataList.forEach((workflowData) => {
    const { infoData, paramsData } = workflowData;
    
    // Use workflow name as tool name
    const baseName = infoData.name || "dify-workflow";
    const toolName = getUniqueWorkflowName(baseName, workflowNames);
    
    // Add to set of used names
    workflowNames.add(toolName);
    
    // Build inputSchema from parameter information
    const { properties, required } = extractPropertiesFromParameters(paramsData);
    
    tools.push({
      name: toolName,
      description: infoData.description || "Execute Dify Workflow",
      inputSchema: {
        type: "object",
        properties: properties,
        required: required
      }
    });
  });
  
  return tools;
} 