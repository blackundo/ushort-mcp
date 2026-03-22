/**
 * User management tools — list, detail, credit adjustment.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { adminGet, adminPost, formatApiError, truncateIfNeeded } from '../services/admin-api.client.js';
import { CHARACTER_LIMIT } from '../constants.js';

export function registerUserTools(server: McpServer): void {
  // ── list_users ────────────────────────────────────────────────────────────
  server.registerTool(
    'ushort_list_users',
    {
      title: 'List Users',
      description: `Retrieve a paginated list of all UShort users with summary stats.

Args:
  - limit (number): Results per page, 1–100 (default: 20)
  - offset (number): Skip N results for pagination (default: 0)
  - search (string): Filter by email or display_name (optional)
  - subscription_tier (string): Filter by tier — "free" | "trial" | "weekly" | "monthly" | "quarterly" (optional)
  - subscription_status (string): Filter by status — "active" | "grace_period" | "expired" | "cancelled" (optional)

Returns JSON:
{
  total: number,
  data: [{ id, email, display_name, subscription_tier, subscription_status, credit_balance, created_at, last_active_at }]
}

Use this to: count users, find users by email, filter by subscription tier.
Don't use this to: get detailed user history (use ushort_get_user_detail instead).`,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20)
          .describe('Results per page (1–100, default: 20)'),
        offset: z.number().int().min(0).default(0)
          .describe('Skip N results for pagination (default: 0)'),
        search: z.string().max(100).optional()
          .describe('Filter by email or display_name (partial match)'),
        subscription_tier: z.enum(['free', 'trial', 'weekly', 'monthly', 'quarterly']).optional()
          .describe('Filter by subscription tier'),
        subscription_status: z.enum(['active', 'grace_period', 'expired', 'cancelled']).optional()
          .describe('Filter by subscription status'),
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
        const data = await adminGet('/users', {
          limit: params.limit,
          offset: params.offset,
          search: params.search,
          subscription_tier: params.subscription_tier,
          subscription_status: params.subscription_status,
        });
        const text = truncateIfNeeded(JSON.stringify(data, null, 2), CHARACTER_LIMIT);
        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );

  // ── get_user_detail ───────────────────────────────────────────────────────
  server.registerTool(
    'ushort_get_user_detail',
    {
      title: 'Get User Detail',
      description: `Get full details for a single user including stats, subscription history, and devices.

Args:
  - user_id (string): Supabase user UUID (get from ushort_list_users first)

Returns JSON with complete user profile:
{
  id, email, display_name,
  credit_balance, total_credits_earned, total_credits_spent,
  subscription: { tier, status, expires_at, ... },
  subscription_history: [...],
  devices: [{ device_name, last_active_at, ... }],
  watch_event_count,
  content_purchase_count
}

Use this after ushort_list_users when you need full detail on a specific user.`,
      inputSchema: z.object({
        user_id: z.string().uuid().describe('Supabase user UUID'),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ user_id }) => {
      try {
        const data = await adminGet(`/users/${user_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );

  // ── adjust_user_credits ───────────────────────────────────────────────────
  server.registerTool(
    'ushort_adjust_user_credits',
    {
      title: 'Adjust User Credits',
      description: `Add or deduct credits for a specific user (admin write operation).

⚠️  WARNING: This is a destructive write operation. Verify user_id and amount before calling.
    Always confirm with the operator before using negative amounts (deductions).

Args:
  - user_id (string): Supabase user UUID
  - amount (number): Credits to add (positive) or deduct (negative). Range: -10000 to 10000.
  - reason (string): Reason for adjustment — shown in credit transaction history (max 200 chars)

Returns JSON confirmation with new balance.

Examples:
  - Refund: amount=100, reason="Refund for failed content purchase #12345"
  - Bonus: amount=50, reason="Promotional bonus for early adopter"
  - Correction: amount=-20, reason="Admin correction — duplicate credit award"`,
      inputSchema: z.object({
        user_id: z.string().uuid().describe('Supabase user UUID'),
        amount: z.number().int().min(-10_000).max(10_000)
          .describe('Credits to add (positive) or deduct (negative)'),
        reason: z.string().min(5).max(200)
          .describe('Reason for adjustment (shown in transaction history)'),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ user_id, amount, reason }) => {
      try {
        const data = await adminPost(`/users/${user_id}/credits`, { amount, reason });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: formatApiError(error) }] };
      }
    },
  );
}
