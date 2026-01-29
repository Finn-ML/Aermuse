import Stripe from 'stripe';
import { stripe, stripeConfig } from './stripe';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// ============================================
// TRACK PRODUCT/PRICE MANAGEMENT
// ============================================

export interface CreateTrackProductParams {
  trackId: string;
  title: string;
  artistName: string;
  priceInCents: number;
  currency?: string;
  coverArtUrl?: string;
}

/**
 * Create a Stripe Product and Price for a music track
 */
export async function createTrackProduct(
  params: CreateTrackProductParams
): Promise<{ productId: string; priceId: string }> {
  const { trackId, title, artistName, priceInCents, currency = 'gbp', coverArtUrl } = params;

  console.log(`[TRACK-STRIPE] Creating product for track ${trackId}: "${title}" by ${artistName}`);

  // Create the product with tax code for digital goods (music downloads)
  // Tax code txcd_10201000 = Digital goods - Audio/visual media - Downloadable audio
  const product = await stripe.products.create({
    name: title,
    description: `Digital download by ${artistName}`,
    metadata: {
      trackId,
      artistName,
      type: 'music_track',
    },
    images: coverArtUrl ? [coverArtUrl] : undefined,
    tax_code: 'txcd_10201000', // Digital audio downloads
  });

  // Create the price (one-time payment) with tax behavior
  // 'exclusive' means tax is added on top of the price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: priceInCents,
    currency,
    tax_behavior: 'exclusive', // VAT added on top
  });

  console.log(`[TRACK-STRIPE] Product created: ${product.id} with price ${price.id} (${priceInCents} ${currency})`);

  return {
    productId: product.id,
    priceId: price.id,
  };
}

/**
 * Update a track's Stripe price (creates new price, archives old one)
 * Stripe prices are immutable, so we create a new one
 */
export async function updateTrackPrice(
  productId: string,
  newPriceInCents: number,
  oldPriceId?: string,
  currency: string = 'gbp'
): Promise<string> {
  console.log(`[TRACK-STRIPE] Updating price for product ${productId} to ${newPriceInCents} ${currency}`);

  // Archive the old price if provided
  if (oldPriceId) {
    try {
      await stripe.prices.update(oldPriceId, { active: false });
      console.log(`[TRACK-STRIPE] Archived old price ${oldPriceId}`);
    } catch (err) {
      console.warn(`[TRACK-STRIPE] Failed to archive old price ${oldPriceId}:`, err);
    }
  }

  // Create new price with tax behavior
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: newPriceInCents,
    currency,
    tax_behavior: 'exclusive', // VAT added on top
  });

  console.log(`[TRACK-STRIPE] New price created: ${price.id}`);
  return price.id;
}

/**
 * Archive a track's Stripe product (when track is deleted)
 */
export async function archiveTrackProduct(productId: string): Promise<void> {
  console.log(`[TRACK-STRIPE] Archiving product ${productId}`);

  try {
    await stripe.products.update(productId, { active: false });
    console.log(`[TRACK-STRIPE] Product archived successfully`);
  } catch (err) {
    console.error(`[TRACK-STRIPE] Failed to archive product:`, err);
    throw err;
  }
}

// ============================================
// CHECKOUT SESSION
// ============================================

export interface TrackCheckoutParams {
  trackId: string;
  priceId?: string; // Optional for PWYW
  customAmountCents?: number; // For PWYW custom pricing
  productId?: string; // Stripe product ID for PWYW
  trackTitle: string;
  artistName: string;
  buyerEmail?: string;
  landingPageSlug: string;
  baseUrl?: string; // Base URL derived from request for redirect URLs
  currency?: string;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
}

/**
 * Create a Stripe Checkout session for purchasing a track
 * Supports both fixed pricing (with priceId) and PWYW (with customAmountCents)
 * If connectedAccountId is provided, payment goes to the artist's connected account
 */
export async function createTrackCheckoutSession(
  params: TrackCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const {
    trackId,
    priceId,
    customAmountCents,
    productId,
    trackTitle,
    artistName,
    buyerEmail,
    landingPageSlug,
    baseUrl,
    currency = 'gbp',
    connectedAccountId,
    applicationFeeAmount = 0,
  } = params;

  const isPWYW = !priceId && customAmountCents !== undefined;
  const appUrl = baseUrl || APP_URL;

  console.log(`[TRACK-STRIPE] Creating checkout for track ${trackId}${isPWYW ? ` (PWYW: ${customAmountCents} ${currency})` : `, price ${priceId}`}`);
  if (connectedAccountId) {
    console.log(`[TRACK-STRIPE] Using connected account: ${connectedAccountId}, fee: ${applicationFeeAmount}`);
  }

  const successUrl = `${appUrl}/artist/${landingPageSlug}?purchase=success&track=${trackId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/artist/${landingPageSlug}?purchase=cancelled`;

  // Build line items - different for PWYW vs fixed price
  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

  if (isPWYW) {
    // For PWYW, create line item with custom price data
    lineItems = [
      {
        price_data: {
          currency,
          unit_amount: customAmountCents,
          product_data: {
            name: trackTitle,
            description: `Digital download by ${artistName} (Pay What You Want)`,
            metadata: {
              trackId,
              artistName,
              type: 'music_track_pwyw',
            },
          },
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      },
    ];
  } else {
    // Fixed price - use existing Stripe price ID
    if (!priceId) {
      throw new Error('Price ID required for fixed pricing');
    }
    lineItems = [
      {
        price: priceId,
        quantity: 1,
      },
    ];
  }

  // Build session options
  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: buyerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      trackId,
      trackTitle,
      artistName,
      type: 'track_purchase',
      pricingType: isPWYW ? 'pwyw' : 'fixed',
    },
    billing_address_collection: 'required', // Required for VAT calculation

    // UK VAT compliance - automatic tax calculation
    // Requires origin address configured in Stripe Dashboard: https://dashboard.stripe.com/settings/tax
    // Set STRIPE_TAX_ENABLED=true in env once configured
    ...(process.env.STRIPE_TAX_ENABLED === 'true' && {
      automatic_tax: {
        enabled: true,
      },
    }),

    // UK Consumer Rights compliance for digital downloads
    // Customer must acknowledge they're waiving their 14-day cancellation right
    // for immediate access to digital content
    consent_collection: {
      terms_of_service: 'required',
    },

    // Custom text for the checkout page
    custom_text: {
      terms_of_service_acceptance: {
        message: 'I agree that by completing this purchase, I will have immediate access to download the digital content. I understand that I am waiving my 14-day cancellation right under the Consumer Contracts Regulations 2013.',
      },
    },
  };

  // Add transfer destination if artist has connected account
  if (connectedAccountId) {
    sessionOptions.payment_intent_data = {
      transfer_data: {
        destination: connectedAccountId,
      },
      ...(applicationFeeAmount > 0 && { application_fee_amount: applicationFeeAmount }),
    };
  }

  const session = await stripe.checkout.sessions.create(sessionOptions);

  console.log(`[TRACK-STRIPE] Checkout session created: ${session.id}`);
  return session;
}

/**
 * Retrieve a checkout session to verify purchase
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Verify a payment intent is successful
 */
export async function verifyPaymentIntent(
  paymentIntentId: string
): Promise<boolean> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status === 'succeeded';
  } catch (err) {
    console.error('[TRACK-STRIPE] Failed to verify payment intent:', err);
    return false;
  }
}

// ============================================
// COLLABORATOR SPLIT TRANSFERS
// ============================================

export interface SplitTransferParams {
  paymentIntentId: string;
  splits: Array<{
    collaboratorName: string;
    collaboratorEmail: string;
    stripeConnectAccountId: string;
    amountCents: number;
  }>;
  trackId: string;
  trackTitle: string;
  currency?: string;
}

/**
 * Create Stripe transfers to collaborators after a successful payment
 * This is used when a track has verified collaborators with connected accounts
 */
export async function createSplitTransfers(
  params: SplitTransferParams
): Promise<Stripe.Transfer[]> {
  const { paymentIntentId, splits, trackId, trackTitle, currency = 'gbp' } = params;

  console.log(`[TRACK-STRIPE] Creating ${splits.length} split transfers for track ${trackId}`);

  const transfers: Stripe.Transfer[] = [];

  for (const split of splits) {
    try {
      console.log(`[TRACK-STRIPE] Transferring ${split.amountCents} ${currency} to ${split.collaboratorName} (${split.stripeConnectAccountId})`);

      const transfer = await stripe.transfers.create({
        amount: split.amountCents,
        currency,
        destination: split.stripeConnectAccountId,
        source_transaction: paymentIntentId, // Links transfer to the original charge
        description: `Split payout for "${trackTitle}"`,
        metadata: {
          trackId,
          trackTitle,
          collaboratorName: split.collaboratorName,
          collaboratorEmail: split.collaboratorEmail,
          type: 'track_split_payout',
        },
      });

      transfers.push(transfer);
      console.log(`[TRACK-STRIPE] Transfer created: ${transfer.id}`);
    } catch (err) {
      console.error(`[TRACK-STRIPE] Failed to create transfer for ${split.collaboratorName}:`, err);
      // Continue with other transfers even if one fails
    }
  }

  console.log(`[TRACK-STRIPE] Successfully created ${transfers.length}/${splits.length} transfers`);
  return transfers;
}

// ============================================
// WEBHOOK EVENT HANDLING
// ============================================

/**
 * Construct event from webhook payload
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    stripeConfig.webhookSecret
  );
}

/**
 * Check if a checkout session is for a track purchase
 */
export function isTrackPurchase(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.type === 'track_purchase';
}

/**
 * Extract track purchase details from checkout session
 */
export function extractTrackPurchaseDetails(session: Stripe.Checkout.Session) {
  return {
    trackId: session.metadata?.trackId,
    trackTitle: session.metadata?.trackTitle,
    artistName: session.metadata?.artistName,
    buyerEmail: session.customer_email || session.customer_details?.email || '',
    buyerName: session.customer_details?.name || '',
    paymentIntentId: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id,
    amountPaid: session.amount_total || 0,
    currency: session.currency || 'gbp',
  };
}

// ============================================
// VIDEO CHECKOUT (Same pattern as tracks)
// ============================================

export interface VideoCheckoutParams {
  videoId: string;
  videoTitle: string;
  artistName: string;
  priceInCents: number;
  pricingType: 'fixed' | 'pwyw';
  customAmountCents?: number;
  buyerEmail?: string;
  landingPageSlug: string;
  baseUrl?: string; // Base URL derived from request for redirect URLs
  currency?: string;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
}

/**
 * Create a Stripe Checkout session for purchasing a video
 */
export async function createVideoCheckoutSession(
  params: VideoCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const {
    videoId,
    videoTitle,
    artistName,
    priceInCents,
    pricingType,
    customAmountCents,
    buyerEmail,
    landingPageSlug,
    baseUrl,
    currency = 'gbp',
    connectedAccountId,
    applicationFeeAmount = 0,
  } = params;

  const isPWYW = pricingType === 'pwyw';
  const amount = isPWYW && customAmountCents !== undefined ? customAmountCents : priceInCents;
  const appUrl = baseUrl || APP_URL;

  console.log(`[VIDEO-STRIPE] Creating checkout for video ${videoId}: ${amount} ${currency}`);
  if (connectedAccountId) {
    console.log(`[VIDEO-STRIPE] Using connected account: ${connectedAccountId}, fee: ${applicationFeeAmount}`);
  }

  const successUrl = `${appUrl}/artist/${landingPageSlug}?video_purchase=success&video=${videoId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/artist/${landingPageSlug}?video_purchase=cancelled`;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency,
        unit_amount: amount,
        product_data: {
          name: videoTitle,
          description: `Video content by ${artistName}${isPWYW ? ' (Pay What You Want)' : ''}`,
          metadata: {
            videoId,
            artistName,
            type: isPWYW ? 'video_pwyw' : 'video_fixed',
          },
        },
        tax_behavior: 'exclusive',
      },
      quantity: 1,
    },
  ];

  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: buyerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      videoId,
      videoTitle,
      artistName,
      type: 'video_purchase',
      pricingType: isPWYW ? 'pwyw' : 'fixed',
    },
    billing_address_collection: 'required',

    ...(process.env.STRIPE_TAX_ENABLED === 'true' && {
      automatic_tax: {
        enabled: true,
      },
    }),

    consent_collection: {
      terms_of_service: 'required',
    },

    custom_text: {
      terms_of_service_acceptance: {
        message: 'I agree that by completing this purchase, I will have immediate access to the video content. I understand that I am waiving my 14-day cancellation right under the Consumer Contracts Regulations 2013.',
      },
    },
  };

  if (connectedAccountId) {
    sessionOptions.payment_intent_data = {
      transfer_data: {
        destination: connectedAccountId,
      },
      ...(applicationFeeAmount > 0 && { application_fee_amount: applicationFeeAmount }),
    };
  }

  const session = await stripe.checkout.sessions.create(sessionOptions);

  console.log(`[VIDEO-STRIPE] Checkout session created: ${session.id}`);
  return session;
}

/**
 * Check if a checkout session is for a video purchase
 */
export function isVideoPurchase(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.type === 'video_purchase';
}

/**
 * Extract video purchase details from checkout session
 */
export function extractVideoPurchaseDetails(session: Stripe.Checkout.Session) {
  return {
    videoId: session.metadata?.videoId,
    videoTitle: session.metadata?.videoTitle,
    artistName: session.metadata?.artistName,
    buyerEmail: session.customer_email || session.customer_details?.email || '',
    buyerName: session.customer_details?.name || '',
    paymentIntentId: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id,
    amountPaid: session.amount_total || 0,
    currency: session.currency || 'gbp',
  };
}
