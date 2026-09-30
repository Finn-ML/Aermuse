import {
  type User, type InsertUser,
  type Contract, type InsertContract,
  type ContractFolder, type InsertContractFolder,
  type ContractVersion, type InsertContractVersion,
  type LandingPage, type InsertLandingPage,
  type LandingPageLink, type InsertLandingPageLink,
  type ContractTemplate,
  type Track, type InsertTrack,
  type TrackPurchase, type InsertTrackPurchase,
  type TrackSplit, type InsertTrackSplit, type TrackSplitStatus,
  type ArtistVideo, type InsertArtistVideo,
  type VideoPurchase, type InsertVideoPurchase,
  type MerchProduct, type InsertMerchProduct,
  type MerchVariant, type InsertMerchVariant,
  type MerchOrder, type InsertMerchOrder,
  type MerchOrderItem, type InsertMerchOrderItem,
  type MailingListSubscriber, type InsertMailingListSubscriber,
  type EmailCampaign, type InsertEmailCampaign,
  type EmailSend, type InsertEmailSend,
  type EmailLinkClick, type InsertEmailLinkClick,
  type DistributionTrack, type InsertDistributionTrack,
  users, contracts, contractFolders, contractVersions, landingPages, landingPageLinks, contractTemplates, tracks, trackPurchases, trackSplits, proposals, artistVideos, videoPurchases,
  merchProducts, merchVariants, merchOrders, merchOrderItems,
  mailingListSubscribers, emailCampaigns, emailSends, emailLinkClicks,
  isrcSequences, distributionTracks
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, gte, lte, asc, isNull, count, max, sql, type SQL } from "drizzle-orm";

export type SortField = 'name' | 'createdAt' | 'updatedAt' | 'status' | 'type' | 'expiryDate';
export type SortOrder = 'asc' | 'desc';

export interface ContractFilters {
  search?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string; // 'null' for unfiled, uuid for specific folder
  sortField?: SortField;
  sortOrder?: SortOrder;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  
  // Contracts
  getContract(id: string): Promise<Contract | undefined>;
  getContractsByUser(userId: string): Promise<Contract[]>;
  getAllContracts(): Promise<Contract[]>; // Admin: all contracts
  searchContracts(userId: string, searchQuery: string): Promise<Contract[]>;
  filterContracts(userId: string, filters: ContractFilters): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, data: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;
  moveContractToFolder(contractId: string, folderId: string | null): Promise<boolean>;

  // Contract Folders (Story 8.3)
  getFoldersByUser(userId: string): Promise<ContractFolder[]>;
  getFolderWithCounts(userId: string): Promise<{ folders: (ContractFolder & { contractCount: number })[]; unfiledCount: number }>;
  getFolder(id: string): Promise<ContractFolder | undefined>;
  createFolder(folder: InsertContractFolder): Promise<ContractFolder>;
  updateFolder(id: string, data: Partial<InsertContractFolder>): Promise<ContractFolder | undefined>;
  deleteFolder(id: string): Promise<boolean>;
  getFolderContractCount(folderId: string): Promise<number>;

  // Contract Versions
  getContractVersions(contractId: string): Promise<ContractVersion[]>;
  getContractVersion(id: string): Promise<ContractVersion | undefined>;
  createContractVersion(version: InsertContractVersion): Promise<ContractVersion>;
  getLatestVersionNumber(contractId: string): Promise<number>;
  
  // Landing Pages
  getLandingPage(id: string): Promise<LandingPage | undefined>;
  getLandingPageBySlug(slug: string): Promise<LandingPage | undefined>;
  getLandingPageByUser(userId: string): Promise<LandingPage | undefined>;
  getAllPublishedLandingPages(): Promise<LandingPage[]>;
  createLandingPage(page: InsertLandingPage): Promise<LandingPage>;
  updateLandingPage(id: string, data: Partial<InsertLandingPage>): Promise<LandingPage | undefined>;
  
  // Landing Page Links
  getLandingPageLink(id: string): Promise<LandingPageLink | undefined>;
  getLandingPageLinks(landingPageId: string): Promise<LandingPageLink[]>;
  createLandingPageLink(link: InsertLandingPageLink): Promise<LandingPageLink>;
  updateLandingPageLink(id: string, data: Partial<InsertLandingPageLink>): Promise<LandingPageLink | undefined>;
  deleteLandingPageLink(id: string): Promise<boolean>;

  // Contract Templates
  getActiveTemplates(category?: string): Promise<ContractTemplate[]>;
  getTemplate(id: string): Promise<ContractTemplate | undefined>;

  // Admin Template Management
  getAllTemplates(): Promise<ContractTemplate[]>;
  createTemplate(data: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractTemplate>;
  updateTemplate(id: string, data: Partial<ContractTemplate>): Promise<ContractTemplate | undefined>;
  deactivateTemplate(id: string): Promise<boolean>;
  activateTemplate(id: string): Promise<ContractTemplate | undefined>;

  // User Templates (Alpha feature)
  getUserTemplates(userId: string): Promise<ContractTemplate[]>;
  createUserTemplate(userId: string, data: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<ContractTemplate>;
  updateUserTemplate(userId: string, templateId: string, data: {
    name?: string;
    description?: string;
    content?: ContractTemplate['content'];
    fields?: ContractTemplate['fields'];
    optionalClauses?: ContractTemplate['optionalClauses'];
  }): Promise<ContractTemplate | undefined>;
  deleteUserTemplate(userId: string, templateId: string): Promise<boolean>;

  // Music Tracks
  getTrack(id: string): Promise<Track | undefined>;
  getTracksByUser(userId: string): Promise<Track[]>;
  getTracksByLandingPage(landingPageId: string): Promise<Track[]>;
  getPublishedTracksByLandingPage(landingPageId: string): Promise<Track[]>;
  createTrack(track: InsertTrack & { id: string }): Promise<Track>;
  updateTrack(id: string, data: Partial<InsertTrack>): Promise<Track | undefined>;
  deleteTrack(id: string): Promise<boolean>;
  incrementTrackPlayCount(id: string): Promise<void>;
  incrementTrackPurchaseCount(id: string): Promise<void>;

  // Track Purchases
  getTrackPurchase(id: string): Promise<TrackPurchase | undefined>;
  getTrackPurchaseByToken(token: string): Promise<TrackPurchase | undefined>;
  getTrackPurchaseBySession(sessionId: string): Promise<TrackPurchase | undefined>;
  getTrackPurchasesByEmail(email: string): Promise<TrackPurchase[]>;
  createTrackPurchase(purchase: InsertTrackPurchase): Promise<TrackPurchase>;
  incrementDownloadCount(purchaseId: string): Promise<void>;

  // Track Splits (Collaboration Verification)
  getTrackSplit(id: string): Promise<TrackSplit | undefined>;
  getTrackSplitByToken(token: string): Promise<TrackSplit | undefined>;
  getTrackSplitsByTrack(trackId: string): Promise<TrackSplit[]>;
  getTrackSplitsByCollaboratorEmail(email: string): Promise<TrackSplit[]>;
  getPendingSplitsByDeadline(deadline: Date): Promise<TrackSplit[]>;
  getPendingSplitsNeedingReminder(daysRemaining: number): Promise<TrackSplit[]>;
  createTrackSplit(split: InsertTrackSplit): Promise<TrackSplit>;
  updateTrackSplit(id: string, data: Partial<InsertTrackSplit>): Promise<TrackSplit | undefined>;
  deleteTrackSplit(id: string): Promise<boolean>;
  deleteTrackSplitsByTrack(trackId: string): Promise<boolean>;
  checkAllSplitsVerifiedOrExpired(trackId: string): Promise<boolean>;

  // Artist Videos (Video Store Feature)
  getArtistVideo(id: string): Promise<ArtistVideo | undefined>;
  getArtistVideosByLandingPage(landingPageId: string): Promise<ArtistVideo[]>;
  getPublishedArtistVideosByLandingPage(landingPageId: string): Promise<ArtistVideo[]>;
  createArtistVideo(video: InsertArtistVideo & { id: string }): Promise<ArtistVideo>;
  updateArtistVideo(id: string, data: Partial<InsertArtistVideo>): Promise<ArtistVideo | undefined>;
  deleteArtistVideo(id: string): Promise<boolean>;
  incrementVideoViewCount(id: string): Promise<void>;
  incrementVideoPurchaseCount(id: string): Promise<void>;

  // Video Purchases
  getVideoPurchase(id: string): Promise<VideoPurchase | undefined>;
  getVideoPurchaseByToken(token: string): Promise<VideoPurchase | undefined>;
  getVideoPurchaseBySession(sessionId: string): Promise<VideoPurchase | undefined>;
  getVideoPurchasesByEmail(email: string): Promise<VideoPurchase[]>;
  createVideoPurchase(purchase: InsertVideoPurchase): Promise<VideoPurchase>;

  // Merch Products
  getProduct(id: string): Promise<MerchProduct | undefined>;
  getProductsByUser(userId: string): Promise<MerchProduct[]>;
  getActiveProductsForLandingPage(landingPageId: string): Promise<(MerchProduct & { variants: MerchVariant[] })[]>;
  createProduct(product: InsertMerchProduct): Promise<MerchProduct>;
  updateProduct(id: string, data: Partial<InsertMerchProduct>): Promise<MerchProduct | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Merch Variants
  getProductVariant(id: string): Promise<MerchVariant | undefined>;
  getProductVariants(productId: string): Promise<MerchVariant[]>;
  createProductVariant(variant: InsertMerchVariant): Promise<MerchVariant>;
  updateProductVariant(id: string, data: Partial<InsertMerchVariant>): Promise<MerchVariant | undefined>;
  deleteProductVariant(id: string): Promise<boolean>;
  decrementVariantInventory(id: string, quantity: number): Promise<boolean>;

  // Merch Orders
  getOrder(id: string): Promise<MerchOrder | undefined>;
  getOrdersByArtist(artistId: string): Promise<MerchOrder[]>;
  getOrderByCheckoutSession(sessionId: string): Promise<MerchOrder | undefined>;
  createOrder(order: InsertMerchOrder): Promise<MerchOrder>;
  updateOrder(id: string, data: Partial<InsertMerchOrder>): Promise<MerchOrder | undefined>;

  // Merch Order Items
  getOrderItems(orderId: string): Promise<MerchOrderItem[]>;
  createOrderItem(item: InsertMerchOrderItem): Promise<MerchOrderItem>;

  // Mailing List Subscribers
  getSubscriber(id: string): Promise<MailingListSubscriber | undefined>;
  getSubscriberByToken(token: string): Promise<MailingListSubscriber | undefined>;
  getSubscriberByEmail(landingPageId: string, email: string): Promise<MailingListSubscriber | undefined>;
  getActiveSubscribersByLandingPage(landingPageId: string): Promise<MailingListSubscriber[]>;
  getSubscribersByLandingPage(landingPageId: string): Promise<MailingListSubscriber[]>;
  getSubscriberCountsByLandingPage(landingPageId: string): Promise<{ total: number; active: number; unsubscribed: number }>;
  createSubscriber(subscriber: InsertMailingListSubscriber): Promise<MailingListSubscriber>;
  updateSubscriber(id: string, data: Partial<InsertMailingListSubscriber>): Promise<MailingListSubscriber | undefined>;
  deleteSubscriber(id: string): Promise<boolean>;

  // Email Campaigns
  getCampaign(id: string): Promise<EmailCampaign | undefined>;
  getCampaignsByUser(userId: string): Promise<EmailCampaign[]>;
  getScheduledCampaignsDue(): Promise<EmailCampaign[]>;
  createCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateCampaign(id: string, data: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  // Email Sends
  createEmailSend(send: InsertEmailSend): Promise<EmailSend>;
  createEmailSendsBatch(sends: InsertEmailSend[]): Promise<EmailSend[]>;
  getEmailSendByPostmarkId(postmarkMessageId: string): Promise<EmailSend | undefined>;
  updateEmailSend(id: string, data: Partial<InsertEmailSend>): Promise<EmailSend | undefined>;
  getCampaignAnalytics(campaignId: string): Promise<{
    recipientCount: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  }>;

  // Email Link Clicks
  createLinkClick(click: InsertEmailLinkClick): Promise<EmailLinkClick>;
  getLinkClicksByCampaign(campaignId: string): Promise<{ url: string; clicks: number }[]>;

  // ISRC Sequences (Distribution)
  getNextIsrcDesignation(year: number): Promise<number>;

  // Distribution Tracks (Independent Entity)
  getDistributionTrack(id: string): Promise<DistributionTrack | undefined>;
  getDistributionTracksByUser(userId: string): Promise<DistributionTrack[]>;
  createDistributionTrack(track: InsertDistributionTrack & { id: string }): Promise<DistributionTrack>;
  updateDistributionTrack(id: string, data: Partial<InsertDistributionTrack>): Promise<DistributionTrack | undefined>;
  deleteDistributionTrack(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  // Contracts
  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async getContractsByUser(userId: string): Promise<Contract[]> {
    return db.select().from(contracts).where(eq(contracts.userId, userId)).orderBy(desc(contracts.updatedAt));
  }

  async getAllContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.updatedAt));
  }

  async searchContracts(userId: string, searchQuery: string): Promise<Contract[]> {
    const searchTerm = `%${searchQuery}%`;
    return db.select()
      .from(contracts)
      .where(
        and(
          eq(contracts.userId, userId),
          or(
            ilike(contracts.name, searchTerm),
            ilike(contracts.partnerName, searchTerm),
            ilike(contracts.type, searchTerm)
          )
        )
      )
      .orderBy(desc(contracts.updatedAt));
  }

  async filterContracts(userId: string, filters: ContractFilters): Promise<Contract[]> {
    const conditions: SQL[] = [eq(contracts.userId, userId)];

    // Search filter
    if (filters.search?.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(contracts.name, searchTerm),
          ilike(contracts.partnerName, searchTerm),
          ilike(contracts.type, searchTerm)
        )!
      );
    }

    // Status filter
    if (filters.status) {
      conditions.push(eq(contracts.status, filters.status));
    }

    // Type filter
    if (filters.type) {
      conditions.push(eq(contracts.type, filters.type));
    }

    // Date range filters
    if (filters.dateFrom) {
      conditions.push(gte(contracts.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(contracts.createdAt, endDate));
    }

    // Folder filter
    if (filters.folderId === 'null') {
      conditions.push(isNull(contracts.folderId));
    } else if (filters.folderId) {
      conditions.push(eq(contracts.folderId, filters.folderId));
    }

    // Determine sort column and order (Story 8.6)
    const sortField = filters.sortField || 'updatedAt';
    const sortOrder = filters.sortOrder || 'desc';
    const sortColumn = this.getSortColumn(sortField);
    const orderFn = sortOrder === 'asc' ? asc : desc;

    return db.select()
      .from(contracts)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn));
  }

  private getSortColumn(field: SortField) {
    switch (field) {
      case 'name':
        return contracts.name;
      case 'createdAt':
        return contracts.createdAt;
      case 'status':
        return contracts.status;
      case 'type':
        return contracts.type;
      case 'expiryDate':
        return contracts.expiryDate;
      case 'updatedAt':
      default:
        return contracts.updatedAt;
    }
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async updateContract(id: string, data: Partial<InsertContract>): Promise<Contract | undefined> {
    const [contract] = await db.update(contracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return contract;
  }

  async deleteContract(id: string): Promise<boolean> {
    // First, clear the contractId reference in any proposals that reference this contract
    await db.update(proposals)
      .set({ contractId: null })
      .where(eq(proposals.contractId, id));

    // Now delete the contract
    const result = await db.delete(contracts).where(eq(contracts.id, id)).returning();
    return result.length > 0;
  }

  async moveContractToFolder(contractId: string, folderId: string | null): Promise<boolean> {
    const result = await db.update(contracts)
      .set({ folderId, updatedAt: new Date() })
      .where(eq(contracts.id, contractId))
      .returning();
    return result.length > 0;
  }

  // Contract Folders (Story 8.3)
  async getFoldersByUser(userId: string): Promise<ContractFolder[]> {
    return db.select()
      .from(contractFolders)
      .where(eq(contractFolders.userId, userId))
      .orderBy(asc(contractFolders.sortOrder));
  }

  async getFolderWithCounts(userId: string): Promise<{ folders: (ContractFolder & { contractCount: number })[]; unfiledCount: number }> {
    // Get all folders
    const folders = await db.select()
      .from(contractFolders)
      .where(eq(contractFolders.userId, userId))
      .orderBy(asc(contractFolders.sortOrder));

    // Get contract counts per folder
    const folderCounts = await db
      .select({ folderId: contracts.folderId, count: count() })
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .groupBy(contracts.folderId);

    const countMap = new Map(folderCounts.map(fc => [fc.folderId, Number(fc.count)]));

    // Get unfiled count
    const [unfiledResult] = await db
      .select({ count: count() })
      .from(contracts)
      .where(and(eq(contracts.userId, userId), isNull(contracts.folderId)));

    const foldersWithCounts = folders.map(folder => ({
      ...folder,
      contractCount: countMap.get(folder.id) || 0,
    }));

    return {
      folders: foldersWithCounts,
      unfiledCount: Number(unfiledResult?.count || 0),
    };
  }

  async getFolder(id: string): Promise<ContractFolder | undefined> {
    const [folder] = await db.select().from(contractFolders).where(eq(contractFolders.id, id));
    return folder;
  }

  async createFolder(folder: InsertContractFolder): Promise<ContractFolder> {
    const [newFolder] = await db.insert(contractFolders).values(folder).returning();
    return newFolder;
  }

  async updateFolder(id: string, data: Partial<InsertContractFolder>): Promise<ContractFolder | undefined> {
    const [folder] = await db.update(contractFolders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractFolders.id, id))
      .returning();
    return folder;
  }

  async deleteFolder(id: string): Promise<boolean> {
    const result = await db.delete(contractFolders).where(eq(contractFolders.id, id)).returning();
    return result.length > 0;
  }

  async getFolderContractCount(folderId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(contracts)
      .where(eq(contracts.folderId, folderId));
    return Number(result?.count || 0);
  }

  // Contract Versions
  async createContractVersion(version: InsertContractVersion): Promise<ContractVersion> {
    const [newVersion] = await db.insert(contractVersions).values(version).returning();
    return newVersion;
  }


  async getContractVersions(contractId: string): Promise<ContractVersion[]> {
    return db.select()
      .from(contractVersions)
      .where(eq(contractVersions.contractId, contractId))
      .orderBy(desc(contractVersions.versionNumber));
  }

  async getContractVersion(id: string): Promise<ContractVersion | undefined> {
    const [version] = await db.select().from(contractVersions).where(eq(contractVersions.id, id));
    return version;
  }

  async getLatestVersionNumber(contractId: string): Promise<number> {
    const [latest] = await db.select({ versionNumber: contractVersions.versionNumber })
      .from(contractVersions)
      .where(eq(contractVersions.contractId, contractId))
      .orderBy(desc(contractVersions.versionNumber))
      .limit(1);
    return latest?.versionNumber || 0;
  }

  // Landing Pages
  async getLandingPage(id: string): Promise<LandingPage | undefined> {
    const [page] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    return page;
  }

  async getLandingPageBySlug(slug: string): Promise<LandingPage | undefined> {
    const [page] = await db.select().from(landingPages).where(eq(landingPages.slug, slug));
    return page;
  }

  async getLandingPageByUser(userId: string): Promise<LandingPage | undefined> {
    const [page] = await db.select().from(landingPages).where(eq(landingPages.userId, userId));
    return page;
  }

  async getAllPublishedLandingPages(): Promise<LandingPage[]> {
    return db.select().from(landingPages).where(eq(landingPages.isPublished, true)).orderBy(desc(landingPages.updatedAt));
  }

  async createLandingPage(page: InsertLandingPage): Promise<LandingPage> {
    const [newPage] = await db.insert(landingPages).values(page).returning();
    return newPage;
  }

  async updateLandingPage(id: string, data: Partial<InsertLandingPage>): Promise<LandingPage | undefined> {
    const [page] = await db.update(landingPages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(landingPages.id, id))
      .returning();
    return page;
  }

  // Landing Page Links
  async getLandingPageLink(id: string): Promise<LandingPageLink | undefined> {
    const [link] = await db.select().from(landingPageLinks).where(eq(landingPageLinks.id, id));
    return link;
  }

  async getLandingPageLinks(landingPageId: string): Promise<LandingPageLink[]> {
    return db.select().from(landingPageLinks).where(eq(landingPageLinks.landingPageId, landingPageId));
  }

  async createLandingPageLink(link: InsertLandingPageLink): Promise<LandingPageLink> {
    const [newLink] = await db.insert(landingPageLinks).values(link).returning();
    return newLink;
  }

  async updateLandingPageLink(id: string, data: Partial<InsertLandingPageLink>): Promise<LandingPageLink | undefined> {
    const [link] = await db.update(landingPageLinks)
      .set(data)
      .where(eq(landingPageLinks.id, id))
      .returning();
    return link;
  }

  async deleteLandingPageLink(id: string): Promise<boolean> {
    const result = await db.delete(landingPageLinks).where(eq(landingPageLinks.id, id)).returning();
    return result.length > 0;
  }

  // Contract Templates
  async getActiveTemplates(category?: string): Promise<ContractTemplate[]> {
    if (category && category !== 'all') {
      return db.select()
        .from(contractTemplates)
        .where(and(
          eq(contractTemplates.isActive, true),
          eq(contractTemplates.category, category)
        ))
        .orderBy(asc(contractTemplates.sortOrder));
    }
    return db.select()
      .from(contractTemplates)
      .where(eq(contractTemplates.isActive, true))
      .orderBy(asc(contractTemplates.sortOrder));
  }

  async getTemplate(id: string): Promise<ContractTemplate | undefined> {
    const [template] = await db.select()
      .from(contractTemplates)
      .where(eq(contractTemplates.id, id));
    return template;
  }

  // Admin Template Management
  async getAllTemplates(): Promise<ContractTemplate[]> {
    return db.select()
      .from(contractTemplates)
      .orderBy(asc(contractTemplates.sortOrder));
  }

  async createTemplate(data: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractTemplate> {
    const [template] = await db.insert(contractTemplates)
      .values(data)
      .returning();
    return template;
  }

  async updateTemplate(id: string, data: Partial<ContractTemplate>): Promise<ContractTemplate | undefined> {
    const [template] = await db.update(contractTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractTemplates.id, id))
      .returning();
    return template;
  }

  async deactivateTemplate(id: string): Promise<boolean> {
    const [template] = await db.update(contractTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(contractTemplates.id, id))
      .returning();
    return !!template;
  }

  async activateTemplate(id: string): Promise<ContractTemplate | undefined> {
    const [template] = await db.update(contractTemplates)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(contractTemplates.id, id))
      .returning();
    return template;
  }

  // User Templates (Alpha feature)
  async getUserTemplates(userId: string): Promise<ContractTemplate[]> {
    return db.select()
      .from(contractTemplates)
      .where(and(
        eq(contractTemplates.createdBy, userId),
        eq(contractTemplates.isActive, true)
      ))
      .orderBy(desc(contractTemplates.updatedAt));
  }

  async createUserTemplate(userId: string, data: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<ContractTemplate> {
    const [template] = await db.insert(contractTemplates)
      .values({
        ...data,
        createdBy: userId,
      })
      .returning();
    return template;
  }

  async updateUserTemplate(userId: string, templateId: string, data: {
    name?: string;
    description?: string;
    content?: ContractTemplate['content'];
    fields?: ContractTemplate['fields'];
    optionalClauses?: ContractTemplate['optionalClauses'];
  }): Promise<ContractTemplate | undefined> {
    // Only allow updating templates owned by this user
    // Check if content is being modified to increment version
    const hasContentChanges = data.content !== undefined || data.fields !== undefined || data.optionalClauses !== undefined;

    // If content changes, we need to get the current version first
    if (hasContentChanges) {
      const [existing] = await db.select({ version: contractTemplates.version })
        .from(contractTemplates)
        .where(and(
          eq(contractTemplates.id, templateId),
          eq(contractTemplates.createdBy, userId)
        ));

      if (!existing) {
        return undefined;
      }

      const [template] = await db.update(contractTemplates)
        .set({
          ...data,
          version: (existing.version || 1) + 1,
          updatedAt: new Date()
        })
        .where(and(
          eq(contractTemplates.id, templateId),
          eq(contractTemplates.createdBy, userId)
        ))
        .returning();
      return template;
    }

    // No content changes, just update name/description without version bump
    const [template] = await db.update(contractTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.createdBy, userId)
      ))
      .returning();
    return template;
  }

  async deleteUserTemplate(userId: string, templateId: string): Promise<boolean> {
    // Soft delete - only for templates owned by this user
    const [template] = await db.update(contractTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.createdBy, userId)
      ))
      .returning();
    return !!template;
  }

  // ============================================
  // MUSIC TRACKS (Music Store Feature)
  // ============================================

  async getTrack(id: string): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  async getTracksByUser(userId: string): Promise<Track[]> {
    return db.select()
      .from(tracks)
      .where(eq(tracks.userId, userId))
      .orderBy(desc(tracks.createdAt));
  }

  async getTracksByLandingPage(landingPageId: string): Promise<Track[]> {
    return db.select()
      .from(tracks)
      .where(eq(tracks.landingPageId, landingPageId))
      .orderBy(asc(tracks.displayOrder), desc(tracks.createdAt));
  }

  async getPublishedTracksByLandingPage(landingPageId: string): Promise<Track[]> {
    return db.select()
      .from(tracks)
      .where(and(
        eq(tracks.landingPageId, landingPageId),
        eq(tracks.isPublished, true)
      ))
      .orderBy(asc(tracks.displayOrder), desc(tracks.createdAt));
  }

  async createTrack(track: InsertTrack & { id: string }): Promise<Track> {
    const [newTrack] = await db.insert(tracks).values(track).returning();
    return newTrack;
  }

  async updateTrack(id: string, data: Partial<InsertTrack>): Promise<Track | undefined> {
    const [track] = await db.update(tracks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tracks.id, id))
      .returning();
    return track;
  }

  async deleteTrack(id: string): Promise<boolean> {
    const result = await db.delete(tracks).where(eq(tracks.id, id));
    return true;
  }

  async incrementTrackPlayCount(id: string): Promise<void> {
    await db.execute(
      `UPDATE tracks SET play_count = COALESCE(play_count, 0) + 1 WHERE id = '${id}'`
    );
  }

  async incrementTrackPurchaseCount(id: string): Promise<void> {
    await db.execute(
      `UPDATE tracks SET purchase_count = COALESCE(purchase_count, 0) + 1 WHERE id = '${id}'`
    );
  }

  // ============================================
  // TRACK PURCHASES (Music Store Feature)
  // ============================================

  async getTrackPurchase(id: string): Promise<TrackPurchase | undefined> {
    const [purchase] = await db.select().from(trackPurchases).where(eq(trackPurchases.id, id));
    return purchase;
  }

  async getTrackPurchaseByToken(token: string): Promise<TrackPurchase | undefined> {
    const [purchase] = await db.select().from(trackPurchases).where(eq(trackPurchases.downloadToken, token));
    return purchase;
  }

  async getTrackPurchaseBySession(sessionId: string): Promise<TrackPurchase | undefined> {
    const [purchase] = await db.select().from(trackPurchases).where(eq(trackPurchases.stripeCheckoutSessionId, sessionId));
    return purchase;
  }

  async getTrackPurchasesByEmail(email: string): Promise<TrackPurchase[]> {
    return db.select().from(trackPurchases)
      .where(eq(trackPurchases.buyerEmail, email))
      .orderBy(desc(trackPurchases.createdAt));
  }

  async createTrackPurchase(purchase: InsertTrackPurchase): Promise<TrackPurchase> {
    const [newPurchase] = await db.insert(trackPurchases).values(purchase).returning();
    return newPurchase;
  }

  async incrementDownloadCount(purchaseId: string): Promise<void> {
    await db.execute(
      `UPDATE track_purchases SET download_count = COALESCE(download_count, 0) + 1 WHERE id = '${purchaseId}'`
    );
  }

  // ============================================
  // TRACK SPLITS (Collaboration Verification)
  // ============================================

  async getTrackSplit(id: string): Promise<TrackSplit | undefined> {
    const [split] = await db.select().from(trackSplits).where(eq(trackSplits.id, id));
    return split;
  }

  async getTrackSplitByToken(token: string): Promise<TrackSplit | undefined> {
    const [split] = await db.select().from(trackSplits).where(eq(trackSplits.verificationToken, token));
    return split;
  }

  async getTrackSplitsByTrack(trackId: string): Promise<TrackSplit[]> {
    return db.select()
      .from(trackSplits)
      .where(eq(trackSplits.trackId, trackId))
      .orderBy(desc(trackSplits.createdAt));
  }

  async getTrackSplitsByCollaboratorEmail(email: string): Promise<TrackSplit[]> {
    return db.select()
      .from(trackSplits)
      .where(eq(trackSplits.collaboratorEmail, email.toLowerCase()))
      .orderBy(desc(trackSplits.createdAt));
  }

  async getPendingSplitsByDeadline(deadline: Date): Promise<TrackSplit[]> {
    return db.select()
      .from(trackSplits)
      .where(and(
        eq(trackSplits.status, 'pending'),
        lte(trackSplits.verificationDeadline, deadline)
      ));
  }

  async getPendingSplitsNeedingReminder(daysRemaining: number): Promise<TrackSplit[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return db.select()
      .from(trackSplits)
      .where(and(
        eq(trackSplits.status, 'pending'),
        gte(trackSplits.verificationDeadline, startOfDay),
        lte(trackSplits.verificationDeadline, endOfDay)
      ));
  }

  async createTrackSplit(split: InsertTrackSplit): Promise<TrackSplit> {
    const insertData: Record<string, unknown> = {
      ...split,
      collaboratorEmail: split.collaboratorEmail.toLowerCase(),
      status: (split.status || 'pending') as TrackSplitStatus,
    };
    // Ensure collaboratorRole is a valid role or null
    if (split.collaboratorRole) {
      insertData.collaboratorRole = split.collaboratorRole as 'artist' | 'producer' | 'writer' | 'composer' | 'performer' | 'label' | 'other';
    }
    const [newSplit] = await db.insert(trackSplits).values(insertData as typeof trackSplits.$inferInsert).returning();
    return newSplit;
  }

  async updateTrackSplit(id: string, data: Partial<InsertTrackSplit>): Promise<TrackSplit | undefined> {
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
    if (data.collaboratorEmail) {
      updateData.collaboratorEmail = data.collaboratorEmail.toLowerCase();
    }
    if (data.status) {
      updateData.status = data.status as TrackSplitStatus;
    }
    const [split] = await db.update(trackSplits)
      .set(updateData)
      .where(eq(trackSplits.id, id))
      .returning();
    return split;
  }

  async deleteTrackSplit(id: string): Promise<boolean> {
    const result = await db.delete(trackSplits).where(eq(trackSplits.id, id)).returning();
    return result.length > 0;
  }

  async deleteTrackSplitsByTrack(trackId: string): Promise<boolean> {
    await db.delete(trackSplits).where(eq(trackSplits.trackId, trackId));
    return true;
  }

  async checkAllSplitsVerifiedOrExpired(trackId: string): Promise<boolean> {
    const splits = await this.getTrackSplitsByTrack(trackId);
    if (splits.length === 0) {
      return true; // No splits means verified by default
    }
    return splits.every(split => split.status === 'verified' || split.status === 'expired');
  }

  // ============================================
  // ARTIST VIDEOS (Video Store Feature)
  // ============================================

  async getArtistVideo(id: string): Promise<ArtistVideo | undefined> {
    const [video] = await db.select().from(artistVideos).where(eq(artistVideos.id, id));
    return video;
  }

  async getArtistVideosByLandingPage(landingPageId: string): Promise<ArtistVideo[]> {
    return db.select()
      .from(artistVideos)
      .where(eq(artistVideos.landingPageId, landingPageId))
      .orderBy(asc(artistVideos.displayOrder), desc(artistVideos.createdAt));
  }

  async getPublishedArtistVideosByLandingPage(landingPageId: string): Promise<ArtistVideo[]> {
    return db.select()
      .from(artistVideos)
      .where(and(
        eq(artistVideos.landingPageId, landingPageId),
        eq(artistVideos.isPublished, true)
      ))
      .orderBy(asc(artistVideos.displayOrder), desc(artistVideos.createdAt));
  }

  async createArtistVideo(video: InsertArtistVideo & { id: string }): Promise<ArtistVideo> {
    const [newVideo] = await db.insert(artistVideos).values(video).returning();
    return newVideo;
  }

  async updateArtistVideo(id: string, data: Partial<InsertArtistVideo>): Promise<ArtistVideo | undefined> {
    const [video] = await db.update(artistVideos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(artistVideos.id, id))
      .returning();
    return video;
  }

  async deleteArtistVideo(id: string): Promise<boolean> {
    const result = await db.delete(artistVideos).where(eq(artistVideos.id, id));
    return true;
  }

  async incrementVideoViewCount(id: string): Promise<void> {
    await db.execute(
      `UPDATE artist_videos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = '${id}'`
    );
  }

  async incrementVideoPurchaseCount(id: string): Promise<void> {
    await db.execute(
      `UPDATE artist_videos SET purchase_count = COALESCE(purchase_count, 0) + 1 WHERE id = '${id}'`
    );
  }

  // ============================================
  // VIDEO PURCHASES (Video Store Feature)
  // ============================================

  async getVideoPurchase(id: string): Promise<VideoPurchase | undefined> {
    const [purchase] = await db.select().from(videoPurchases).where(eq(videoPurchases.id, id));
    return purchase;
  }

  async getVideoPurchaseByToken(token: string): Promise<VideoPurchase | undefined> {
    const [purchase] = await db.select().from(videoPurchases).where(eq(videoPurchases.accessToken, token));
    return purchase;
  }

  async getVideoPurchaseBySession(sessionId: string): Promise<VideoPurchase | undefined> {
    const [purchase] = await db.select().from(videoPurchases).where(eq(videoPurchases.stripeCheckoutSessionId, sessionId));
    return purchase;
  }

  async getVideoPurchasesByEmail(email: string): Promise<VideoPurchase[]> {
    return db.select().from(videoPurchases)
      .where(eq(videoPurchases.buyerEmail, email))
      .orderBy(desc(videoPurchases.createdAt));
  }

  async createVideoPurchase(purchase: InsertVideoPurchase): Promise<VideoPurchase> {
    const [newPurchase] = await db.insert(videoPurchases).values(purchase).returning();
    return newPurchase;
  }

  // ============================================
  // MERCH PRODUCTS (Merch Store Feature)
  // ============================================

  async getProduct(id: string): Promise<MerchProduct | undefined> {
    const [product] = await db.select().from(merchProducts).where(eq(merchProducts.id, id));
    return product;
  }

  async getProductsByUser(userId: string): Promise<MerchProduct[]> {
    return db.select()
      .from(merchProducts)
      .where(eq(merchProducts.userId, userId))
      .orderBy(asc(merchProducts.displayOrder), desc(merchProducts.createdAt));
  }

  async getActiveProductsForLandingPage(landingPageId: string): Promise<(MerchProduct & { variants: MerchVariant[] })[]> {
    const products = await db.select()
      .from(merchProducts)
      .where(and(
        eq(merchProducts.landingPageId, landingPageId),
        eq(merchProducts.isActive, true)
      ))
      .orderBy(asc(merchProducts.displayOrder), desc(merchProducts.createdAt));

    const result: (MerchProduct & { variants: MerchVariant[] })[] = [];
    for (const product of products) {
      const variants = await db.select()
        .from(merchVariants)
        .where(and(
          eq(merchVariants.productId, product.id),
          eq(merchVariants.isActive, true)
        ));
      result.push({ ...product, variants });
    }
    return result;
  }

  async createProduct(product: InsertMerchProduct): Promise<MerchProduct> {
    const [newProduct] = await db.insert(merchProducts).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, data: Partial<InsertMerchProduct>): Promise<MerchProduct | undefined> {
    const [product] = await db.update(merchProducts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(merchProducts.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(merchProducts).where(eq(merchProducts.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // MERCH VARIANTS (Merch Store Feature)
  // ============================================

  async getProductVariant(id: string): Promise<MerchVariant | undefined> {
    const [variant] = await db.select().from(merchVariants).where(eq(merchVariants.id, id));
    return variant;
  }

  async getProductVariants(productId: string): Promise<MerchVariant[]> {
    return db.select()
      .from(merchVariants)
      .where(eq(merchVariants.productId, productId));
  }

  async createProductVariant(variant: InsertMerchVariant): Promise<MerchVariant> {
    const [newVariant] = await db.insert(merchVariants).values(variant).returning();
    return newVariant;
  }

  async updateProductVariant(id: string, data: Partial<InsertMerchVariant>): Promise<MerchVariant | undefined> {
    const [variant] = await db.update(merchVariants)
      .set(data)
      .where(eq(merchVariants.id, id))
      .returning();
    return variant;
  }

  async deleteProductVariant(id: string): Promise<boolean> {
    const result = await db.delete(merchVariants).where(eq(merchVariants.id, id)).returning();
    return result.length > 0;
  }

  async decrementVariantInventory(id: string, quantity: number): Promise<boolean> {
    const result = await db.update(merchVariants)
      .set({ inventory: sql`${merchVariants.inventory} - ${quantity}` })
      .where(and(eq(merchVariants.id, id), gte(merchVariants.inventory, quantity)))
      .returning();
    return result.length > 0;
  }

  // ============================================
  // MERCH ORDERS (Merch Store Feature)
  // ============================================

  async getOrder(id: string): Promise<MerchOrder | undefined> {
    const [order] = await db.select().from(merchOrders).where(eq(merchOrders.id, id));
    return order;
  }

  async getOrdersByArtist(artistId: string): Promise<MerchOrder[]> {
    return db.select()
      .from(merchOrders)
      .where(eq(merchOrders.artistId, artistId))
      .orderBy(desc(merchOrders.createdAt));
  }

  async getOrderByCheckoutSession(sessionId: string): Promise<MerchOrder | undefined> {
    const [order] = await db.select().from(merchOrders).where(eq(merchOrders.stripeCheckoutSessionId, sessionId));
    return order;
  }

  async createOrder(order: InsertMerchOrder): Promise<MerchOrder> {
    const [newOrder] = await db.insert(merchOrders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, data: Partial<InsertMerchOrder>): Promise<MerchOrder | undefined> {
    const [order] = await db.update(merchOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(merchOrders.id, id))
      .returning();
    return order;
  }

  // ============================================
  // MERCH ORDER ITEMS (Merch Store Feature)
  // ============================================

  async getOrderItems(orderId: string): Promise<MerchOrderItem[]> {
    return db.select()
      .from(merchOrderItems)
      .where(eq(merchOrderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertMerchOrderItem): Promise<MerchOrderItem> {
    const [newItem] = await db.insert(merchOrderItems).values(item).returning();
    return newItem;
  }

  // ============================================
  // MAILING LIST SUBSCRIBERS (Mailing List Feature)
  // ============================================

  async getSubscriber(id: string): Promise<MailingListSubscriber | undefined> {
    const [sub] = await db.select().from(mailingListSubscribers).where(eq(mailingListSubscribers.id, id));
    return sub;
  }

  async getSubscriberByToken(token: string): Promise<MailingListSubscriber | undefined> {
    const [sub] = await db.select().from(mailingListSubscribers).where(eq(mailingListSubscribers.confirmationToken, token));
    return sub;
  }

  async getSubscriberByEmail(landingPageId: string, email: string): Promise<MailingListSubscriber | undefined> {
    const [sub] = await db.select().from(mailingListSubscribers).where(
      and(eq(mailingListSubscribers.landingPageId, landingPageId), eq(mailingListSubscribers.email, email))
    );
    return sub;
  }

  async getActiveSubscribersByLandingPage(landingPageId: string): Promise<MailingListSubscriber[]> {
    return db.select().from(mailingListSubscribers).where(
      and(eq(mailingListSubscribers.landingPageId, landingPageId), eq(mailingListSubscribers.status, 'active'))
    );
  }

  async getSubscribersByLandingPage(landingPageId: string): Promise<MailingListSubscriber[]> {
    return db.select().from(mailingListSubscribers)
      .where(eq(mailingListSubscribers.landingPageId, landingPageId))
      .orderBy(desc(mailingListSubscribers.createdAt));
  }

  async getSubscriberCountsByLandingPage(landingPageId: string): Promise<{ total: number; active: number; unsubscribed: number }> {
    const results = await db.select({
      status: mailingListSubscribers.status,
      count: count(),
    }).from(mailingListSubscribers)
      .where(eq(mailingListSubscribers.landingPageId, landingPageId))
      .groupBy(mailingListSubscribers.status);

    let total = 0, active = 0, unsubscribed = 0;
    for (const r of results) {
      const c = Number(r.count);
      total += c;
      if (r.status === 'active') active = c;
      if (r.status === 'unsubscribed') unsubscribed = c;
    }
    return { total, active, unsubscribed };
  }

  async createSubscriber(subscriber: InsertMailingListSubscriber): Promise<MailingListSubscriber> {
    const [sub] = await db.insert(mailingListSubscribers).values(subscriber).returning();
    return sub;
  }

  async updateSubscriber(id: string, data: Partial<InsertMailingListSubscriber>): Promise<MailingListSubscriber | undefined> {
    const [sub] = await db.update(mailingListSubscribers).set(data).where(eq(mailingListSubscribers.id, id)).returning();
    return sub;
  }

  async deleteSubscriber(id: string): Promise<boolean> {
    const result = await db.delete(mailingListSubscribers).where(eq(mailingListSubscribers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================
  // EMAIL CAMPAIGNS (Mailing List Feature)
  // ============================================

  async getCampaign(id: string): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign;
  }

  async getCampaignsByUser(userId: string): Promise<EmailCampaign[]> {
    return db.select().from(emailCampaigns)
      .where(eq(emailCampaigns.userId, userId))
      .orderBy(desc(emailCampaigns.createdAt));
  }

  async getScheduledCampaignsDue(): Promise<EmailCampaign[]> {
    return db.select().from(emailCampaigns).where(
      and(
        eq(emailCampaigns.status, 'scheduled'),
        lte(emailCampaigns.scheduledFor, new Date())
      )
    );
  }

  async createCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [c] = await db.insert(emailCampaigns).values(campaign).returning();
    return c;
  }

  async updateCampaign(id: string, data: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const [c] = await db.update(emailCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailCampaigns.id, id))
      .returning();
    return c;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================
  // EMAIL SENDS (Mailing List Feature)
  // ============================================

  async createEmailSend(send: InsertEmailSend): Promise<EmailSend> {
    const [s] = await db.insert(emailSends).values(send).returning();
    return s;
  }

  async createEmailSendsBatch(sends: InsertEmailSend[]): Promise<EmailSend[]> {
    if (sends.length === 0) return [];
    return db.insert(emailSends).values(sends).returning();
  }

  async getEmailSendByPostmarkId(postmarkMessageId: string): Promise<EmailSend | undefined> {
    const [s] = await db.select().from(emailSends).where(eq(emailSends.postmarkMessageId, postmarkMessageId));
    return s;
  }

  async updateEmailSend(id: string, data: Partial<InsertEmailSend>): Promise<EmailSend | undefined> {
    const [s] = await db.update(emailSends).set(data).where(eq(emailSends.id, id)).returning();
    return s;
  }

  async getCampaignAnalytics(campaignId: string): Promise<{
    recipientCount: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> {
    const results = await db.select({
      total: count(),
      delivered: sql<number>`count(*) filter (where ${emailSends.status} = 'delivered')`,
      opened: sql<number>`count(*) filter (where ${emailSends.openedAt} is not null)`,
      clicked: sql<number>`count(*) filter (where ${emailSends.clickedAt} is not null)`,
      bounced: sql<number>`count(*) filter (where ${emailSends.status} = 'bounced')`,
    }).from(emailSends).where(eq(emailSends.campaignId, campaignId));

    const r = results[0];
    return {
      recipientCount: Number(r?.total ?? 0),
      delivered: Number(r?.delivered ?? 0),
      opened: Number(r?.opened ?? 0),
      clicked: Number(r?.clicked ?? 0),
      bounced: Number(r?.bounced ?? 0),
    };
  }

  // ============================================
  // EMAIL LINK CLICKS (Mailing List Feature)
  // ============================================

  async createLinkClick(click: InsertEmailLinkClick): Promise<EmailLinkClick> {
    const [c] = await db.insert(emailLinkClicks).values(click).returning();
    return c;
  }

  async getLinkClicksByCampaign(campaignId: string): Promise<{ url: string; clicks: number }[]> {
    return db.select({
      url: emailLinkClicks.url,
      clicks: count(),
    }).from(emailLinkClicks)
      .innerJoin(emailSends, eq(emailLinkClicks.sendId, emailSends.id))
      .where(eq(emailSends.campaignId, campaignId))
      .groupBy(emailLinkClicks.url)
      .orderBy(desc(count()));
  }

  // ============================================
  // DISTRIBUTION TRACKS (Independent Entity)
  // ============================================

  async getDistributionTrack(id: string): Promise<DistributionTrack | undefined> {
    const [track] = await db.select().from(distributionTracks).where(eq(distributionTracks.id, id));
    return track;
  }

  async getDistributionTracksByUser(userId: string): Promise<DistributionTrack[]> {
    return db.select()
      .from(distributionTracks)
      .where(eq(distributionTracks.userId, userId))
      .orderBy(desc(distributionTracks.createdAt));
  }

  async createDistributionTrack(track: InsertDistributionTrack & { id: string }): Promise<DistributionTrack> {
    const [newTrack] = await db.insert(distributionTracks).values(track).returning();
    return newTrack;
  }

  async updateDistributionTrack(id: string, data: Partial<InsertDistributionTrack>): Promise<DistributionTrack | undefined> {
    const [track] = await db.update(distributionTracks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(distributionTracks.id, id))
      .returning();
    return track;
  }

  async deleteDistributionTrack(id: string): Promise<boolean> {
    await db.delete(distributionTracks).where(eq(distributionTracks.id, id));
    return true;
  }

  async getNextIsrcDesignation(year: number): Promise<number> {
    return db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(isrcSequences)
        .where(eq(isrcSequences.year, year))
        .for("update");

      if (rows.length > 0) {
        const next = rows[0].lastDesignation + 1;
        await tx
          .update(isrcSequences)
          .set({ lastDesignation: next, updatedAt: new Date() })
          .where(eq(isrcSequences.year, year));
        return next;
      } else {
        await tx.insert(isrcSequences).values({
          year,
          lastDesignation: 1,
        });
        return 1;
      }
    });
  }
}

export const storage = new DatabaseStorage();
