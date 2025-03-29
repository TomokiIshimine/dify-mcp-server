#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupServer } from "./server.js";
import { validateConfig } from "./config.js";

// Main function
async function main() {
  try {
    // Validate configuration before starting the server
    if (!validateConfig()) {
      console.error("Invalid configuration. Please check your environment variables.");
      process.exit(1);
    }
    
    const server = await setupServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();