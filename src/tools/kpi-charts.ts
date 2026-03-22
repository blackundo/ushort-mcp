/**
 * KPI & Charts tools — read-only analytics for revenue, users, credits, subscriptions.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { adminGet, formatApiError, truncateIfNeeded } from '../services/admin-api.client.js';
import { CHARACTER_LIMIT } from '../constants.js';

export function registerKpiChartsTools(server: McpServer): void {
  // ── get_kpi ───────────────────────────────────────────────────────────────
  server.registerTool(
    'ushort_get_kpi',
    {
      title: 'Get KPI Dashboard',
      description: `Retrieve system-wide KPI metrics for the UShort platform.

Returns aggregated stats across users, revenue, credits, subscriptions, and content.
Data is cached for 5 minutes on the backend.

Returns JSON object with:
{
  users: {
    total: number,         // All registered users
    new_24h: number,       // New users in last 24 hours
    new_7d: number,        // New users in last 7 days
    active_24h: number,    // Users active in last 24 hours
    active_sessions: number
  },
  revenue: {
    today: number,         // Revenue today (VND)
    last_7d: number,       // Revenue last 7 days (VND)
    successful_transactions: number,
    failed_transactions: number
  },
  credits: {
    total_balance: number,
    total_earned: number,
    total_spent: number,
    minted_24h: number,
    spent_24h: number,
    avg_balance_per_user: number
  },
  subscriptions: {
    active: number,
    expiring_soon: number,
    tier_distribution: [{ name: string, count: number }]
  },
  content: {
    purchases_24h: number,
    watch_events_24h: number
  }
}

Use this as the first tool to get a high-level overview before drilling into specifics.`,
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
        const data = await adminGet('/kpi');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );

  // ── get_charts ────────────────────────────────────────────────────────────
  server.registerTool(
    'ushort_get_charts',
    {
      title: 'Get Time-Series Charts',
      description: `Retrieve daily time-series data for the last N days (7–90).

Data is cached for 15 minutes on the backend.

Args:
  - days (number): Number of days to look back, 7–90 (default: 30)

Returns JSON with daily arrays:
{
  revenue_by_day:   [{ date: "YYYY-MM-DD", revenue: number, success: number, failed: number }],
  new_users_by_day: [{ date: "YYYY-MM-DD", count: number }],
  credits_by_day:   [{ date: "YYYY-MM-DD", minted: number, spent: number }],
  watch_by_day:     [{ date: "YYYY-MM-DD", events: number }]
}

Use this to answer: "How was revenue trending this month?", "When did user growth spike?".`,
      inputSchema: z.object({
        days: z.number().int().min(7).max(90).default(30)
          .describe('Number of days for the time-series window (7–90, default: 30)'),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ days }) => {
      try {
        const data = await adminGet('/charts', { days });
        const text = truncateIfNeeded(JSON.stringify(data, null, 2), CHARACTER_LIMIT);
        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );
}
