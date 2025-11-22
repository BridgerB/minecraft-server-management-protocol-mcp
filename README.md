# Minecraft Server Management Protocol MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that
provides tools for managing Minecraft servers via the
[Minecraft Server Management Protocol](https://minecraft.wiki/w/Minecraft_Server_Management_Protocol).

## Features

- **Multiple Server Support**: Connect to and manage multiple Minecraft servers
- **Comprehensive Tools**: Full implementation of the Minecraft Server
  Management Protocol
- **Type-Safe**: Written in TypeScript with full type definitions
- **WebSocket**: Efficient JSON-RPC 2.0 over WebSocket communication

## Requirements

- **Deno** 2.0 or higher
- **Minecraft Server** 1.21.9+ with management server enabled
- Management server configured in `server.properties`:
  ```properties
  management-server-enabled=true
  management-server-host=0.0.0.0
  management-server-port=9090
  management-server-tls-enabled=false
  ```

## Installation

1. Clone this repository:
   ```bash
   cd /home/bridger/git
   git clone <your-repo-url> minecraft-server-management-protocol-mcp
   cd minecraft-server-management-protocol-mcp
   ```

2. Create your configuration file:
   ```bash
   cp config.json.example config.json
   ```

3. Edit `config.json` with your server details:
   ```json
   {
     "servers": {
       "production": {
         "url": "ws://your-server-ip:9090",
         "secret": "your-40-character-secret-from-server.properties"
       }
     }
   }
   ```

## Usage with Claude Code

Add this server to your Claude Code configuration:

```bash
claude mcp add --transport stdio minecraft-server \\
  -- deno run --allow-net --allow-read --allow-env \\
  /home/bridger/git/minecraft-server-management-protocol-mcp/main.ts
```

Then in Claude Code, you can use commands like:

```
> How many players are on the production server?
> Kick player "Griefer123" from production with message "Banned for griefing"
> Get the server status for production
> Add "NewPlayer" to the allowlist on production
```

## Available Tools

### Player Management

- `minecraft_list_players` - List all connected players
- `minecraft_kick_player` - Kick a player with optional message

### Server Control

- `minecraft_server_status` - Get server status (version, players, state)
- `minecraft_save_server` - Save the world to disk
- `minecraft_stop_server` - Gracefully stop the server
- `minecraft_send_system_message` - Send messages to players

### Allowlist Management

- `minecraft_get_allowlist` - Get all allowlisted players
- `minecraft_add_to_allowlist` - Add players to allowlist
- `minecraft_remove_from_allowlist` - Remove players from allowlist
- `minecraft_clear_allowlist` - Clear entire allowlist

### More Tools (TODO)

The following tool categories are planned:

- Ban management
- IP ban management
- Operator management
- Server settings (difficulty, max players, MOTD, etc.)
- Gamerule management

## Configuration

### Server Configuration Format

```json
{
  "servers": {
    "<server-name>": {
      "url": "ws://<host>:<port>",
      "secret": "<40-character-secret>"
    }
  }
}
```

- `server-name`: A friendly name you choose (e.g., "production", "staging")
- `url`: WebSocket URL to your Minecraft management server
- `secret`: The `management-server-secret` from your `server.properties`

### Finding Your Server Secret

The secret is in your Minecraft server's `server.properties` file:

```bash
grep management-server-secret /var/lib/minecraft/server.properties
```

Example output:

```
management-server-secret=ABCxyz123
```

## Development

### Running Tests

```bash
deno test
```

### Running Locally

```bash
deno run --allow-net --allow-read --allow-env main.ts
```

### Adding New Tools

1. Create a new file in `tools/` (e.g., `tools/bans.ts`)
2. Export a `registerBanTools(pool)` function
3. Import and add to `allTools` in `main.ts`

Example tool structure:

```typescript
export function registerBanTools(pool: MinecraftConnectionPool) {
  return [
    {
      name: "minecraft_list_bans",
      description: "Get all banned players",
      inputSchema: {
        type: "object",
        properties: {
          server: { type: "string", description: "Server name" },
        },
        required: ["server"],
      },
      handler: async ({ server }: { server: string }) => {
        const bans = await pool.request(server, "minecraft:bans");
        return {
          content: [{ type: "text", text: JSON.stringify(bans, null, 2) }],
        };
      },
    },
  ];
}
```

## Architecture

```
main.ts                 # MCP server entry point
├── config.ts           # Configuration loader
├── websocket.ts        # WebSocket client & connection pool
├── types.ts            # TypeScript type definitions
└── tools/              # Tool implementations
    ├── players.ts
    ├── server.ts
    ├── allowlist.ts
    └── ...             # Add more tool files here
```

## Troubleshooting

### "Configuration file not found"

Make sure you've created `config.json` from `config.json.example` and it's in
the project root.

### "WebSocket connection error"

1. Verify your Minecraft server is running
2. Check that `management-server-enabled=true` in server.properties
3. Ensure the port (9090) is open in your firewall
4. Verify the URL format: `ws://host:port` (not `wss://` unless TLS is enabled)

### "JSON-RPC Error -32601: Method not found"

The Minecraft server doesn't support that method. Ensure you're running
Minecraft 1.21.9 or higher.

### "Request timeout"

The server isn't responding. Check:

1. Server is running and accessible
2. Management server is enabled and listening
3. Secret matches between config.json and server.properties

## License

Unlicense (Public Domain)

## Contributing

Contributions welcome! To add support for more Minecraft Server Management
Protocol methods:

1. Add types to `types.ts` if needed
2. Create tool implementations in `tools/`
3. Register tools in `main.ts`
4. Update this README

## References

- [Minecraft Server Management Protocol](https://minecraft.wiki/w/Minecraft_Server_Management_Protocol)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
