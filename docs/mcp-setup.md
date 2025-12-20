# Supabase MCP Server Setup

This project includes configuration for the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), allowing AI assistants (like Claude Desktop, Cursor, or Trae) to interact directly with the Supabase database.

## Configuration File

The configuration is located in `mcp.json` in the root directory.

## Available Servers

### 1. Local Database (Postgres)
- **Name**: `supabase-local-db`
- **Type**: PostgreSQL
- **Connection**: Connects to the local Supabase instance running on port `54322`.
- **Capabilities**:
  - Read/Write access to all tables.
  - Execute custom SQL queries.
  - Inspect database schema.

### 2. Supabase Management API (Optional)
- **Name**: `supabase-management`
- **Status**: Disabled by default.
- **Usage**:
  1. Generate a Personal Access Token from [Supabase Dashboard](https://supabase.com/dashboard/account/tokens).
  2. Edit `mcp.json`:
     - Set `"disabled": false`.
     - Replace `YOUR_SUPABASE_ACCESS_TOKEN` with your actual token.
     - Ensure `project-ref` matches your project (currently `koperasi-os` for local).

## Usage with Claude Desktop

To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "koperasi-local": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      ]
    }
  }
}
```

## Troubleshooting

- **Connection Refused**: Ensure Supabase is running (`supabase start`).
- **Authentication Failed**: Verify the default password `postgres` matches your local setup.
