import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import pino from "pino";
import { createServer } from "http";
import { vectorTools } from "./tools/vector-tools.js";
import { githubTools } from "./tools/github-tools.js";
import { fsTools } from "./tools/fs-tools.js";
import { shellTools } from "./tools/shell-tools.js";
import { skillTools } from "./tools/skill-tools.js";

const logger = pino({ level: process.env.LOG_LEVEL || "warn" });
const PORT = process.env.PORT || 3001;

const ALL_TOOLS = [
  ...vectorTools,
  ...githubTools,
  ...fsTools,
  ...shellTools,
  ...skillTools
];

const server = new Server(
  { name: "eyegents-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = ALL_TOOLS.find(t => t.name === request.params.name);
  if (!tool) throw new Error(`Unknown tool: ${request.params.name}`);

  logger.debug({ tool: request.params.name }, "Executing tool");
  try {
    const result = await (tool.handler as (args: any) => Promise<any>)(request.params.arguments ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    logger.error({ tool: request.params.name, error: e }, "Tool execution failed");
    throw e;
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "codebase://", name: "Codebase", description: "Access to project codebase", mimeType: "application/json" },
    { uri: "docs://", name: "Documentation", description: "Project documentation", mimeType: "application/json" },
    { uri: "memory://", name: "Agent Memory", description: "Agent conversation memory", mimeType: "application/json" }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri.startsWith("codebase://")) {
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ message: "Use vector_search tool" }) }] };
  }
  if (uri.startsWith("docs://")) {
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ message: "Use vector_search with collection=docs" }) }] };
  }
  if (uri.startsWith("memory://")) {
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ message: "Use vector_search with collection=conversations" }) }] };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    { name: "context-retrieval", description: "Retrieve relevant context for a coding task", arguments: [{ name: "task", description: "Task description", required: true }] },
    { name: "task-decomposition", description: "Decompose complex task into subtasks for agents", arguments: [{ name: "task", description: "Task description", required: true }] }
  ]
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  const task = args.task || "";
  
  if (request.params.name === "context-retrieval") {
    const text = "Retrieve context for: " + task;
    return { messages: [{ role: "user", content: { type: "text", text } }] };
  }
  if (request.params.name === "task-decomposition") {
    const text = "Decompose task: " + task;
    return { messages: [{ role: "user", content: { type: "text", text } }] };
  }
  throw new Error("Unknown prompt: " + request.params.name);
});

// HTTP health check server
const httpServer = createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "eyegents-mcp", timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("eyegents MCP server running on stdio");

  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, "HTTP health server listening");
  });
}

main().catch((e) => {
  logger.fatal(e, "MCP server failed");
  process.exit(1);
});