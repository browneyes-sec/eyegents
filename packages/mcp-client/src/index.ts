import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let mcpClientInstance: Client | null = null;

export async function getMCPClient(): Promise<Client> {
  if (mcpClientInstance) return mcpClientInstance;

  const transport = new StdioClientTransport({
    command: "docker",
    args: ["exec", "-i", "eyegents-mcp", "node", "dist/index.js"]
  });

  mcpClientInstance = new Client({ name: "eyegents-agent", version: "0.1.0" });
  await mcpClientInstance.connect(transport);
  return mcpClientInstance;
}

export const mcpClient = {
  async callTool(name: string, args: any): Promise<any> {
    const client = await getMCPClient();
    return client.callTool({ name, arguments: args });
  },

  async listTools() {
    const client = await getMCPClient();
    return client.listTools();
  },

  async readResource(uri: string) {
    const client = await getMCPClient();
    return client.readResource({ uri });
  },

  async getPrompt(name: string, args: any) {
    const client = await getMCPClient();
    return client.getPrompt({ name, arguments: args });
  }
};