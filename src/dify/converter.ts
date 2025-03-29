import { DifyInfoResponse, DifyParametersResponse, DifyInputField } from "../types.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { WorkflowData } from "./service.js";

/**
 * パラメータプロパティの型定義
 */
export interface ParameterProperty {
  type: string;
  description: string;
}

/**
 * パラメータ抽出結果の型定義
 */
export interface ExtractedProperties {
  properties: Record<string, ParameterProperty>;
  required: string[];
}

/**
 * シンプルなパラメータ定義の型
 */
export interface ParameterDefinition {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
}

/**
 * ワークフロー変換のログハンドラーインターフェース
 */
export interface LogHandler {
  error(message: string, ...args: any[]): void;
}

/**
 * デフォルトのログハンドラー
 */
export class DefaultLogHandler implements LogHandler {
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
}

/**
 * ユーザー入力フォーム形式からパラメータプロパティを抽出する関数
 */
export function extractPropertiesFromUserInputForm(
  userInputForm: any[], 
  logHandler: LogHandler = new DefaultLogHandler()
): ExtractedProperties {
  const properties: Record<string, ParameterProperty> = {};
  const required: string[] = [];

  userInputForm.forEach((component, componentIndex) => {
    // Process each component
    for (const [componentType, field] of Object.entries(component)) {
      const typedField = field as DifyInputField;
      
      if (!typedField.variable) {
        logHandler.error(`Warning: user_input_form[${componentIndex}] has no variable name:`, JSON.stringify(component, null, 2));
        continue;
      }
      
      const paramName = typedField.variable;
      
      // Determine parameter type based on component type
      const paramType = determineParameterType(componentType);
      
      properties[paramName] = {
        type: paramType,
        description: typedField.label || paramName
      };
      
      if (typedField.required) {
        required.push(paramName);
      }
    }
  });

  return { properties, required };
}

/**
 * コンポーネントタイプに基づいてパラメータタイプを決定する
 */
export function determineParameterType(componentType: string): string {
  switch(componentType) {
    case "checkbox":
      return "array";
    case "number":
    case "slider":
      return "number";
    case "switch":
      return "boolean";
    case "select":
    case "radio":
    default:
      return "string";
  }
}

/**
 * オブジェクト形式のパラメータを配列に変換する関数
 */
export function convertParametersObjectToArray(parametersObj: Record<string, any>): ParameterDefinition[] {
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
export function extractPropertiesFromParametersArray(
  parameters: ParameterDefinition[],
  logHandler: LogHandler = new DefaultLogHandler()
): ExtractedProperties {
  const properties: Record<string, ParameterProperty> = {};
  const required: string[] = [];

  parameters.forEach((param, index) => {
    if (!param.name) {
      logHandler.error(`Warning: Parameter[${index}] has no name:`, JSON.stringify(param, null, 2));
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

  return { properties, required };
}

/**
 * パラメータからプロパティと必須フィールドを抽出する関数
 */
export function extractPropertiesFromParameters(
  paramsData: DifyParametersResponse,
  logHandler: LogHandler = new DefaultLogHandler()
): ExtractedProperties {
  // Extract parameters from the new user_input_form format
  if (paramsData.user_input_form && Array.isArray(paramsData.user_input_form)) {
    return extractPropertiesFromUserInputForm(paramsData.user_input_form, logHandler);
  } 
  // For backward compatibility, also support the old parameters format
  else if (paramsData.parameters) {
    // Check the structure of paramsData.parameters
    if (!Array.isArray(paramsData.parameters)) {
      logHandler.error("Warning: paramsData.parameters is not an array");
      
      // Try to convert to an array if it's an object
      if (typeof paramsData.parameters === 'object') {
        try {
          const paramsArray = convertParametersObjectToArray(paramsData.parameters);
          return extractPropertiesFromParametersArray(paramsArray, logHandler);
        } catch (error) {
          logHandler.error("Parameter conversion error:", error);
          return { properties: {}, required: [] };
        }
      }
      return { properties: {}, required: [] };
    } else {
      // Normal processing if it's already an array
      return extractPropertiesFromParametersArray(paramsData.parameters, logHandler);
    }
  } else {
    logHandler.error("Warning: No parameter definition found. Neither user_input_form nor parameters exists.");
    return { properties: {}, required: [] };
  }
}

/**
 * ワークフロー名の一意性を確保する関数
 */
export function getUniqueWorkflowName(baseName: string, existingNames: Set<string>): string {
  let toolName = baseName;
  
  if (existingNames.has(toolName)) {
    let counter = 1;
    while (existingNames.has(`${baseName}-${counter}`)) {
      counter++;
    }
    toolName = `${baseName}-${counter}`;
  }
  
  return toolName;
}

/**
 * 単一のワークフローデータをMCPツールに変換する
 */
export function convertSingleWorkflowToTool(
  workflowData: WorkflowData,
  existingNames: Set<string>,
  logHandler: LogHandler = new DefaultLogHandler()
): Tool {
  const { infoData, paramsData } = workflowData;
  
  // Use workflow name as tool name
  const baseName = infoData.name || "dify-workflow";
  const toolName = getUniqueWorkflowName(baseName, existingNames);
  
  // Build inputSchema from parameter information
  const { properties, required } = extractPropertiesFromParameters(paramsData, logHandler);
  
  return {
    name: toolName,
    description: infoData.description || "Execute Dify Workflow",
    inputSchema: {
      type: "object",
      properties: properties,
      required: required
    }
  };
}

/**
 * Difyワークフローデータを MCP ツール形式に変換する関数
 */
export function convertDifyWorkflowToMCPTools(
  workflowDataList: WorkflowData[],
  logHandler: LogHandler = new DefaultLogHandler()
): Tool[] {
  const tools: Tool[] = [];
  const workflowNames = new Set<string>();
  
  // Process each API key and its corresponding workflow data
  workflowDataList.forEach((workflowData) => {
    const tool = convertSingleWorkflowToTool(workflowData, workflowNames, logHandler);
    workflowNames.add(tool.name);
    tools.push(tool);
  });
  
  return tools;
} 