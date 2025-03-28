# Dify Workflow MCP Tool Server

A tool server for easy integration with Dify Workflow using the Model Context Protocol (MCP).

## Features

- MCP protocol implementation enabling bidirectional communication with Claude
- Utilizes Dify Workflow as a tool
- Dynamically retrieves and displays Dify Workflow parameters
- Simple configuration using environment variables

## Prerequisites

- Node.js 16 or higher
- npm 7 or higher
- Access rights to Dify Workflow (API Key)

## Integration with Claude Desktop App

To use with Claude Desktop App, add the following settings to Claude's configuration file:

### Windows

Add to `%AppData%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dify-workflow": {
      "command": "npx",
      "args": ["@tonlab/dify-mcp-server"],
      "env": {
        "DIFY_BASE_URL": "https://your-dify-endpoint",
        "DIFY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### macOS/Linux

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dify-workflow": {
      "command": "npx",
      "args": ["@tonlab/dify-mcp-server"],
      "env": {
        "DIFY_BASE_URL": "https://your-dify-endpoint",
        "DIFY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## License
MIT
