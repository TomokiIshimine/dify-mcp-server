import { DifyInfoResponse, DifyParametersResponse } from "../types.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Function to convert Dify workflow data to MCP tool format
export function convertDifyWorkflowToMCPTools(workflowDataList: Array<{
  apiKey: string, 
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}>): Tool[] {
  const tools: Tool[] = [];
  const workflowNames = new Set<string>();
  
  // Process each API key and its corresponding workflow data
  workflowDataList.forEach((workflowData) => {
    const { infoData, paramsData } = workflowData;
    
    // Extract necessary information from infoData and paramsData to create tool definitions
    if (infoData && paramsData) {
      // Use workflow name as tool name
      let baseName = infoData.name || "dify-workflow";
      let toolName = baseName;
      
      // If we already have a workflow with this name, make it unique
      if (workflowNames.has(toolName)) {
        let counter = 1;
        while (workflowNames.has(`${baseName}-${counter}`)) {
          counter++;
        }
        toolName = `${baseName}-${counter}`;
      }
      
      // Add to set of used names
      workflowNames.add(toolName);
      
      // Example: Build inputSchema from parameter information
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      // Extract parameters from the new user_input_form format
      if (paramsData.user_input_form && Array.isArray(paramsData.user_input_form)) {
        
        paramsData.user_input_form.forEach((component, componentIndex) => {
          // Process each component
          for (const [componentType, field] of Object.entries(component)) {
            if (!field.variable) {
              console.error(`Warning: user_input_form[${componentIndex}] has no variable name:`, JSON.stringify(component, null, 2));
              continue;
            }
            
            const paramName = field.variable;
            
            // Set appropriate JSON Schema type based on component type
            let paramType = "string"; // Default is string
            
            // Determine parameter type based on component type
            if (componentType === "select" || componentType === "radio") {
              paramType = "string";
            } else if (componentType === "checkbox") {
              paramType = "array";
            } else if (componentType === "number") {
              paramType = "number";
            } else if (componentType === "slider") {
              paramType = "number";
            } else if (componentType === "switch") {
              paramType = "boolean";
            }
            
            properties[paramName] = {
              type: paramType,
              description: field.label || paramName
            };
            
            if (field.required) {
              required.push(paramName);
            }
          }
        });
      } 
      // For backward compatibility, also support the old parameters format
      else if (paramsData.parameters) {
        
        // Check the structure of paramsData.parameters
        if (!Array.isArray(paramsData.parameters)) {
          console.error("Warning: paramsData.parameters is not an array");
          
          // Try to convert to an array if it's an object
          if (typeof paramsData.parameters === 'object') {
            try {
              const paramsArray = Object.entries(paramsData.parameters).map(([key, value]) => {
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
              
              // Use the converted array
              paramsArray.forEach(param => {
                properties[param.name] = {
                  type: param.type || "string",
                  description: param.description || ""
                };
                
                if (param.required) {
                  required.push(param.name);
                }
              });
            } catch (error) {
              console.error("Parameter conversion error:", error);
            }
          }
        } else {
          // Normal processing if it's already an array
          paramsData.parameters.forEach((param, index) => {
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
      } else {
        console.error("Warning: No parameter definition found. Neither user_input_form nor parameters exists.");
      }
      
      tools.push({
        name: toolName,
        description: infoData.description || "Execute Dify Workflow",
        inputSchema: {
          type: "object",
          properties: properties,
          required: required
        }
      });
    } else {
      console.error("Error: infoData or paramsData is missing for one of the API keys");
    }
  });
  
  return tools;
} 