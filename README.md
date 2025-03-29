# Dify Workflow MCP Tool Server

A tool server for easy integration with Dify Workflow using the Model Context Protocol (MCP).

## Features

- MCP protocol implementation enabling bidirectional communication with Claude
- Utilizes Dify Workflow as a tool
- Dynamically retrieves and displays Dify Workflow parameters
- Simple configuration using environment variables
- **NEW**: Support for multiple Dify API keys

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

### Using Multiple API Keys (NEW)

You can now configure multiple Dify API keys, which will create multiple tools (one per API key):

```json
{
  "mcpServers": {
    "dify": {
      "command": "npx",
      "args": ["@tonlab/dify-mcp-server"],
      "env": {
        "DIFY_BASE_URL": "https://api.dify.ai/v1",
        "DIFY_API_KEYS": [
          "app-FirstAPIKeyHere",
          "app-SecondAPIKeyHere",
          "app-ThirdAPIKeyHere"
        ]
      }
    }
  }
}
```

Each API key will be exposed as a separate tool in Claude, with a distinct number appended to the tool name.

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

Same multiple API key configuration as described above works on macOS/Linux as well.

## License
MIT
