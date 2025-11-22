#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * Minecraft Server Management Protocol MCP Server
 *
 * Provides Model Context Protocol (MCP) tools for managing Minecraft servers
 * via the Minecraft Server Management Protocol (JSON-RPC over WebSocket).
 *
 * Requires Minecraft 1.21.9+ with management server enabled.
 */

import { Server } from "npm:@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.ts";
import { MinecraftConnectionPool } from "./websocket.ts";
import { registerPlayerTools } from "./tools/players.ts";
import { registerServerTools } from "./tools/server.ts";
import { registerAllowlistTools } from "./tools/allowlist.ts";

async function main() {
  // Load configuration
  const config = await loadConfig();
  const pool = new MinecraftConnectionPool(config.servers);

  // Create MCP server
  const server = new Server(
    {
      name: "minecraft-server-management",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register all tool handlers
  const allTools = [
    ...registerPlayerTools(pool),
    ...registerServerTools(pool),
    ...registerAllowlistTools(pool),
    // TODO: Add more tool categories:
    // ...registerBanTools(pool),
    // ...registerOperatorTools(pool),
    // ...registerSettingsTools(pool),
    // ...registerGameruleTools(pool),
  ];

  // Handle list_tools request
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle call_tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = allTools.find((t) => t.name === toolName);

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
      const args = (request.params.arguments || {}) as Record<string, unknown>;
      const result = await (tool.handler as (
        args: Record<string, unknown>,
      ) => Promise<unknown>)(args);
      return result as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return {
        content: [{
          type: "text",
          text: `Error: ${errorMessage}`,
        }],
        isError: true,
      };
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Minecraft MCP Server running on stdio");
  console.error(
    `Configured servers: ${pool.getAvailableServers().join(", ")}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  Deno.exit(1);
});
