// Configuration loader for Minecraft MCP Server

import type { McpConfig } from "./types.ts";

export async function loadConfig(): Promise<McpConfig> {
  // Get the config file path relative to this script
  const configPath = new URL("./config.json", import.meta.url).pathname;

  try {
    await Deno.stat(configPath);
  } catch {
    throw new Error(
      `Configuration file not found at ${configPath}. Please create config.json based on config.json.example`,
    );
  }

  try {
    const configText = await Deno.readTextFile(configPath);
    const config = JSON.parse(configText) as McpConfig;

    // Validate configuration
    if (!config.servers || typeof config.servers !== "object") {
      throw new Error(
        "Invalid configuration: 'servers' object is required",
      );
    }

    const serverNames = Object.keys(config.servers);
    if (serverNames.length === 0) {
      throw new Error(
        "Invalid configuration: at least one server must be configured",
      );
    }

    for (const [name, serverConfig] of Object.entries(config.servers)) {
      if (!serverConfig.url) {
        throw new Error(
          `Invalid configuration: server '${name}' is missing 'url'`,
        );
      }
      if (!serverConfig.secret) {
        throw new Error(
          `Invalid configuration: server '${name}' is missing 'secret'`,
        );
      }
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config.json: ${error.message}`);
    }
    throw error;
  }
}
