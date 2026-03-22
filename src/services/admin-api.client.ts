/**
 * Shared HTTP client for UShort admin API.
 * All requests include x-mcp-key header for internal service auth.
 */
import axios, { AxiosError } from 'axios';
import { API_BASE_URL, MCP_INTERNAL_KEY } from '../constants.js';

/** Generic GET request to /admin/* */
export async function adminGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const response = await axios.get<T>(`${API_BASE_URL}/admin${path}`, {
    params,
    timeout: 15_000,
    headers: {
      'x-mcp-key': MCP_INTERNAL_KEY,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

/** Generic POST request to /admin/* */
export async function adminPost<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const response = await axios.post<T>(`${API_BASE_URL}/admin${path}`, body, {
    timeout: 15_000,
    headers: {
      'x-mcp-key': MCP_INTERNAL_KEY,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

/** Convert AxiosError into a human-readable, actionable string for the agent */
export function formatApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const message = (error.response?.data as Record<string, unknown>)?.message;

    switch (status) {
      case 401: return 'Error 401: Unauthorized. Check MCP_INTERNAL_KEY matches backend MCP_INTERNAL_KEY env var.';
      case 403: return 'Error 403: Forbidden. The MCP service account does not have admin access.';
      case 404: return `Error 404: Resource not found. Verify the ID or parameters.`;
      case 429: return 'Error 429: Rate limit exceeded. Wait a moment before retrying.';
      case 500: return `Error 500: Backend internal error. ${message ?? ''}`;
    }
    if (error.code === 'ECONNREFUSED') {
      return `Error: Cannot connect to backend at ${API_BASE_URL}. Is the server running?`;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Error: Request timed out (15s). Backend may be overloaded.';
    }
    return `Error ${status ?? 'network'}: ${message ?? error.message}`;
  }
  return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
}

/** Truncate string response if it exceeds CHARACTER_LIMIT */
export function truncateIfNeeded(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + `\n\n[Response truncated at ${limit} chars. Use pagination (offset) to see more.]`;
}
