# Dify Workflow MCP ツールサーバー

Model Context Protocol (MCP) を使用して、Dify Workflowを簡単に統合するためのツールサーバーです。

## 機能

- Claudeとの双方向通信を可能にするMCPプロトコル実装
- Dify Workflowをツールとして利用可能
- Dify Workflowのパラメータを動的に取得して表示
- 環境変数を使用した簡単な設定

## 前提条件

- Node.js 16以上
- npm 7以上
- Dify Workflowのアクセス権（API Key）

## Claude デスクトップアプリとの連携

Claude デスクトップアプリで使用するには、以下の設定をClaudeの設定ファイルに追加してください：

### Windows

`%AppData%\Claude\claude_desktop_config.json` に以下を追加：

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

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加：

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

## ライセンス
MIT