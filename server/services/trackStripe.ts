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

  // Create the product
  const product = await stripe.products.create({
    name: title,
    description: `Digital download by ${artistName}`,
    metadata: {
      trackId,
      artistName,
      type: 'music_track',
    },
    images: coverArtUrl ? [coverArtUrl] : undefined,
  });

  // Create the price (one-time payment)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: priceInCents,
    currency,
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

  // Create new price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: newPriceInCents,
    currency,
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
  priceId: string;
  trackTitle: string;
  artistName: string;
  buyerEmail?: string;
  landingPageSlug: string;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
}

/**
 * Create a Stripe Checkout session for purchasing a track
 * If connectedAccountId is provided, payment goes to the artist's connected account
 */
export async function createTrackCheckoutSession(
  params: TrackCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const {
    trackId,
    priceId,
    trackTitle,
    artistName,
    buyerEmail,
    landingPageSlug,
    connectedAccountId,
    applicationFeeAmount = 0,
  } = params;

  console.log(`[TRACK-STRIPE] Creating checkout for track ${trackId}, price ${priceId}`);
  if (connectedAccountId) {
    console.log(`[TRACK-STRIPE] Using connected account: ${connectedAccountId}, fee: ${applicationFeeAmount}`);
  }

  const successUrl = `${APP_URL}/artist/${landingPageSlug}?purchase=success&track=${trackId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${APP_URL}/artist/${landingPageSlug}?purchase=cancelled`;

  // Build session options
  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: buyerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      trackId,
      trackTitle,
      artistName,
      type: 'track_purchase',
    },
    billing_address_collection: 'auto',
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
