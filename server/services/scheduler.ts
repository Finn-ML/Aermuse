import { storage } from "../storage";
import { sendBroadcastBatch } from "./postmark";

/**
 * Start the mailing list campaign scheduler
 * Checks every 60 seconds for scheduled campaigns that are due to send
 */
export function startMailingListScheduler() {
  const INTERVAL = 60 * 1000; // 60 seconds

  const processScheduledCampaigns = async () => {
    try {
      const dueCampaigns = await storage.getScheduledCampaignsDue();

      for (const campaign of dueCampaigns) {
        try {
          console.log(`[SCHEDULER] Processing scheduled campaign ${campaign.id}: "${campaign.subject}"`);

          // Mark as sending
          await storage.updateCampaign(campaign.id, { status: 'sending' });

          // Get the user's landing page to find subscribers
          const landingPage = await storage.getLandingPageByUser(campaign.userId);
          if (!landingPage) {
            console.error(`[SCHEDULER] No landing page found for user ${campaign.userId}`);
            await storage.updateCampaign(campaign.id, { status: 'failed' });
            continue;
          }

          // Get user info for sender details
          const user = await storage.getUser(campaign.userId);
          if (!user) {
            await storage.updateCampaign(campaign.id, { status: 'failed' });
            continue;
          }

          // Get active subscribers
          const subscribers = await storage.getActiveSubscribersByLandingPage(landingPage.id);
          if (subscribers.length === 0) {
            console.log(`[SCHEDULER] No active subscribers for campaign ${campaign.id}`);
            await storage.updateCampaign(campaign.id, {
              status: 'sent',
              sentAt: new Date(),
              recipientCount: 0,
            });
            continue;
          }

          // Create email send records
          const sends = await storage.createEmailSendsBatch(
            subscribers.map((sub) => ({
              campaignId: campaign.id,
              subscriberId: sub.id,
            }))
          );

          // Build emails
          const emails = subscribers.map((sub, i) => ({
            to: sub.email,
            subject: campaign.subject,
            htmlBody: campaign.body,
            textBody: campaign.body.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
            artistName: user.artistName || user.name,
            artistSlug: landingPage.slug,
            replyTo: user.email,
            unsubscribeUrl: `${process.env.APP_URL || 'https://aermuse.com'}/api/mailing-list/unsubscribe/${sub.id}`,
          }));

          // Send via Postmark
          const batchResult = await sendBroadcastBatch(emails);

          // Update send records with Postmark message IDs
          for (let i = 0; i < sends.length; i++) {
            const result = batchResult.results[i];
            if (result?.success && result.messageId) {
              await storage.updateEmailSend(sends[i].id, {
                postmarkMessageId: result.messageId,
                status: 'sent',
                sentAt: new Date(),
              });
            } else {
              await storage.updateEmailSend(sends[i].id, {
                status: 'failed',
              });
            }
          }

          // Mark campaign as sent
          await storage.updateCampaign(campaign.id, {
            status: 'sent',
            sentAt: new Date(),
            recipientCount: subscribers.length,
          });

          console.log(`[SCHEDULER] Campaign ${campaign.id} sent to ${batchResult.sent} subscribers`);
        } catch (error) {
          console.error(`[SCHEDULER] Failed to process campaign ${campaign.id}:`, error);
          await storage.updateCampaign(campaign.id, { status: 'failed' });
        }
      }
    } catch (error) {
      console.error('[SCHEDULER] Error checking scheduled campaigns:', error);
    }
  };

  // Run after a short delay on startup, then every 60 seconds
  setTimeout(processScheduledCampaigns, 15000);
  setInterval(processScheduledCampaigns, INTERVAL);

  console.log('[SCHEDULER] Mailing list campaign scheduler started');
}
