import { stripe } from './stripe';
import type Stripe from 'stripe';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const PLATFORM_FEE_PERCENT = parseInt(process.env.PLATFORM_FEE_PERCENT || '0', 10);

/**
 * Create a Stripe Connect Express account for an artist
 */
export async function createConnectAccount(
  userId: string,
  email: string,
  country: string = 'GB'
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      userId,
    },
  });

  return account;
}

/**
 * Create an account link for onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

/**
 * Get the status of a Connect account
 */
export async function getAccountStatus(accountId: string): Promise<{
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: Stripe.Account.Requirements | null;
}> {
  const account = await stripe.accounts.retrieve(accountId);

  return {
    detailsSubmitted: account.details_submitted || false,
    chargesEnabled: account.charges_enabled || false,
    payoutsEnabled: account.payouts_enabled || false,
    requirements: account.requirements || null,
  };
}

/**
 * Create a login link for the Connect dashboard
 */
export async function createLoginLink(accountId: string): Promise<Stripe.LoginLink> {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink;
}

/**
 * Calculate platform fee for a transaction
 * Returns fee in cents
 */
export function calculatePlatformFee(amountCents: number): number {
  if (PLATFORM_FEE_PERCENT <= 0) return 0;
  return Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
}

/**
 * Check if an account is fully onboarded and can receive payments
 */
export async function isAccountReady(accountId: string): Promise<boolean> {
  const status = await getAccountStatus(accountId);
  return status.chargesEnabled && status.payoutsEnabled;
}

export const connectConfig = {
  appUrl: APP_URL,
  platformFeePercent: PLATFORM_FEE_PERCENT,
};
