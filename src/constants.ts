/** Max characters in a single MCP tool response to avoid overwhelming context */
export const CHARACTER_LIMIT = 25_000;

/** Backend admin API base URL */
export const API_BASE_URL = process.env.USHORT_API_URL ?? 'http://localhost:3056';

/** Internal key sent as x-mcp-key header — must match backend MCP_INTERNAL_KEY */
export const MCP_INTERNAL_KEY = process.env.MCP_INTERNAL_KEY ?? '';
