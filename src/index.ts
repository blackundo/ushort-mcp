#!/usr/bin/env node
/**
 * UShort MCP Server
 *
 * Exposes UShort admin APIs as MCP tools for Claude and other LLM agents.
 * Auth: x-mcp-key header (matches backend MCP_INTERNAL_KEY env var).
 *
 * Required env vars:
 *   MCP_INTERNAL_KEY  — must match backend MCP_INTERNAL_KEY
 *   USHORT_API_URL    — backend base URL (default: http://localhost:3056)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerKpiChartsTools } from './tools/kpi-charts.js';
import { registerUserTools } from './tools/users.js';
import { registerPaymentTools } from './tools/payments.js';
import { registerCreditsOrdersTools } from './tools/credits-orders.js';
import { MCP_INTERNAL_KEY, API_BASE_URL } from './constants.js';

// Validate required config at startup
if (!MCP_INTERNAL_KEY) {
  console.error('ERROR: MCP_INTERNAL_KEY environment variable is required');
  process.exit(1);
}

const server = new McpServer({
  name: 'ushort-mcp-server',
  version: '1.0.0',
});

// Register all tool groups
registerKpiChartsTools(server);
registerUserTools(server);
registerPaymentTools(server);
registerCreditsOrdersTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`UShort MCP server running | API: ${API_BASE_URL}`);
}

main().catch((error: unknown) => {
  console.error('Server fatal error:', error);
  process.exit(1);
});
