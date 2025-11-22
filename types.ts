// Minecraft Server Management Protocol TypeScript Types
// Based on Minecraft 1.21.9+ specification

// ===== Core Schemas =====

export interface Player {
  name: string;
  id: string; // UUID
}

export interface Operator {
  player: Player;
  permissionLevel: number;
  bypassesPlayerLimit: boolean;
}

export interface Version {
  name: string;
  protocol: number;
}

export interface ServerState {
  started: boolean;
  version: Version;
  players: Player[];
}

export interface Message {
  literal?: string;
  translatable?: string;
  translatableParams?: string[];
}

export interface SystemMessage {
  message: Message;
  overlay: boolean;
  receivingPlayers: Player[];
}

export interface KickPlayer {
  player: Player;
  message: Message;
}

export interface UserBan {
  player: Player;
  source: string;
  reason: string;
  expires: string;
}

export interface IPBan {
  ip: string;
  source: string;
  reason: string;
  expires: string;
}

export interface IncomingIPBan {
  ip: string;
  source: string;
  reason: string;
  expires: string;
  player: Player;
}

export interface TypedGameRule {
  key: string;
  value: string | number | boolean;
  type: "integer" | "boolean";
}

export interface UntypedGameRule {
  key: string;
  value: string;
}

// ===== JSON-RPC Types =====

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  id: number | string;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: Record<string, unknown>;
}

// ===== MCP Configuration =====

export interface MinecraftServerConfig {
  url: string;
  secret: string;
}

export interface McpConfig {
  servers: Record<string, MinecraftServerConfig>;
}
