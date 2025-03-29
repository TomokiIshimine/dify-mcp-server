# Dify ワークフローMCPツールサーバー

Model Context Protocol (MCP)を使用してDify Workflowと簡単に連携するためのツールサーバーです。

## 特徴

- クロードとの双方向通信を可能にするMCPプロトコル実装
- Dify Workflowをツールとして活用
- Dify Workflowパラメータを動的に取得して表示
- 環境変数を使用したシンプルな設定
- **新機能**: 複数のDify APIキーをサポート

## 前提条件

- Node.js 16以上
- npm 7以上
- Dify Workflowへのアクセス権（APIキー）

## Claude Desktop Appとの連携

Claude Desktop Appで使用するには、Claudeの設定ファイルに以下の設定を追加します：

### Windows

`%AppData%\Claude\claude_desktop_config.json`に追加:

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

### 複数のAPIキーの使用（新機能）

複数のDify APIキーを設定できるようになりました。APIキーごとに別々のツールが作成されます：

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

各APIキーは、ツール名に連番を付けた別々のツールとしてClaudeに表示されます。

### macOS/Linux

`~/Library/Application Support/Claude/claude_desktop_config.json`に追加:

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

上記で説明した複数のAPIキー設定は、macOS/Linuxでも同様に動作します。

## ライセンス
MIT 