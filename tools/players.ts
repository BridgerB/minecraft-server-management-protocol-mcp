// Player management tools

import type { MinecraftConnectionPool } from "../websocket.ts";
import type { KickPlayer, Message, Player } from "../types.ts";

export function registerPlayerTools(pool: MinecraftConnectionPool) {
  return [
    {
      name: "minecraft_list_players",
      description:
        "Get all currently connected players on a Minecraft server. Returns player names and UUIDs.",
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
        const players = await pool.request<Player[]>(
          server,
          "minecraft:players",
        );

        if (players.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No players currently online.",
              },
            ],
          };
        }

        const formatted = players.map((p) => `- ${p.name} (${p.id})`).join(
          "\n",
        );
        return {
          content: [
            {
              type: "text",
              text: `**${players.length} player(s) online:**\n\n${formatted}`,
            },
          ],
        };
      },
    },

    {
      name: "minecraft_kick_player",
      description:
        "Kick one or more players from the Minecraft server with an optional message.",
      inputSchema: {
        type: "object",
        properties: {
          server: {
            type: "string",
            description: `Name of the configured server. Available: ${
              pool.getAvailableServers().join(", ")
            }`,
          },
          playerName: {
            type: "string",
            description: "Name of the player to kick",
          },
          message: {
            type: "string",
            description:
              "Optional kick message to display to the player (default: 'Kicked by operator')",
          },
        },
        required: ["server", "playerName"],
      },
      handler: async (
        { server, playerName, message }: {
          server: string;
          playerName: string;
          message?: string;
        },
      ) => {
        // First, get the list of players to find the player's UUID
        const players = await pool.request<Player[]>(
          server,
          "minecraft:players",
        );

        const player = players.find((p) => p.name === playerName);
        if (!player) {
          return {
            content: [
              {
                type: "text",
                text: `Player "${playerName}" is not online`,
              },
            ],
          };
        }

        const kickMessage: Message = {
          literal: message || "Kicked by operator",
        };

        const kickData: KickPlayer = {
          player: player,
          message: kickMessage,
        };

        const result = await pool.request<Player[]>(
          server,
          "minecraft:players/kick",
          { kick: [kickData] },
        );

        if (result.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to kick ${playerName} (player may not be online)`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully kicked ${result[0].name}`,
            },
          ],
        };
      },
    },
  ];
}
