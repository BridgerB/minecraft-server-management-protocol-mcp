// WebSocket Client Manager for Minecraft Server Management Protocol

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  MinecraftServerConfig,
} from "./types.ts";

export class MinecraftWebSocketClient {
  private wss: WebSocketStream | null = null;
  private writer: WritableStreamDefaultWriter<string | Uint8Array> | null =
    null;
  private reader: ReadableStreamDefaultReader<string | Uint8Array> | null =
    null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private config: MinecraftServerConfig;
  private connected = false;
  private readerLoop: Promise<void> | null = null;

  constructor(config: MinecraftServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Create WebSocketStream with Authorization header
      this.wss = new WebSocketStream(this.config.url, {
        headers: {
          "Authorization": `Bearer ${this.config.secret}`,
        },
      });

      // Wait for connection to open
      const { readable, writable } = await this.wss.opened;

      this.writer = writable.getWriter();
      this.reader = readable.getReader();
      this.connected = true;

      // Start reading messages in the background
      this.readerLoop = this.readMessages();

      // Handle connection close
      this.wss.closed.then(() => {
        this.connected = false;
        this.cleanup();
        // Reject all pending requests
        for (const { reject } of this.pendingRequests.values()) {
          reject(new Error("WebSocket connection closed"));
        }
        this.pendingRequests.clear();
      }).catch((error) => {
        console.error("WebSocket closed with error:", error);
      });
    } catch (error) {
      this.connected = false;
      throw new Error(`WebSocket connection error: ${error}`);
    }
  }

  private async readMessages(): Promise<void> {
    if (!this.reader) return;

    try {
      while (true) {
        const { value, done } = await this.reader.read();

        if (done) {
          break;
        }

        if (value) {
          try {
            // Convert Uint8Array to string if needed
            const message = typeof value === "string"
              ? value
              : new TextDecoder().decode(value);
            const response: JsonRpcResponse = JSON.parse(message);
            const pending = this.pendingRequests.get(Number(response.id));

            if (pending) {
              this.pendingRequests.delete(Number(response.id));

              if (response.error) {
                pending.reject(
                  new Error(
                    `JSON-RPC Error ${response.error.code}: ${response.error.message}`,
                  ),
                );
              } else {
                pending.resolve(response.result);
              }
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error reading messages:", error);
    }
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    await this.connect();

    if (!this.connected || !this.writer) {
      throw new Error("WebSocket is not connected");
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      id,
    };

    if (params !== undefined) {
      request.params = params;
    }

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      // Send the request (don't await in promise executor)
      this.writer!.write(JSON.stringify(request)).catch((error) => {
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to send request: ${error}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
  }

  private cleanup(): void {
    this.writer = null;
    this.reader = null;
    this.wss = null;
  }

  disconnect(): void {
    if (this.wss) {
      this.wss.close();
      this.cleanup();
      this.connected = false;
    }
  }
}

// Connection pool for multiple servers
export class MinecraftConnectionPool {
  private clients = new Map<string, MinecraftWebSocketClient>();
  private configs: Map<string, MinecraftServerConfig>;

  constructor(configs: Record<string, MinecraftServerConfig>) {
    this.configs = new Map(Object.entries(configs));
  }

  getClient(serverName: string): MinecraftWebSocketClient {
    const config = this.configs.get(serverName);
    if (!config) {
      throw new Error(
        `Server '${serverName}' not found in configuration. Available servers: ${
          Array.from(this.configs.keys()).join(", ")
        }`,
      );
    }

    if (!this.clients.has(serverName)) {
      this.clients.set(serverName, new MinecraftWebSocketClient(config));
    }

    return this.clients.get(serverName)!;
  }

  async request<T = unknown>(
    serverName: string,
    method: string,
    params?: unknown,
  ): Promise<T> {
    const client = this.getClient(serverName);
    return await client.request<T>(method, params);
  }

  disconnect(serverName?: string): void {
    if (serverName) {
      const client = this.clients.get(serverName);
      if (client) {
        client.disconnect();
        this.clients.delete(serverName);
      }
    } else {
      // Disconnect all
      for (const client of this.clients.values()) {
        client.disconnect();
      }
      this.clients.clear();
    }
  }

  getAvailableServers(): string[] {
    return Array.from(this.configs.keys());
  }
}
