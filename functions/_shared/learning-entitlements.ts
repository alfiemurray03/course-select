import {
  currentSubscription,
  subscriptionHasAccess,
  type LmsPlanId,
  type SubscriptionRow,
} from './production-lms';

export type LearningPlanName = 'Learner' | 'Learner Plus' | 'Team 5' | 'Team 15';

export function learningPlanName(planId: LmsPlanId | string | null | undefined): LearningPlanName | null {
  if (planId === 'learner') return 'Learner';
  if (planId === 'learner-plus') return 'Learner Plus';
  if (planId === 'team-5') return 'Team 5';
  if (planId === 'team-15') return 'Team 15';
  return null;
}

export function learningPlanTier(planId: LmsPlanId | string | null | undefined): 'core' | 'complete' | null {
  if (planId === 'learner' || planId === 'team-5') return 'core';
  if (planId === 'learner-plus' || planId === 'team-15') return 'complete';
  return null;
}

export function subscriptionIncludesCourse(
  subscription: SubscriptionRow | null,
  includedPlans: readonly string[],
) {
  if (!subscriptionHasAccess(subscription) || !subscription) return false;
  const plan = learningPlanName(subscription.plan_id);
  if (!plan) return false;

  // Core courses are marked by Learner membership and belong to all four plans.
  // Complete-only courses are restricted to Learner Plus and Team 15.
  const isCoreCourse = includedPlans.includes('Learner');
  if (isCoreCourse) return true;
  return plan === 'Learner Plus' || plan === 'Team 15';
}

function entitlementRank(subscription: SubscriptionRow | null) {
  if (!subscriptionHasAccess(subscription) || !subscription) return 0;
  return learningPlanTier(subscription.plan_id) === 'complete' ? 2 : 1;
}

export async function effectiveLearningSubscription(
  db: D1Database,
  accountId: string,
): Promise<SubscriptionRow | null> {
  const direct = await currentSubscription(db, accountId);
  const inherited = await db.prepare(`
    SELECT subscription.id, subscription.account_id, subscription.plan_id,
           subscription.stripe_customer_id, subscription.stripe_subscription_id,
           subscription.stripe_checkout_session_id, subscription.status,
           subscription.seat_limit, subscription.current_period_start,
           subscription.current_period_end, subscription.cancel_at_period_end,
           subscription.grace_expires_at
    FROM lms_organisation_members member
    JOIN lms_organisations organisation
      ON organisation.id = member.organisation_id
    JOIN lms_subscriptions subscription
      ON subscription.id = organisation.subscription_id
    WHERE member.account_id = ?
      AND member.status = 'active'
      AND subscription.seat_limit > 1
      AND (
        subscription.status IN ('active', 'trialing')
        OR (
          subscription.status = 'past_due'
          AND subscription.grace_expires_at IS NOT NULL
          AND datetime(subscription.grace_expires_at) > CURRENT_TIMESTAMP
        )
      )
    ORDER BY member.updated_at DESC, subscription.updated_at DESC
    LIMIT 1
  `).bind(accountId).first<SubscriptionRow>();

  if (entitlementRank(inherited) > entitlementRank(direct)) return inherited;
  if (subscriptionHasAccess(direct)) return direct;
  return subscriptionHasAccess(inherited) ? inherited : null;
}
