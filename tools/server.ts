// Server management tools

import type { MinecraftConnectionPool } from "../websocket.ts";
import type { Player, ServerState, SystemMessage } from "../types.ts";

export function registerServerTools(pool: MinecraftConnectionPool) {
  return [
    {
      name: "minecraft_server_status",
      description:
        "Get the current status of a Minecraft server including version, player count, and running state.",
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
        const status = await pool.request<ServerState>(
          server,
          "minecraft:server/status",
        );

        // Get player count separately
        const players = await pool.request<Player[]>(
          server,
          "minecraft:players",
        );

        const formatted = `**Server Status**

**Running:** ${status.started ? "Yes" : "No"}
**Version:** ${status.version.name} (Protocol ${status.version.protocol})
**Players Online:** ${players.length}

${
          players.length > 0
            ? `**Current Players:**\n${
              players.map((p) => `- ${p.name}`).join("\n")
            }`
            : ""
        }`;

        return {
          content: [{
            type: "text",
            text: formatted,
          }],
        };
      },
    },

    {
      name: "minecraft_stop_server",
      description:
        "Stop the Minecraft server gracefully. WARNING: This will shut down the server!",
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
        const result = await pool.request<{ stopping: boolean }>(
          server,
          "minecraft:server/stop",
        );

        return {
          content: [{
            type: "text",
            text: result.stopping
              ? "Server shutdown initiated"
              : "Failed to initiate server shutdown",
          }],
        };
      },
    },

    {
      name: "minecraft_send_system_message",
      description:
        "Send a system message to all players or specific players. Can be displayed as overlay (actionbar) or chat.",
      inputSchema: {
        type: "object",
        properties: {
          server: {
            type: "string",
            description: `Name of the configured server. Available: ${
              pool.getAvailableServers().join(", ")
            }`,
          },
          message: {
            type: "string",
            description: "The message text to send",
          },
          overlay: {
            type: "boolean",
            description:
              "If true, display as action bar text. If false, send to chat.",
            default: false,
          },
          playerNames: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional list of player names to send to. If empty, sends to all players.",
          },
        },
        required: ["server", "message"],
      },
      handler: async (
        { server, message, overlay = false, playerNames = [] }: {
          server: string;
          message: string;
          overlay?: boolean;
          playerNames?: string[];
        },
      ) => {
        // Get all online players first
        const allPlayers = await pool.request<Player[]>(
          server,
          "minecraft:players",
        );

        if (allPlayers.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No players online to receive the message",
            }],
          };
        }

        let receivingPlayers: Player[];

        if (playerNames.length > 0) {
          // Send to specific players
          receivingPlayers = playerNames
            .map((name) => allPlayers.find((p) => p.name === name))
            .filter((p): p is Player => p !== undefined);

          if (receivingPlayers.length === 0) {
            return {
              content: [{
                type: "text",
                text: `None of the specified players are online`,
              }],
            };
          }
        } else {
          // Send to all players
          receivingPlayers = allPlayers;
        }

        const msgData: SystemMessage = {
          message: { literal: message },
          overlay,
          receivingPlayers,
        };

        const result = await pool.request<boolean>(
          server,
          "minecraft:server/system_message",
          { message: msgData },
        );

        return {
          content: [{
            type: "text",
            text: result
              ? `Message sent successfully${
                overlay ? " (as overlay)" : " (to chat)"
              } to ${receivingPlayers.length} player(s): ${
                receivingPlayers.map((p) => p.name).join(", ")
              }`
              : "Failed to send message",
          }],
        };
      },
    },
  ];
}
