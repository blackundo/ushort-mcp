/**
 * Credits & Orders tools — recent transactions, content purchase orders.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { adminGet, formatApiError, truncateIfNeeded } from '../services/admin-api.client.js';
import { CHARACTER_LIMIT } from '../constants.js';

export function registerCreditsOrdersTools(server: McpServer): void {
  // ── list_recent_credit_transactions ───────────────────────────────────────
  server.registerTool(
    'ushort_list_recent_credit_transactions',
    {
      title: 'List Recent Credit Transactions',
      description: `Get the 15 most recent system-wide credit transactions with user display names.

No parameters required. Returns the latest credit activity across all users.
Cached for 1 minute on backend.

Returns JSON array:
[{
  id: number,
  user_id: string,
  display_name: string | null,
  amount: number,         // positive = earned, negative = spent
  action: string,         // e.g. "topup", "purchase_episode", "admin_adjustment"
  balance_after: number,
  created_at: string
}]

Use for: "What's the latest credit activity?", "Show me recent transactions".`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const data = await adminGet('/credit-transactions');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );

  // ── list_orders ───────────────────────────────────────────────────────────
  server.registerTool(
    'ushort_list_orders',
    {
      title: 'List Content Purchase Orders',
      description: `Paginated list of content (episode) purchase orders across all providers.

Args:
  - limit (number): Results per page, 1–100 (default: 30)
  - offset (number): Pagination offset (default: 0)
  - provider (string): Filter by provider slug, e.g. "dramawave", "reelshort" (optional)
  - date_from (string): ISO 8601 lower bound (optional)
  - date_to (string): ISO 8601 upper bound (optional)

Returns JSON list of orders with content ID, credits spent, user, provider, timestamp.

Use for: "How many episodes were purchased?", "Which provider had the most purchases?".`,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(30)
          .describe('Results per page (1–100, default: 30)'),
        offset: z.number().int().min(0).default(0)
          .describe('Pagination offset (default: 0)'),
        provider: z.string().max(50).optional()
          .describe('Provider slug filter, e.g. "dramawave", "reelshort", "netshort"'),
        date_from: z.string().datetime({ offset: true }).optional()
          .describe('ISO 8601 lower bound for purchased_at'),
        date_to: z.string().datetime({ offset: true }).optional()
          .describe('ISO 8601 upper bound for purchased_at'),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const data = await adminGet('/orders', {
          limit: params.limit,
          offset: params.offset,
          provider: params.provider,
          date_from: params.date_from,
          date_to: params.date_to,
        });
        const text = truncateIfNeeded(JSON.stringify(data, null, 2), CHARACTER_LIMIT);
        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );

  // ── get_order_stats ───────────────────────────────────────────────────────
  server.registerTool(
    'ushort_get_order_stats',
    {
      title: 'Get Top Content by Purchases',
      description: `Get top N content items ranked by purchase count (most bought episodes/series).

Args:
  - limit (number): Top N results, 1–200 (default: 50)
  - provider (string): Filter by provider slug (optional)
  - date_from (string): ISO 8601 lower bound (optional)
  - date_to (string): ISO 8601 upper bound (optional)

Returns JSON ranked list: [{ content_id, title, purchase_count, provider }]

Use for: "What's the most popular content?", "Top 10 series this month?".`,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(200).default(50)
          .describe('Top N results (1–200, default: 50)'),
        provider: z.string().max(50).optional()
          .describe('Provider slug filter'),
        date_from: z.string().datetime({ offset: true }).optional()
          .describe('ISO 8601 lower bound'),
        date_to: z.string().datetime({ offset: true }).optional()
          .describe('ISO 8601 upper bound'),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const data = await adminGet('/orders/stats', {
          limit: params.limit,
          provider: params.provider,
          date_from: params.date_from,
          date_to: params.date_to,
        });
        const text = truncateIfNeeded(JSON.stringify(data, null, 2), CHARACTER_LIMIT);
        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );
}
