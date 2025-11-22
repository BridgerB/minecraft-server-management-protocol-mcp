// Allowlist management tools

import type { MinecraftConnectionPool } from "../websocket.ts";
import type { Player } from "../types.ts";

export function registerAllowlistTools(pool: MinecraftConnectionPool) {
  return [
    {
      name: "minecraft_get_allowlist",
      description: "Get the list of all players on the server allowlist",
      inputSchema: {
        type: "object",
        properties: {
          server: {
            type: "string",
            description: `Name of the configured server. Available: ${
              pool.getAvailableServers().join(", ")
            }`,
          },
        },
        required: ["server"],
      },
      handler: async ({ server }: { server: string }) => {
        const allowlist = await pool.request<Player[]>(
          server,
          "minecraft:allowlist",
        );

        if (allowlist.length === 0) {
          return {
            content: [{ type: "text", text: "Allowlist is empty" }],
          };
        }

        const formatted = allowlist.map((p) => `- ${p.name} (${p.id})`).join(
          "\n",
        );
        return {
          content: [{
            type: "text",
            text:
              `**${allowlist.length} player(s) on allowlist:**\n\n${formatted}`,
          }],
        };
      },
    },

    {
      name: "minecraft_add_to_allowlist",
      description: "Add one or more players to the server allowlist",
      inputSchema: {
        type: "object",
        properties: {
          server: {
            type: "string",
            description: `Name of the configured server. Available: ${
              pool.getAvailableServers().join(", ")
            }`,
          },
          playerNames: {
            type: "array",
            items: { type: "string" },
            description: "List of player names to add",
          },
        },
        required: ["server", "playerNames"],
      },
      handler: async (
        { server, playerNames }: { server: string; playerNames: string[] },
      ) => {
        const players: Player[] = playerNames.map((name) => ({
          name,
          id: "",
        }));

        const result = await pool.request<Player[]>(
          server,
          "minecraft:allowlist/add",
          { add: players },
        );

        return {
          content: [{
            type: "text",
            text: `Added ${result.length} player(s) to allowlist`,
          }],
        };
      },
    },

    {
      name: "minecraft_remove_from_allowlist",
      description: "Remove one or more players from the server allowlist",
      inputSchema: {
        type: "object",
        properties: {
          server: {
            type: "string",
            description: `Name of the configured server. Available: ${
              pool.getAvailableServers().join(", ")
            }`,
          },
          playerNames: {
            type: "array",
            items: { type: "string" },
            description: "List of player names to remove",
          },
        },
        required: ["server", "playerNames"],
      },
      handler: async (
        { server, playerNames }: { server: string; playerNames: string[] },
      ) => {
        const players: Player[] = playerNames.map((name) => ({
          name,
          id: "",
        }));

        const result = await pool.request<Player[]>(
          server,
          "minecraft:allowlist/remove",
          { remove: players },
        );

        return {
          content: [{
            type: "text",
            text:
              `Removed ${playerNames.length} player(s) from allowlist. ${result.length} players remaining.`,
          }],
        };
      },
    },

    {
      name: "minecraft_clear_allowlist",
      description:
        "Clear the entire server allowlist. WARNING: This removes all players!",
      inputSchema: {
        type: "object",
        properties: {
          server: {
            type: "string",
            description: `Name of the configured server. Available: ${
              pool.getAvailableServers().join(", ")
            }`,
          },
        },
        required: ["server"],
      },
      handler: async ({ server }: { server: string }) => {
        await pool.request<Player[]>(
          server,
          "minecraft:allowlist/clear",
        );

        return {
          content: [{
            type: "text",
            text: "Allowlist cleared successfully",
          }],
        };
      },
    },
  ];
}
