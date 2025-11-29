import {
  type User, type InsertUser,
  type Contract, type InsertContract,
  type ContractFolder, type InsertContractFolder,
  type ContractVersion, type InsertContractVersion,
  type LandingPage, type InsertLandingPage,
  type LandingPageLink, type InsertLandingPageLink,
  users, contracts, contractFolders, contractVersions, landingPages, landingPageLinks
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, gte, lte, asc, isNull, count, max, type SQL } from "drizzle-orm";

export interface ContractFilters {
  search?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string; // 'null' for unfiled, uuid for specific folder
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

  // Contract Versions (Story 8.5)
  createContractVersion(version: InsertContractVersion): Promise<ContractVersion>;
  getContractVersions(contractId: string): Promise<ContractVersion[]>;
  getContractVersion(contractId: string, versionNumber: number): Promise<ContractVersion | undefined>;
  getNextVersionNumber(contractId: string): Promise<number>;
  
  // Landing Pages
  getLandingPage(id: string): Promise<LandingPage | undefined>;
  getLandingPageBySlug(slug: string): Promise<LandingPage | undefined>;
  getLandingPageByUser(userId: string): Promise<LandingPage | undefined>;
  createLandingPage(page: InsertLandingPage): Promise<LandingPage>;
  updateLandingPage(id: string, data: Partial<InsertLandingPage>): Promise<LandingPage | undefined>;
  
  // Landing Page Links
  getLandingPageLinks(landingPageId: string): Promise<LandingPageLink[]>;
  createLandingPageLink(link: InsertLandingPageLink): Promise<LandingPageLink>;
  updateLandingPageLink(id: string, data: Partial<InsertLandingPageLink>): Promise<LandingPageLink | undefined>;
  deleteLandingPageLink(id: string): Promise<boolean>;
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

    return db.select()
      .from(contracts)
      .where(and(...conditions))
      .orderBy(desc(contracts.updatedAt));
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

  // Contract Versions (Story 8.5)
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

  async getContractVersion(contractId: string, versionNumber: number): Promise<ContractVersion | undefined> {
    const [version] = await db.select()
      .from(contractVersions)
      .where(and(
        eq(contractVersions.contractId, contractId),
        eq(contractVersions.versionNumber, versionNumber)
      ));
    return version;
  }

  async getNextVersionNumber(contractId: string): Promise<number> {
    const [result] = await db
      .select({ maxVersion: max(contractVersions.versionNumber) })
      .from(contractVersions)
      .where(eq(contractVersions.contractId, contractId));
    return (result?.maxVersion || 0) + 1;
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
}

export const storage = new DatabaseStorage();
