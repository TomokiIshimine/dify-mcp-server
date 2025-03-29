#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupServer } from "./server.js";
import { AppConfig } from "./config.js";

// Main function
async function main() {
  try {
    // 設定を検証（この検証はsetupServerでも行われるが、早期に失敗するために二重に行う）
    AppConfig.validateStrict();
    
    const server = await setupServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to start server:");
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    } else {
      console.error(`Unknown error: ${error}`);
    }
    process.exit(1);
  }
}

main();