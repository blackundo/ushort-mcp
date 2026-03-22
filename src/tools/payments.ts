/**
 * Payment tools — summary stats, topup transactions, subscription transactions.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { adminGet, formatApiError, truncateIfNeeded } from '../services/admin-api.client.js';
import { CHARACTER_LIMIT } from '../constants.js';

/** Shared date range schema for payment queries */
const DateRangeSchema = z.object({
  date_from: z.string().datetime({ offset: true }).optional()
    .describe('ISO 8601 lower bound, e.g. "2026-01-01T00:00:00+07:00"'),
  date_to: z.string().datetime({ offset: true }).optional()
    .describe('ISO 8601 upper bound, e.g. "2026-03-31T23:59:59+07:00"'),
});

export function registerPaymentTools(server: McpServer): void {
  // ── get_payment_summary ───────────────────────────────────────────────────
  server.registerTool(
    'ushort_get_payment_summary',
    {
      title: 'Get Payment Summary',
      description: `Get summary stats for all topup and subscription payment transactions.

Returns aggregated totals for both credit topup payments (VPBank) and subscription purchases:
{
  topup: {
    total_count: number,
    completed_count: number,
    failed_count: number,
    total_vnd: number,       // Total VND collected via topup
    avg_topup_vnd: number
  },
  subscription: {
    total_count: number,
    completed_count: number,
    pending_count: number,
    total_revenue: number    // Subscription revenue
  }
}

Use this for: "What's our total revenue?", "How many failed payments this month?".`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const data = await adminGet('/payments/summary');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );

  // ── list_topup_transactions ───────────────────────────────────────────────
  server.registerTool(
    'ushort_list_topup_transactions',
    {
      title: 'List Credit Topup Transactions',
      description: `Paginated list of credit topup transactions (VPBank bank transfers).

Args:
  - limit (number): Results per page, 1–100 (default: 30)
  - offset (number): Pagination offset (default: 0)
  - status (string): Filter by "completed" | "failed" | "rejected" (optional)
  - date_from (string): ISO 8601 lower bound (optional)
  - date_to (string): ISO 8601 upper bound (optional)

Returns JSON list of topup transactions with user info, amount VND, credits awarded, status.

Use when investigating specific payments or calculating revenue in a date range.`,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(30)
          .describe('Results per page (1–100, default: 30)'),
        offset: z.number().int().min(0).default(0)
          .describe('Pagination offset (default: 0)'),
        status: z.enum(['completed', 'failed', 'rejected']).optional()
          .describe('Filter by transaction status'),
        ...DateRangeSchema.shape,
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
        const data = await adminGet('/payments/topups', {
          limit: params.limit,
          offset: params.offset,
          status: params.status,
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

  // ── list_subscription_transactions ───────────────────────────────────────
  server.registerTool(
    'ushort_list_subscription_transactions',
    {
      title: 'List Subscription Transactions',
      description: `Paginated list of subscription purchase transactions.

Args:
  - limit (number): Results per page, 1–100 (default: 30)
  - offset (number): Pagination offset (default: 0)
  - status (string): Filter by "pending" | "completed" | "expired" | "cancelled" (optional)
  - date_from (string): ISO 8601 lower bound (optional)
  - date_to (string): ISO 8601 upper bound (optional)

Returns JSON list of subscription transactions with tier, amount, user info.`,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(30)
          .describe('Results per page (1–100, default: 30)'),
        offset: z.number().int().min(0).default(0)
          .describe('Pagination offset (default: 0)'),
        status: z.enum(['pending', 'completed', 'expired', 'cancelled']).optional()
          .describe('Filter by transaction status'),
        ...DateRangeSchema.shape,
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
        const data = await adminGet('/payments/subscriptions', {
          limit: params.limit,
          offset: params.offset,
          status: params.status,
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
