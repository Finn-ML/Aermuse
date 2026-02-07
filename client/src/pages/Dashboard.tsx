import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import GrainOverlay from '@/components/GrainOverlay';
import { VerificationBanner } from '@/components/VerificationBanner';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { ContractUpload } from '@/components/contracts/ContractUpload';
import { TemplateGallery } from '@/components/templates/TemplateGallery';
import { TemplateForm } from '@/components/templates/TemplateForm';
import { ContractPreview } from '@/components/templates/ContractPreview';
import { ContractSearchBar } from '@/components/contracts/ContractSearchBar';
import { HighlightText } from '@/components/contracts/HighlightText';
import { ContractFilters, type FilterState } from '@/components/contracts/ContractFilters';
import { ActiveFilters } from '@/components/contracts/ActiveFilters';
import { FolderSidebar } from '@/components/contracts/FolderSidebar';
import { MoveToFolderModal } from '@/components/contracts/MoveToFolderModal';
import { ContractSortDropdown, type SortField, type SortOrder } from '@/components/contracts/ContractSortDropdown';
import { AwaitingSignatureList } from '@/components/signatures';
import { ProposalCard, ProposalDetail } from '@/components/proposals';
import { MusicSalesMetrics } from '@/components/music/MusicSalesMetrics';
import { type SocialIcon } from '@/components/landing/SocialIconsEditor';
import { LandingPageEditor } from '@/components/landing/editor';
import { SplitRegistrationForm } from '@/components/music/SplitRegistrationForm';
import { SplitVerificationStatus } from '@/components/music/SplitVerificationStatus';
import { ContractLimitPrompt } from '@/components/UpgradePrompt';
import { UpgradeModal } from '@/components/UpgradeModal';
import { PremiumFeatureGate, PremiumBadge } from '@/components/PremiumFeatureGate';
import { useTemplates } from '@/hooks/useTemplates';
import { usePremium } from '@/hooks/usePremium';
import { SUPPORTED_FONTS } from '@shared/themes';
import { useAuth } from '@/lib/auth';
import type { TemplateFormData } from '@shared/types/templates';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Contract, LandingPage, LandingPageLink, ContractTemplate } from '@shared/schema';
import {
  LayoutGrid,
  FileText,
  Layout,
  User,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  Plus,
  ExternalLink,
  Upload,
  Download,
  Eye,
  Sparkles,
  Calendar,
  DollarSign,
  X,
  Loader2,
  Trash2,
  Check,
  SearchX,
  FolderInput,
  FileDown,
  Mail,
  Filter,
  Inbox,
  Menu,
  CreditCard,
  Pen,
  Shield,
} from 'lucide-react';

type NavId = 'dashboard' | 'contracts' | 'templates' | 'proposals' | 'landing' | 'settings';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  enabled: boolean;
}

// Draggable wrapper for contract cards
function DraggableContractCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNav, setActiveNav] = useState<NavId>('dashboard');
  const [editorTab, setEditorTab] = useState<'design' | 'links' | 'music' | 'video' | 'social' | 'settings'>('design');
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showUploadContract, setShowUploadContract] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [stripeConnectLoading2, setStripeConnectLoading2] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [previewFormData, setPreviewFormData] = useState<TemplateFormData | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all, 'unfiled' = unfiled
  const [moveContractModal, setMoveContractModal] = useState<{ contractId: string; contractName: string; currentFolderId: string | null } | null>(null);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [draggingContract, setDraggingContract] = useState<Contract | null>(null);
  // Proposals state (Story 7.5)
  const [proposalStatusFilter, setProposalStatusFilter] = useState('all');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  // Story 7.6: Proposal to Contract flow
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [creatingContractFromProposal, setCreatingContractFromProposal] = useState(false);
  const [proposalTemplateData, setProposalTemplateData] = useState<{
    template: ContractTemplate;
    proposalId: string;
    initialData: Record<string, string | number | Date | null>;
  } | null>(null);
  // Track splits management modal state
  const [splitsModalTrack, setSplitsModalTrack] = useState<Track | null>(null);

  // Configure drag sensor with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  const { user, logout, isLoading: authLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Templates for proposal-to-contract flow (Story 7.6)
  const { templates } = useTemplates();
  // Premium subscription check
  const { isPremium, tier } = usePremium();
  // Story 9.9: Check if user has Pro subscription (alias for backwards compat)
  const isPro = isPremium;

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/auth');
    }
  }, [user, authLoading, setLocation]);

  // Handle URL query params (tab selection, Stripe Connect callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Handle tab query param for deep linking (e.g., /dashboard?tab=contracts)
    const tabParam = params.get('tab');
    if (tabParam && ['dashboard', 'contracts', 'templates', 'proposals', 'landing', 'settings'].includes(tabParam)) {
      setActiveNav(tabParam as NavId);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle Stripe Connect callback
    const stripeConnect = params.get('stripe_connect');
    if (stripeConnect === 'complete') {
      // User completed onboarding, refetch status and show settings
      setActiveNav('settings');
      refetchStripeConnect();
      toast({ title: 'Stripe account connected successfully!' });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (stripeConnect === 'refresh') {
      // User needs to refresh onboarding link
      setActiveNav('settings');
      toast({ title: 'Please complete your Stripe account setup', variant: 'destructive' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Preload all supported fonts for the landing page editor preview (Story 9.3)
  useEffect(() => {
    const fontFamilies = SUPPORTED_FONTS.map(f =>
      `family=${f.name.replace(/ /g, '+')}:wght@${f.weights}`
    ).join('&');

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
    link.rel = 'stylesheet';
    link.id = 'dashboard-font-preload';

    // Only add if not already present
    if (!document.getElementById('dashboard-font-preload')) {
      document.head.appendChild(link);
    }

    return () => {
      const existing = document.getElementById('dashboard-font-preload');
      if (existing) {
        document.head.removeChild(existing);
      }
    };
  }, []);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ['/api/contracts', searchQuery, advancedFilters, selectedFolder, sortField, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (advancedFilters.status) {
        params.set('status', advancedFilters.status);
      }
      if (advancedFilters.type) {
        params.set('type', advancedFilters.type);
      }
      if (advancedFilters.dateFrom) {
        params.set('dateFrom', advancedFilters.dateFrom);
      }
      if (advancedFilters.dateTo) {
        params.set('dateTo', advancedFilters.dateTo);
      }
      // Folder filtering
      if (selectedFolder === 'unfiled') {
        params.set('folderId', 'null');
      } else if (selectedFolder) {
        params.set('folderId', selectedFolder);
      }
      // Sorting (Story 8.6)
      params.set('sortField', sortField);
      params.set('sortOrder', sortOrder);
      const url = `/api/contracts${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch contracts');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: landingPageData, isLoading: landingPageLoading } = useQuery<LandingPage & { links: LandingPageLink[] }>({
    queryKey: ['/api/landing-page'],
    enabled: !!user,
  });

  // Fetch contract limit for free users
  interface ContractLimitData {
    current: number;
    limit: number | null;
    allowed: boolean;
    isPremium: boolean;
  }
  const { data: contractLimitData } = useQuery<ContractLimitData>({
    queryKey: ['/api/contracts/limit'],
    enabled: !!user && !isPremium,
  });

  // Fetch landing page analytics (Story 10.1)
  interface AnalyticsData {
    totalViews: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    clickRate: number;
    linkStats: Array<{ linkId: string; clicks: number }>;
  }
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/landing-page', landingPageData?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/analytics/landing-page/${landingPageData?.id}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: !!landingPageData?.id,
  });

  // Fetch tracks for music tab
  interface Track {
    id: string;
    title: string;
    priceInCents: number;
    fileFormat: string;
    coverArtPath?: string | null;
    previewFilePath?: string | null;
    isPublished: boolean;
    playCount: number;
    purchaseCount: number;
    // Split-related fields
    splitsConfigured?: boolean;
    splitsVerified?: boolean;
    ownerSplitPercentage?: number;
    autoPublishAt?: string | null;
    // PWYW and streaming fields
    pricingType?: 'fixed' | 'pwyw';
    minimumPriceInCents?: number;
    suggestedPriceInCents?: number;
    allowFreeStreaming?: boolean;
  }
  const { data: tracksData, isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ['/api/landing-page/tracks'],
    queryFn: async () => {
      const res = await fetch('/api/landing-page/tracks', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tracks');
      return res.json();
    },
    enabled: !!user && activeNav === 'landing',
  });
  const tracks = tracksData || [];

  // Fetch videos for video tab
  interface Video {
    id: string;
    title: string;
    description?: string | null;
    thumbnailPath?: string | null;
    durationSeconds?: number | null;
    fileFormat: string;
    fileSizeBytes: number;
    isPaywalled: boolean;
    priceInCents?: number | null;
    currency?: string | null;
    pricingType?: 'fixed' | 'pwyw' | null;
    minimumPriceInCents?: number | null;
    isPublished: boolean;
    viewCount?: number;
    purchaseCount?: number;
  }
  const { data: videosData, isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ['/api/landing-page/videos'],
    queryFn: async () => {
      const res = await fetch('/api/landing-page/videos', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    },
    enabled: !!user && activeNav === 'landing',
  });
  const videos = videosData || [];

  // Fetch track splits when modal is open
  interface TrackSplit {
    id: string;
    trackId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    collaboratorRole: string;
    splitPercentage: number;
    status: 'pending' | 'verified' | 'rejected' | 'expired';
    verificationDeadline?: string;
    rejectionReason?: string;
  }
  const { data: trackSplitsData, isLoading: trackSplitsLoading } = useQuery<{ splits: TrackSplit[] }>({
    queryKey: ['/api/tracks', splitsModalTrack?.id, 'splits'],
    queryFn: async () => {
      const res = await fetch(`/api/tracks/${splitsModalTrack!.id}/splits`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch splits');
      return res.json();
    },
    enabled: !!splitsModalTrack,
  });
  const trackSplits = trackSplitsData?.splits || [];

  // Fetch Stripe Connect status for payment settings
  interface StripeConnectStatus {
    connected: boolean;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  }
  const { data: stripeConnectData, isLoading: stripeConnectLoading, refetch: refetchStripeConnect } = useQuery<StripeConnectStatus>({
    queryKey: ['/api/stripe/connect/status'],
    queryFn: async () => {
      const res = await fetch('/api/stripe/connect/status', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch Stripe Connect status');
      return res.json();
    },
    enabled: !!user && activeNav === 'settings',
  });

  // Fetch unread proposal count for badge (Story 7.4)
  const { data: proposalCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/proposals/unread-count'],
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
  const unreadProposalCount = proposalCountData?.count || 0;

  // Fetch upcoming events for dashboard widget
  interface UpcomingEvent {
    id: string;
    title: string;
    date: string;
    type: 'contract' | 'signature' | 'payment';
  }
  const { data: upcomingEventsData, isLoading: upcomingEventsLoading } = useQuery<{ events: UpcomingEvent[] }>({
    queryKey: ['/api/upcoming-events'],
    enabled: !!user,
  });
  const upcomingEvents = upcomingEventsData?.events || [];

  // Proposal types (Story 7.5)
  interface Proposal {
    id: string;
    senderName: string;
    senderEmail: string;
    senderCompany: string | null;
    proposalType: string;
    message: string;
    status: 'new' | 'viewed' | 'responded' | 'archived';
    createdAt: string;
    viewedAt: string | null;
    respondedAt: string | null;
    contractId: string | null;
    landingPage: { id: string; artistName: string } | null;
  }

  // Fetch proposals list (Story 7.5)
  const { data: proposalsData, isLoading: proposalsLoading } = useQuery<{ proposals: Proposal[] }>({
    queryKey: ['/api/proposals', proposalStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (proposalStatusFilter !== 'all') {
        params.set('status', proposalStatusFilter);
      }
      const res = await fetch(`/api/proposals?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch proposals');
      return res.json();
    },
    enabled: !!user && activeNav === 'proposals',
  });
  const proposals = proposalsData?.proposals || [];

  // Fetch single proposal detail (Story 7.5)
  const { data: selectedProposal, isLoading: proposalDetailLoading } = useQuery<Proposal>({
    queryKey: ['/api/proposals', selectedProposalId],
    queryFn: async () => {
      const res = await fetch(`/api/proposals/${selectedProposalId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch proposal');
      return res.json();
    },
    enabled: !!user && !!selectedProposalId,
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/contracts/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: "Contract deleted" });
    },
  });

  const analyzeContractMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/contracts/${id}/analyze`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ 
        title: "Analysis complete", 
        description: `Risk score: ${data.analysis.overallScore}/100` 
      });
    },
  });

  const signContractMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/contracts/${id}/sign`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({ title: "Contract signed", description: "Your contract is now active." });
    },
  });

  const moveContractMutation = useMutation({
    mutationFn: async ({ contractId, folderId }: { contractId: string; folderId: string | null }) => {
      const res = await apiRequest('POST', `/api/contracts/${contractId}/move`, { folderId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({ title: "Contract moved" });
    },
    onError: () => {
      toast({ title: "Failed to move contract", variant: "destructive" });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const contract = contracts.find(c => c.id === event.active.id);
    if (contract) setDraggingContract(contract);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingContract(null);
    const { active, over } = event;
    if (!over) return;

    const contractId = active.id as string;
    const folderId = over.id === 'unfiled' ? null : over.id as string;

    // Skip if dropping on same folder
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    if (contract.folderId === folderId) return;
    if (contract.folderId === null && folderId === null) return;

    moveContractMutation.mutate({ contractId, folderId });
  };

  const updateLandingPageMutation = useMutation({
    mutationFn: async (data: Partial<LandingPage>) => {
      const res = await apiRequest('PATCH', '/api/landing-page', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
      // No toast on auto-save to avoid spam during typing
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: { title: string; url: string; type?: string; videoUrl?: string }) => {
      const res = await apiRequest('POST', '/api/landing-page/links', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; enabled?: boolean; title?: string; url?: string; order?: string }) => {
      const res = await apiRequest('PATCH', `/api/landing-page/links/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/landing-page/links/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
    },
  });

  // Helper to safely parse error response (handles both JSON and non-JSON responses)
  const parseErrorResponse = async (res: Response, fallbackMessage: string): Promise<string> => {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await res.json();
        return error.error || error.message || fallbackMessage;
      } catch {
        return fallbackMessage;
      }
    }
    return fallbackMessage;
  };

  // Track mutations for music tab
  const uploadTrack = async (options: {
    file: File;
    title: string;
    priceInCents: number;
    coverFile?: File;
    pricingType?: 'fixed' | 'pwyw';
    minimumPriceInCents?: number;
    suggestedPriceInCents?: number;
    allowFreeStreaming?: boolean;
    hasCollaborators?: boolean;
  }): Promise<Track> => {
    const {
      file,
      title,
      priceInCents,
      coverFile,
      pricingType = 'fixed',
      minimumPriceInCents,
      suggestedPriceInCents,
      allowFreeStreaming = false,
    } = options;

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title);
    formData.append('priceInCents', priceInCents.toString());
    formData.append('pricingType', pricingType);
    if (minimumPriceInCents !== undefined) {
      formData.append('minimumPriceInCents', minimumPriceInCents.toString());
    }
    if (suggestedPriceInCents !== undefined) {
      formData.append('suggestedPriceInCents', suggestedPriceInCents.toString());
    }
    formData.append('allowFreeStreaming', allowFreeStreaming.toString());

    const res = await fetch('/api/landing-page/tracks', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorMessage = await parseErrorResponse(res, 'Failed to upload track');
      throw new Error(errorMessage);
    }

    const track = await res.json();

    // Upload cover art if provided
    if (coverFile && track.id) {
      try {
        const coverFormData = new FormData();
        coverFormData.append('image', coverFile);
        const coverRes = await fetch(`/api/tracks/${track.id}/cover`, {
          method: 'POST',
          body: coverFormData,
          credentials: 'include',
        });
        if (coverRes.ok) {
          const coverData = await coverRes.json();
          if (coverData.path) {
            track.coverArtPath = coverData.path;
          }
        } else {
          console.warn('Cover art upload failed:', coverRes.status, await coverRes.text());
        }
      } catch (err) {
        console.warn('Failed to upload cover art:', err);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['/api/landing-page/tracks'] });
    toast({ title: 'Track uploaded successfully' });

    return track;
  };

  const updateTrack = async (id: string, updates: { title?: string; priceInCents?: number; isPublished?: boolean }) => {
    const res = await apiRequest('PATCH', `/api/tracks/${id}`, updates);
    if (!res.ok) {
      const errorMessage = await parseErrorResponse(res, 'Failed to update track');
      throw new Error(errorMessage);
    }
    queryClient.invalidateQueries({ queryKey: ['/api/landing-page/tracks'] });
  };

  const deleteTrack = async (id: string) => {
    const res = await apiRequest('DELETE', `/api/tracks/${id}`, {});
    if (!res.ok) {
      const errorMessage = await parseErrorResponse(res, 'Failed to delete track');
      throw new Error(errorMessage);
    }
    queryClient.invalidateQueries({ queryKey: ['/api/landing-page/tracks'] });
    toast({ title: 'Track deleted' });
  };

  const uploadTrackCover = async (trackId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`/api/tracks/${trackId}/cover`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorMessage = await parseErrorResponse(res, 'Failed to upload cover');
      throw new Error(errorMessage);
    }

    queryClient.invalidateQueries({ queryKey: ['/api/landing-page/tracks'] });
    toast({ title: 'Cover art updated' });
  };

  // Video mutations for video tab - uses chunked upload to bypass proxy limits
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  const uploadVideo = async (options: {
    file: File;
    title: string;
    description?: string;
    thumbnailFile?: File;
    isPaywalled: boolean;
    priceInCents?: number;
    pricingType?: 'fixed' | 'pwyw';
    minimumPriceInCents?: number;
  }): Promise<Video> => {
    const {
      file,
      title,
      description,
      thumbnailFile,
      isPaywalled,
      priceInCents,
      pricingType = 'fixed',
      minimumPriceInCents,
    } = options;

    // Calculate number of chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';

    console.log(`[VIDEO UPLOAD] Starting chunked upload: ${file.name} (${file.size} bytes, ${totalChunks} chunks)`);

    // Step 1: Initialize upload
    const initRes = await fetch('/api/landing-page/videos/init-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        totalChunks,
        fileName: file.name,
        fileFormat: fileExtension,
        title,
        description,
        isPaywalled,
        priceInCents,
        pricingType,
        minimumPriceInCents,
        currency: 'gbp',
      }),
    });

    if (!initRes.ok) {
      const errorMessage = await parseErrorResponse(initRes, 'Failed to initialize upload');
      throw new Error(errorMessage);
    }

    const { uploadId } = await initRes.json();
    console.log(`[VIDEO UPLOAD] Upload initialized: ${uploadId}`);

    // Step 2: Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const chunkBuffer = await chunk.arrayBuffer();

      console.log(`[VIDEO UPLOAD] Uploading chunk ${i + 1}/${totalChunks} (${end - start} bytes)`);

      const chunkRes = await fetch('/api/landing-page/videos/chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Upload-Id': uploadId,
          'X-Chunk-Index': i.toString(),
        },
        credentials: 'include',
        body: chunkBuffer,
      });

      if (!chunkRes.ok) {
        const errorMessage = await parseErrorResponse(chunkRes, `Failed to upload chunk ${i + 1}`);
        throw new Error(errorMessage);
      }

      const chunkResult = await chunkRes.json();
      console.log(`[VIDEO UPLOAD] Chunk ${i + 1} received: ${chunkResult.received}/${chunkResult.total}`);
    }

    // Step 3: Complete upload
    console.log(`[VIDEO UPLOAD] Completing upload...`);
    const completeRes = await fetch('/api/landing-page/videos/complete-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ uploadId }),
    });

    if (!completeRes.ok) {
      const errorMessage = await parseErrorResponse(completeRes, 'Failed to complete upload');
      throw new Error(errorMessage);
    }

    const video = await completeRes.json();
    console.log(`[VIDEO UPLOAD] Upload completed: ${video.id}`);

    // Upload thumbnail if provided
    if (thumbnailFile && video.id) {
      try {
        const thumbFormData = new FormData();
        thumbFormData.append('image', thumbnailFile);
        await fetch(`/api/videos/${video.id}/thumbnail`, {
          method: 'POST',
          body: thumbFormData,
          credentials: 'include',
        });
      } catch (err) {
        console.warn('Failed to upload thumbnail:', err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['/api/landing-page/videos'] });
    toast({ title: 'Video uploaded successfully' });

    return video;
  };

  const updateVideo = async (id: string, updates: {
    title?: string;
    description?: string;
    isPaywalled?: boolean;
    priceInCents?: number;
    isPublished?: boolean;
  }) => {
    const res = await apiRequest('PATCH', `/api/videos/${id}`, updates);
    if (!res.ok) {
      const errorMessage = await parseErrorResponse(res, 'Failed to update video');
      throw new Error(errorMessage);
    }
    queryClient.invalidateQueries({ queryKey: ['/api/landing-page/videos'] });
  };

  const deleteVideo = async (id: string) => {
    const res = await apiRequest('DELETE', `/api/videos/${id}`, {});
    if (!res.ok) {
      const errorMessage = await parseErrorResponse(res, 'Failed to delete video');
      throw new Error(errorMessage);
    }
    queryClient.invalidateQueries({ queryKey: ['/api/landing-page/videos'] });
    toast({ title: 'Video deleted' });
  };

  const uploadVideoThumbnail = async (videoId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`/api/videos/${videoId}/thumbnail`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorMessage = await parseErrorResponse(res, 'Failed to upload thumbnail');
      throw new Error(errorMessage);
    }

    queryClient.invalidateQueries({ queryKey: ['/api/landing-page/videos'] });
    toast({ title: 'Thumbnail updated' });
  };

  // Proposal mutations (Story 7.5)
  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/proposals/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals/unread-count'] });
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/proposals/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals/unread-count'] });
      setSelectedProposalId(null);
      toast({ title: "Proposal deleted" });
    },
  });

  const handleProposalStatusChange = (id: string, status: string) => {
    updateProposalMutation.mutate({ id, status });
  };

  const handleProposalDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this proposal?')) {
      deleteProposalMutation.mutate(id);
    }
  };

  // Story 7.6: Create contract from proposal
  const createContractFromProposalMutation = useMutation({
    mutationFn: async ({ proposalId, templateId }: { proposalId: string; templateId: string }) => {
      const res = await apiRequest('POST', `/api/proposals/${proposalId}/contract`, { templateId });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create contract');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setShowTemplateSelection(false);
      setCreatingContractFromProposal(false);
      toast({
        title: 'Contract Created',
        description: 'The contract has been created from the proposal. Redirecting to contract...',
      });
      // Navigate to contracts section and show the new contract
      setActiveNav('contracts');
      setSelectedProposalId(null);
    },
    onError: (error: Error) => {
      setCreatingContractFromProposal(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateContractFromProposal = () => {
    setShowTemplateSelection(true);
  };

  const handleSelectTemplateForContract = (template: ContractTemplate) => {
    if (!selectedProposalId) return;

    // Find the selected proposal to get its data for pre-filling
    const selectedProposal = proposalsData?.proposals.find(p => p.id === selectedProposalId);

    // Build initial data from proposal fields
    const initialData: Record<string, string | number | Date | null> = {};
    if (selectedProposal) {
      // Map proposal fields to common template field names
      if (selectedProposal.senderName) {
        initialData['party_name'] = selectedProposal.senderName;
        initialData['client_name'] = selectedProposal.senderName;
        initialData['collaborator_name'] = selectedProposal.senderName;
        initialData['licensee_name'] = selectedProposal.senderName;
      }
      if (selectedProposal.senderEmail) {
        initialData['party_email'] = selectedProposal.senderEmail;
        initialData['client_email'] = selectedProposal.senderEmail;
      }
      if (selectedProposal.senderCompany) {
        initialData['company_name'] = selectedProposal.senderCompany;
        initialData['party_company'] = selectedProposal.senderCompany;
      }
    }

    // Store the template and proposal data, then navigate to templates section
    setProposalTemplateData({
      template,
      proposalId: selectedProposalId,
      initialData,
    });
    setShowTemplateSelection(false);
    setActiveNav('templates');
  };

  const handleViewContractFromProposal = (contractId: string) => {
    // Navigate to the specific contract page
    setLocation(`/contracts/${contractId}`);
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const handleAccountDeleted = () => {
    setShowDeleteModal(false);
    setLocation('/');
    window.location.reload(); // Ensure clean state
  };

  const navItems = [
    { id: 'dashboard' as NavId, label: 'Dashboard', icon: LayoutGrid },
    { id: 'contracts' as NavId, label: 'Contract Manager', icon: FileText },
    { id: 'templates' as NavId, label: 'Templates', icon: Layout, premium: true },
    { id: 'proposals' as NavId, label: 'Proposals', icon: Mail, badge: unreadProposalCount > 0 ? unreadProposalCount : undefined, premium: true },
    { id: 'landing' as NavId, label: 'Aerival: Artist Launcher', icon: ExternalLink, premium: true },
    { id: 'settings' as NavId, label: 'Settings', icon: Settings }
  ];

  // Format large numbers for display (Story 10.2)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const activeCount = contracts.filter(c => c.status === 'active').length;
  const pendingCount = contracts.filter(c => c.status === 'pending').length;

  const stats = [
    {
      label: 'Active Contracts',
      value: activeCount.toString(),
      change: activeCount > 0 ? 'Currently active' : 'None active',
      trend: 'up'
    },
    {
      label: 'Pending Review',
      value: pendingCount.toString(),
      change: pendingCount > 0 ? 'Needs attention' : 'All reviewed',
      trend: pendingCount > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Page Views',
      value: analyticsLoading ? '...' : formatNumber(analyticsData?.totalViews || 0),
      change: analyticsLoading ? 'Loading...' : `${analyticsData?.uniqueVisitors || 0} unique`,
      trend: 'up'
    },
  ];


  // Format duration from seconds to human readable (Story 10.1)
  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const landingPageStats = [
    { label: 'Total Views', value: analyticsData?.totalViews?.toLocaleString() || '0' },
    { label: 'Unique Visitors', value: analyticsData?.uniqueVisitors?.toLocaleString() || '0' },
    { label: 'Avg. Time on Page', value: formatDuration(analyticsData?.avgTimeOnPage) },
    { label: 'Click Rate', value: `${analyticsData?.clickRate?.toFixed(1) || '0'}%` }
  ];

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]';
      case 'active': 
      case 'signed': return 'bg-[rgba(40,167,69,0.15)] text-[#28a745]';
      case 'review': return 'bg-[rgba(102,0,51,0.1)] text-[#660033]';
      default: return '';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'contract': return <FileText size={18} />;
      case 'signature': return <Pen size={18} />;
      case 'payment': return <DollarSign size={18} />;
      default: return <Calendar size={18} />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'contract': return 'bg-[rgba(102,0,51,0.1)] text-[#660033]';
      case 'signature': return 'bg-[rgba(40,167,69,0.15)] text-[#28a745]';
      case 'payment': return 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]';
      default: return 'bg-[rgba(102,0,51,0.06)] text-[rgba(102,0,51,0.6)]';
    }
  };

  // Filtering is now done server-side via advancedFilters
  const filteredContracts = contracts;

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#660033]" size={48} />
      </div>
    );
  }

  if (!user) return null;

  const handleResendVerification = async () => {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send verification email');
    }
  };

  // Stripe Connect handlers
  const handleConnectStripe = async () => {
    setStripeConnectLoading2(true);
    try {
      const response = await fetch('/api/stripe/connect/create', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start Stripe Connect');
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Stripe Connect error:', error);
      toast({ title: 'Failed to connect Stripe account', variant: 'destructive' });
      setStripeConnectLoading2(false);
    }
  };

  const handleStripeConnectDashboard = async () => {
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to get dashboard link');
      }
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Stripe dashboard error:', error);
      toast({ title: 'Failed to open Stripe dashboard', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7E6CA] text-[#660033] flex flex-col relative overflow-x-hidden">
      <style>{`
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }
      `}</style>
      <GrainOverlay />
      <div className="flex flex-1">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`w-[280px] flex flex-col fixed top-0 left-0 h-screen z-40 transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRight: '1px solid rgba(102, 0, 51, 0.08)',
          padding: '32px 20px'
        }}
      >
        <div className="flex items-center justify-between mb-12">
          <Link href="/">
            <div className="text-2xl font-light tracking-[0.25em] pl-5 cursor-pointer">
              AERMUSE
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] text-[#660033]"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const showPremiumBadge = 'premium' in item && item.premium && !isPremium;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl cursor-pointer transition-all duration-300 font-medium text-[15px] mb-1 ${
                  activeNav === item.id
                    ? 'bg-[#660033] text-[#F7E6CA]'
                    : 'text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.06)] hover:text-[#660033]'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <Icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {showPremiumBadge && (
                  <PremiumBadge />
                )}
                {'badge' in item && item.badge !== undefined && !showPremiumBadge && (
                  <span className={`ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full ${
                    activeNav === item.id
                      ? 'bg-[#F7E6CA] text-[#660033]'
                      : 'bg-[#660033] text-[#F7E6CA]'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div
          className="pt-5 mt-auto"
          style={{ borderTop: '1px solid rgba(102, 0, 51, 0.08)' }}
        >
          <div className="flex items-center gap-3 px-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#F7E6CA] font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
            >
              {user.avatarInitials || user.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="font-semibold text-sm">{user.name}</div>
              <div className={`text-xs ${user.subscriptionTier === 'theta' ? 'text-[#D4AF37] font-semibold' : 'text-[rgba(102,0,51,0.5)]'}`}>
                {user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing'
                  ? user.subscriptionTier === 'theta' ? 'AERMUSE Theta' : user.subscriptionTier === 'alpha' ? 'AERMUSE Alpha' : 'AERMUSE Beta'
                  : 'Free Plan'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 w-full lg:ml-[280px] lg:w-[calc(100%-280px)] flex flex-col min-h-screen">
        <header
          className={`h-16 lg:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-10 sticky top-0 z-20 transition-opacity duration-500 delay-100 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: 'rgba(247, 230, 202, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(102, 0, 51, 0.08)'
          }}
        >
          <div className="flex items-center gap-3 lg:gap-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] text-[#660033]"
              data-testid="button-mobile-menu"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-0.5 font-playfair" data-testid="text-page-title">
              {activeNav === 'dashboard' && `Welcome back, ${user.name?.split(' ')[0] || 'Artist'}`}
              {activeNav === 'contracts' && 'Contract Manager'}
              {activeNav === 'templates' && 'Contract Templates'}
              {activeNav === 'proposals' && 'Proposals'}
              {activeNav === 'landing' && 'Aerival: Artist Launcher'}
              {activeNav === 'settings' && 'Settings'}
            </h1>
            <p className="text-xs sm:text-sm text-[rgba(102,0,51,0.6)] font-medium hidden sm:block">
              {activeNav === 'dashboard' && "Here's what's happening with your music career"}
              {activeNav === 'contracts' && 'Manage, analyze, and sign your contracts with AI assistance'}
              {activeNav === 'templates' && 'Select a template to create a new contract'}
              {activeNav === 'proposals' && 'Review and respond to proposals from your landing page'}
              {activeNav === 'landing' && 'Customize your artist page and manage your links'}
              {activeNav === 'settings' && 'Manage your account and security settings'}
            </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '2px solid rgba(102, 0, 51, 0.1)'
              }}
              data-testid="button-profile"
            >
              <div 
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#F7E6CA] font-bold text-[13px]"
                style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
              >
                {user.avatarInitials || user.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <ChevronDown size={16} className="text-[#660033]" />
            </button>

            {profileOpen && (
              <div
                className="absolute top-[calc(100%+8px)] right-0 bg-white rounded-2xl p-2 min-w-[200px] z-[100]"
                style={{ boxShadow: '0 20px 50px rgba(102, 0, 51, 0.15)' }}
              >
                {isAdmin && (
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setLocation('/admin');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all"
                    data-testid="button-admin-portal"
                  >
                    <Shield size={18} />
                    Admin Portal
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all"
                  data-testid="button-signout"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Email Verification Banner */}
        {user && !user.emailVerified && (
          <VerificationBanner onResend={handleResendVerification} />
        )}

        <main
          className={`flex-1 p-4 sm:p-6 lg:p-10 transition-all duration-500 delay-200 overflow-x-hidden ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        >
          {activeNav === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="rounded-xl sm:rounded-[20px] p-4 sm:p-5 lg:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(102,0,51,0.08)]"
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    data-testid={`card-stat-${index}`}
                  >
                    <div className="text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-2 sm:mb-3">
                      {stat.label}
                    </div>
                    <div className="text-2xl sm:text-[28px] lg:text-[32px] font-bold mb-1 sm:mb-2">
                      {stat.value}
                    </div>
                    <div className="text-[11px] sm:text-[13px] font-semibold flex items-center gap-1 text-[#660033]">
                      <TrendingUp size={12} className="sm:w-[14px] sm:h-[14px]" />
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Awaiting Signatures Section */}
              <div className="mb-8">
                <AwaitingSignatureList maxItems={3} />
              </div>

              {/* Music Sales Metrics Section */}
              <MusicSalesMetrics />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div
                  className="rounded-[20px] p-5 sm:p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold">Recent Contracts</h3>
                    <button 
                      className="text-sm font-semibold text-[rgba(102,0,51,0.6)] hover:text-[#660033] transition-colors"
                      onClick={() => setActiveNav('contracts')}
                      data-testid="link-view-all-contracts"
                    >
                      View All
                    </button>
                  </div>
                  
                  {contractsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-[#660033]" size={24} />
                    </div>
                  ) : contracts.length === 0 ? (
                    <p className="text-sm text-[rgba(102,0,51,0.5)] text-center py-8">No contracts yet. Add your first contract!</p>
                  ) : (
                    <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[rgba(102,0,51,0.2)] scrollbar-track-transparent">
                      {contracts.slice(0, 10).map((contract) => (
                        <div
                          key={contract.id}
                          className="flex items-center justify-between py-4 border-b border-[rgba(102,0,51,0.06)] last:border-0"
                        >
                          <div>
                            <div className="font-semibold text-[15px] mb-1">{contract.name}</div>
                            <div className="text-[13px] text-[rgba(102,0,51,0.5)]">{formatDate(contract.createdAt)}</div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] ${getStatusClass(contract.status)}`}>
                            {contract.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="rounded-[20px] p-5 sm:p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold">Upcoming</h3>
                  </div>
                  {upcomingEventsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-[#660033]" size={24} />
                    </div>
                  ) : upcomingEvents.length === 0 ? (
                    <p className="text-sm text-[rgba(102,0,51,0.5)] text-center py-8">No upcoming events in the next 30 days.</p>
                  ) : (
                    <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[rgba(102,0,51,0.2)] scrollbar-track-transparent">
                      {upcomingEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-4 py-4 border-b border-[rgba(102,0,51,0.06)] last:border-0"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                          </div>
                          <div>
                            <div className="font-semibold text-[15px] mb-1">{event.title}</div>
                            <div className="text-[13px] text-[rgba(102,0,51,0.5)]">{formatDate(event.date)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeNav === 'contracts' && (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-4">
              {/* Folder Bar - horizontal at top */}
              <FolderSidebar
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
              />

              {/* Main Content */}
              <div className="flex-1">
              {/* Header with action buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#660033] font-playfair">
                    {selectedFolder === null ? 'All Contracts' : selectedFolder === 'unfiled' ? 'Unfiled Contracts' : 'Contracts'}
                  </h2>
                  {/* Contract limit indicator for free users */}
                  {!isPremium && contractLimitData && contractLimitData.limit && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      contractLimitData.current >= contractLimitData.limit
                        ? 'bg-red-100 text-red-700'
                        : contractLimitData.current >= contractLimitData.limit - 3
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {contractLimitData.current}/{contractLimitData.limit} contracts
                    </span>
                  )}
                </div>
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowUploadContract(true)}
                    disabled={!isPremium && contractLimitData && !contractLimitData.allowed}
                    className="flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-xl font-semibold text-xs sm:text-sm hover:bg-[rgba(102,0,51,0.15)] transition-all flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-upload-contract"
                  >
                    <Upload size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Upload Contract</span>
                    <span className="sm:hidden">Upload</span>
                  </button>
                </div>
              </div>

              {/* Contract limit reached banner */}
              {!isPremium && contractLimitData && !contractLimitData.allowed && (
                <div className="mb-6">
                  <ContractLimitPrompt
                    current={contractLimitData.current}
                    limit={contractLimitData.limit || 10}
                  />
                </div>
              )}

              {/* Search Bar and Sort (Story 8.6) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <ContractSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by name, partner, or content..."
                  />
                </div>
                <ContractSortDropdown
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onChange={(field, order) => {
                    setSortField(field);
                    setSortOrder(order);
                  }}
                />
              </div>

              {/* Advanced Filters - AC-1 through AC-7 */}
              <div className="mb-4">
                <ContractFilters
                  filters={advancedFilters}
                  onChange={setAdvancedFilters}
                />
              </div>

              {/* Active Filters Pills */}
              <div className="mb-6">
                <ActiveFilters
                  filters={advancedFilters}
                  searchQuery={searchQuery}
                  onChange={setAdvancedFilters}
                  onSearchClear={() => setSearchQuery('')}
                />
              </div>

              {showUploadContract && (
                <div
                  className="rounded-[20px] p-7 mb-6"
                  style={{ background: 'rgba(255, 255, 255, 0.8)', border: '2px solid rgba(102, 0, 51, 0.1)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Upload Contract</h3>
                    <button onClick={() => setShowUploadContract(false)} className="text-[rgba(102,0,51,0.5)] hover:text-[#660033]">
                      <X size={20} />
                    </button>
                  </div>
                  <ContractUpload
                    onUploadComplete={(contract) => {
                      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/contracts/limit'] });
                      setShowUploadContract(false);
                      toast({ title: "Contract uploaded", description: `${contract.fileName || contract.name} has been uploaded.` });
                    }}
                    onCancel={() => setShowUploadContract(false)}
                    currentContractCount={contractLimitData?.current}
                    contractLimit={contractLimitData?.limit}
                    isPremium={isPremium}
                  />
                </div>
              )}


              {contractsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-[#660033]" size={32} />
                </div>
              ) : filteredContracts.length === 0 ? (
                <div
                  className="rounded-[20px] p-12 text-center"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  {searchQuery ? (
                    <>
                      <SearchX size={48} className="mx-auto mb-4 text-[rgba(102,0,51,0.3)]" />
                      <h3 className="text-lg font-bold text-[#660033] mb-2">No contracts found</h3>
                      <p className="text-[rgba(102,0,51,0.6)] mb-4">
                        No contracts match "{searchQuery}". Try different keywords or check the spelling.
                      </p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-[#660033] font-semibold hover:underline"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <>
                      <FileText size={48} className="mx-auto mb-4 text-[rgba(102,0,51,0.3)]" />
                      <p className="text-[rgba(102,0,51,0.6)] mb-4">No contracts found. Start by adding your first contract!</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContracts.map((contract) => (
                    <DraggableContractCard key={contract.id} id={contract.id}>
                    <div
                      className="relative rounded-[20px] p-4 sm:p-6 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(102,0,51,0.08)]"
                      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                      data-testid={`contract-${contract.id}`}
                    >
                      {/* Status badge positioned at top right */}
                      <span className={`absolute top-3 right-3 sm:top-4 sm:right-4 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] z-10 ${getStatusClass(contract.status)}`}>
                        {contract.status}
                      </span>
                      {/* Add top padding to prevent overlap with badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-8 sm:pt-0 sm:pr-24">
                        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                          <div
                            className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                          >
                            <FileText size={20} className="sm:w-6 sm:h-6 text-[#F7E6CA]" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/contracts/${contract.id}`}
                              className="font-bold text-base sm:text-lg mb-1 hover:text-[#660033] hover:underline cursor-pointer transition-colors block truncate"
                            >
                              <HighlightText text={contract.name} highlight={searchQuery} />
                            </Link>
                            <div className="text-xs sm:text-sm text-[rgba(102,0,51,0.5)] truncate">
                              <HighlightText text={contract.partnerName || 'No partner specified'} highlight={searchQuery} /> • {contract.type?.replace('_', ' ')}
                              {contract.fileName && (
                                <span className="hidden sm:inline ml-2 text-[rgba(102,0,51,0.4)]">
                                  • {contract.fileType?.toUpperCase()} {contract.fileSize ? `(${(contract.fileSize / 1024 / 1024).toFixed(2)} MB)` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0">
                          {contract.value && (
                            <div className="text-left sm:text-right sm:mr-4">
                              <div className="font-bold text-sm sm:text-base">{contract.value}</div>
                              <div className="text-xs text-[rgba(102,0,51,0.5)]">Value</div>
                            </div>
                          )}
                          <div className="flex gap-1 sm:gap-2">
                            {(contract.filePath || contract.renderedContent) && (
                              <a
                                href={contract.filePath ? `/api/contracts/${contract.id}/download` : `/api/contracts/${contract.id}/pdf`}
                                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                                title={`Download ${contract.fileName || 'contract'} as PDF`}
                                data-testid={`button-download-${contract.id}`}
                              >
                                <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                              </a>
                            )}
                            {!!contract.aiAnalysis && (
                              <a
                                href={`/api/contracts/${contract.id}/pdf`}
                                className="hidden sm:flex p-2.5 rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                                title="Download PDF Summary"
                                data-testid={`button-pdf-${contract.id}`}
                              >
                                <FileDown size={18} />
                              </a>
                            )}
                            {contract.aiAnalysis ? (
                              <Link
                                href={`/contracts/${contract.id}`}
                                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                                title="View Analysis"
                                data-testid={`button-view-${contract.id}`}
                              >
                                <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                              </Link>
                            ) : isPremium ? (
                              <button
                                onClick={() => analyzeContractMutation.mutate(contract.id)}
                                disabled={analyzeContractMutation.isPending && analyzeContractMutation.variables === contract.id}
                                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all disabled:opacity-50"
                                title="AI Analysis"
                                data-testid={`button-analyze-${contract.id}`}
                              >
                                {analyzeContractMutation.isPending && analyzeContractMutation.variables === contract.id ? (
                                  <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
                                ) : (
                                  <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                                )}
                              </button>
                            ) : null}
                            {contract.status === 'pending' && (
                              <button
                                onClick={() => signContractMutation.mutate(contract.id)}
                                disabled={signContractMutation.isPending}
                                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[#28a745] text-white hover:bg-[#218838] transition-all"
                                title="Sign Contract"
                                data-testid={`button-sign-${contract.id}`}
                              >
                                <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
                              </button>
                            )}
                            <button
                              onClick={() => setMoveContractModal({
                                contractId: contract.id,
                                contractName: contract.name,
                                currentFolderId: contract.folderId || null,
                              })}
                              className="hidden sm:flex p-2.5 rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                              title="Move to Folder"
                              data-testid={`button-move-${contract.id}`}
                            >
                              <FolderInput size={18} />
                            </button>
                            <button
                              onClick={() => deleteContractMutation.mutate(contract.id)}
                              disabled={deleteContractMutation.isPending}
                              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[rgba(220,53,69,0.1)] text-[#dc3545] hover:bg-[rgba(220,53,69,0.2)] transition-all"
                              title="Delete"
                              data-testid={`button-delete-${contract.id}`}
                            >
                              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {contract.aiAnalysis as object && (
                        <div className="mt-4 pt-4 border-t border-[rgba(102,0,51,0.08)]">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-[#660033]" />
                            <span className="text-sm font-semibold">AI Analysis</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              contract.aiRiskScore === 'low' ? 'bg-[rgba(40,167,69,0.15)] text-[#28a745]' :
                              contract.aiRiskScore === 'medium' ? 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]' :
                              'bg-[rgba(220,53,69,0.15)] text-[#dc3545]'
                            }`}>
                              {(contract.aiRiskScore as string)?.toUpperCase()} RISK
                            </span>
                          </div>
                          <p className="text-sm text-[rgba(102,0,51,0.7)]">
                            {(contract.aiAnalysis as any)?.summary?.overview || (contract.aiAnalysis as any)?.riskAssessment?.summary}
                          </p>
                        </div>
                      )}
                    </div>
                    </DraggableContractCard>
                  ))}
                </div>
              )}

              {/* Move to Folder Modal */}
              {moveContractModal && (
                <MoveToFolderModal
                  isOpen={true}
                  onClose={() => setMoveContractModal(null)}
                  contractId={moveContractModal.contractId}
                  contractName={moveContractModal.contractName}
                  currentFolderId={moveContractModal.currentFolderId}
                  onMoved={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
                    setMoveContractModal(null);
                  }}
                />
              )}
              </div>
            </div>
            {/* Drag overlay for visual feedback */}
            <DragOverlay dropAnimation={null}>
              {draggingContract && (
                <div
                  className="rounded-xl p-4 bg-white shadow-2xl border-2 border-[#660033] opacity-90 max-w-xs pointer-events-none"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                    >
                      <FileText size={18} className="text-[#F7E6CA]" />
                    </div>
                    <div className="font-semibold text-sm text-[#660033] truncate">
                      {draggingContract.name}
                    </div>
                  </div>
                </div>
              )}
            </DragOverlay>
            </DndContext>
          )}

          {activeNav === 'templates' && (
            isPremium ? (
              previewFormData && (selectedTemplate || proposalTemplateData) ? (
                <ContractPreview
                  template={(selectedTemplate || proposalTemplateData?.template)!}
                  formData={previewFormData}
                  onBack={() => setPreviewFormData(null)}
                  proposalId={proposalTemplateData?.proposalId}
                  onContractCreated={(contractId) => {
                    toast({
                      title: 'Contract Created',
                      description: proposalTemplateData
                        ? 'Your contract has been created from the proposal.'
                        : 'Your contract has been saved as a draft.',
                    });
                    // Clear proposal template data if it was from a proposal
                    if (proposalTemplateData) {
                      setProposalTemplateData(null);
                      // Invalidate proposals to update the contractId
                      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
                    }
                    setSelectedTemplate(null);
                    setPreviewFormData(null);
                    // Switch to contracts view
                    setActiveNav('contracts');
                    // Refresh contracts list
                    queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
                  }}
                />
              ) : proposalTemplateData ? (
                <TemplateForm
                  template={proposalTemplateData.template}
                  onBack={() => {
                    setProposalTemplateData(null);
                    setActiveNav('proposals');
                  }}
                  onPreview={(formData) => {
                    setPreviewFormData(formData);
                  }}
                  initialData={proposalTemplateData.initialData}
                  proposalId={proposalTemplateData.proposalId}
                  onContractSaved={(contractId) => {
                    toast({
                      title: 'Contract Saved',
                      description: 'Your contract has been saved to the Contract Manager.',
                    });
                    setProposalTemplateData(null);
                    setActiveNav('contracts');
                  }}
                />
              ) : selectedTemplate ? (
                <TemplateForm
                  template={selectedTemplate}
                  onBack={() => setSelectedTemplate(null)}
                  onPreview={(formData) => {
                    setPreviewFormData(formData);
                  }}
                  onContractSaved={(contractId) => {
                    toast({
                      title: 'Contract Saved',
                      description: 'Your contract has been saved to the Contract Manager.',
                    });
                    setSelectedTemplate(null);
                    setActiveNav('contracts');
                  }}
                />
              ) : (
                <TemplateGallery
                  onSelectTemplate={(template) => {
                    setSelectedTemplate(template);
                  }}
                />
              )
            ) : (
              <PremiumFeatureGate feature="contract-templates" />
            )
          )}

          {activeNav === 'landing' && (
            isPremium ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {landingPageStats.map((stat, index) => (
                    <div
                      key={index}
                      className="rounded-xl sm:rounded-[16px] p-4 sm:p-5"
                      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    >
                      <div className="text-[10px] sm:text-[12px] font-semibold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-1 sm:mb-2">
                        {stat.label}
                      </div>
                      <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Story 9.10: Redesigned Landing Page Editor */}
                {landingPageData && (
                  <LandingPageEditor
                    landingPageData={{
                      ...landingPageData,
                      links: landingPageData.links || [],
                      socialIcons: (landingPageData.socialIcons as SocialIcon[]) || [],
                    }}
                    isPro={isPro}
                    isSaving={updateLandingPageMutation.isPending}
                    onUpdate={(updates) => updateLandingPageMutation.mutate(updates)}
                    onCreateLink={(data) => createLinkMutation.mutate(data)}
                    onUpdateLink={(data) => updateLinkMutation.mutate(data)}
                    onDeleteLink={(id) => deleteLinkMutation.mutate(id)}
                    onImageUpload={async (file) => {
                      const formData = new FormData();
                      formData.append('image', file);
                      const response = await fetch('/api/landing-page/background-image', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Upload failed');
                      }
                      const data = await response.json();
                      return data.url;
                    }}
                    onAvatarUpload={async (file) => {
                      const formData = new FormData();
                      formData.append('image', file);
                      const response = await fetch('/api/landing-page/avatar', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Upload failed');
                      }
                      const data = await response.json();
                      // Refresh landing page data to show new avatar
                      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
                      return data.url;
                    }}
                    onAvatarRemove={async () => {
                      const response = await fetch('/api/landing-page/avatar', {
                        method: 'DELETE',
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to remove avatar');
                      }
                      // Refresh landing page data
                      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
                    }}
                    onBackgroundRemove={async () => {
                      // Story 9.13: Remove background image
                      const response = await fetch('/api/landing-page/background-image', {
                        method: 'DELETE',
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to remove background image');
                      }
                      // Refresh landing page data
                      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
                    }}
                    onVideoUpload={async (file) => {
                      // Spotify Canvas style video upload
                      const formData = new FormData();
                      formData.append('video', file);
                      const response = await fetch('/api/landing-page/background-video', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to upload video');
                      }
                      const result = await response.json();
                      // Refresh landing page data
                      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
                      return {
                        webmUrl: result.webmUrl,
                        mp4Url: result.mp4Url,
                        duration: result.duration,
                      };
                    }}
                    onVideoRemove={async () => {
                      // Remove video background
                      const response = await fetch('/api/landing-page/background-video', {
                        method: 'DELETE',
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to remove video');
                      }
                      // Refresh landing page data
                      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
                    }}
                    onNavigateToUpgrade={() => setLocation('/pricing')}
                    tracks={tracks}
                    isLoadingTracks={tracksLoading}
                    onUploadTrack={uploadTrack}
                    onUpdateTrack={updateTrack}
                    onDeleteTrack={deleteTrack}
                    onUploadTrackCover={uploadTrackCover}
                    onOpenSplits={(track) => setSplitsModalTrack(track)}
                    videos={videos}
                    isLoadingVideos={videosLoading}
                    onUploadVideo={uploadVideo}
                    onUpdateVideo={updateVideo}
                    onDeleteVideo={deleteVideo}
                    onUploadVideoThumbnail={uploadVideoThumbnail}
                    activeTab={editorTab}
                    onTabChange={setEditorTab}
                  />
                )}
              </>
            ) : (
              <PremiumFeatureGate feature="landing" />
            )
          )}

          {activeNav === 'proposals' && (
            isPremium ? (
              selectedProposalId && selectedProposal ? (
                // Proposal Detail View
                (proposalDetailLoading ? (<div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-[#660033]" size={32} />
                </div>) : (<>
                  <ProposalDetail
                    proposal={selectedProposal}
                    onStatusChange={(status) => handleProposalStatusChange(selectedProposalId, status)}
                    onDelete={() => handleProposalDelete(selectedProposalId)}
                    onBack={() => {
                      setSelectedProposalId(null);
                      setShowTemplateSelection(false);
                    }}
                    onCreateContract={handleCreateContractFromProposal}
                    onViewContract={handleViewContractFromProposal}
                  />
                  {/* Template Selection Modal for creating contract from proposal (Story 7.6) */}
                  {showTemplateSelection && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowTemplateSelection(false)}
                      />
                      <div
                        className="relative rounded-[20px] p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                        style={{ background: '#FDF8F3' }}
                      >
                        <h2 className="text-2xl font-bold text-[#660033] mb-2 font-playfair">Select a Template</h2>
                        <p className="text-[rgba(102,0,51,0.6)] mb-6">
                          Choose a template for the contract. The proposal details will be pre-filled.
                        </p>

                        {templates && templates.length > 0 ? (
                          <div className="space-y-3">
                            {templates.map((template) => (
                              <button
                                key={template.id}
                                onClick={() => handleSelectTemplateForContract(template)}
                                disabled={creatingContractFromProposal}
                                className="w-full text-left p-5 rounded-xl border-2 border-[rgba(102,0,51,0.1)] hover:border-[#660033] hover:bg-[rgba(102,0,51,0.04)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-bold text-[#660033]">{template.name}</h3>
                                    {template.description && (
                                      <p className="text-sm text-[rgba(102,0,51,0.6)] mt-1">
                                        {template.description}
                                      </p>
                                    )}
                                  </div>
                                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[rgba(102,0,51,0.08)] text-[rgba(102,0,51,0.6)]">
                                    {template.category}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-[rgba(102,0,51,0.5)]">
                            No templates available. Please create a template first.
                          </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                          <button
                            onClick={() => setShowTemplateSelection(false)}
                            disabled={creatingContractFromProposal}
                            className="px-6 py-3 bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(102,0,51,0.15)] transition-all disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>

                        {creatingContractFromProposal && (
                          <div className="absolute inset-0 bg-white/80 rounded-[20px] flex items-center justify-center">
                            <div className="flex items-center gap-3 text-[#660033]">
                              <Loader2 className="animate-spin" size={24} />
                              <span className="font-semibold">Creating contract...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>))
              ) : (
                // Proposals List View
                (<div className="space-y-6">
                  {/* Status Filters */}
                  <div className="flex items-center gap-3">
                    <Filter size={16} className="text-[rgba(102,0,51,0.5)]" />
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'new', label: 'New' },
                        { value: 'viewed', label: 'Viewed' },
                        { value: 'responded', label: 'Responded' },
                        { value: 'archived', label: 'Archived' },
                      ].map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => setProposalStatusFilter(filter.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            proposalStatusFilter === filter.value
                              ? 'bg-[#660033] text-[#F7E6CA]'
                              : 'bg-[rgba(102,0,51,0.06)] text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.1)] hover:text-[#660033]'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Proposals List */}
                  {proposalsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-[#660033]" size={32} />
                    </div>
                  ) : proposals.length === 0 ? (
                    <div
                      className="rounded-[20px] p-12 text-center"
                      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    >
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'rgba(102, 0, 51, 0.06)' }}
                      >
                        <Inbox size={32} className="text-[rgba(102,0,51,0.3)]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#660033] mb-2">
                        No proposals yet
                      </h3>
                      <p className="text-[rgba(102,0,51,0.6)]">
                        {proposalStatusFilter === 'all'
                          ? "When someone sends a proposal through your landing page, it will appear here."
                          : `No ${proposalStatusFilter} proposals found.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proposals.map((proposal) => (
                        <ProposalCard
                          key={proposal.id}
                          proposal={proposal}
                          onStatusChange={handleProposalStatusChange}
                          onDelete={handleProposalDelete}
                          onSelect={setSelectedProposalId}
                        />
                      ))}
                    </div>
                  )}
                </div>)
              )
            ) : (
              <PremiumFeatureGate feature="proposals" />
            )
          )}

          {activeNav === 'settings' && (
            <>
              {/* Account Information */}
              <div
                className="rounded-[20px] p-5 sm:p-7 mb-4 sm:mb-6"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                  >
                    <User size={20} className="text-[#F7E6CA]" />
                  </div>
                  <h3 className="text-lg font-bold">Account Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Name</p>
                    <p className="text-[#660033] font-medium">{user.name || 'Not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Email</p>
                    <p className="text-[#660033] font-medium">{user.email}</p>
                  </div>
                  {user.artistName && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Artist Name</p>
                      <p className="text-[#660033] font-medium">{user.artistName}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Account Type</p>
                    <p className={`font-medium capitalize ${tier === 'theta' ? 'text-[#D4AF37] font-bold' : 'text-[#660033]'}`}>
                      {isPremium ? (tier === 'theta' ? 'Theta (Exclusive)' : tier === 'alpha' ? 'Alpha (Premium)' : 'Beta (Premium)') : 'Free'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Member Since</p>
                    <p className="text-[#660033] font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : 'Unknown'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Email Status</p>
                    <p className={`font-medium ${user.emailVerified ? 'text-[#28a745]' : 'text-[#B8860B]'}`}>
                      {user.emailVerified ? 'Verified' : 'Pending Verification'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <ChangePasswordForm />
                </div>
                <div
                  className="rounded-[20px] p-5 sm:p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                    >
                      <Shield size={20} className="text-[#F7E6CA]" />
                    </div>
                    <h3 className="text-lg font-bold">Email Verification</h3>
                  </div>
                  {user.emailVerified ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(40,167,69,0.1)] border border-[rgba(40,167,69,0.2)]">
                      <Check size={20} className="text-[#28a745]" />
                      <span className="text-[#28a745] font-medium">Email verified</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-[rgba(102,0,51,0.6)]">
                        Your email is not verified yet. Please check your inbox for the verification link.
                      </p>
                      <button
                        onClick={handleResendVerification}
                        className="px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
                        data-testid="button-resend-verification"
                      >
                        Resend Verification Email
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Management */}
              {isPremium && (
                <div
                  className="mt-6 rounded-[20px] p-5 sm:p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                    >
                      <CreditCard size={20} className="text-[#F7E6CA]" />
                    </div>
                    <h3 className="text-lg font-bold">Subscription</h3>
                  </div>
                  <p className="text-sm text-[rgba(102,0,51,0.6)] mb-4">
                    Manage your subscription, update payment methods, view invoices, or cancel your plan.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://billing.stripe.com/p/login/3cI28j6m93QU8Jg7Je4Rq00"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
                      data-testid="button-manage-subscription"
                    >
                      Manage Subscription
                    </a>
                    {tier === 'beta' && (
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all"
                        data-testid="button-upgrade-alpha"
                      >
                        <Sparkles size={16} />
                        Upgrade to Alpha
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Settings - Stripe Connect */}
              <div
                className="mt-6 rounded-[20px] p-5 sm:p-7"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                  >
                    <DollarSign size={20} className="text-[#F7E6CA]" />
                  </div>
                  <h3 className="text-lg font-bold">Payment Settings</h3>
                </div>
                <p className="text-sm text-[rgba(102,0,51,0.6)] mb-4">
                  Connect your Stripe account to receive payments when fans purchase your music tracks.
                </p>

                {stripeConnectLoading ? (
                  <div className="flex items-center gap-2 text-[rgba(102,0,51,0.5)]">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Loading payment status...</span>
                  </div>
                ) : stripeConnectData?.connected && stripeConnectData?.onboardingComplete ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(40,167,69,0.1)] border border-[rgba(40,167,69,0.2)]">
                      <Check size={20} className="text-[#28a745]" />
                      <div>
                        <span className="text-[#28a745] font-medium block">Stripe account connected</span>
                        <span className="text-xs text-[rgba(40,167,69,0.8)]">
                          {stripeConnectData.chargesEnabled && stripeConnectData.payoutsEnabled
                            ? 'Ready to receive payments'
                            : 'Account setup in progress'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleStripeConnectDashboard}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
                    >
                      <ExternalLink size={16} />
                      Open Stripe Dashboard
                    </button>
                  </div>
                ) : stripeConnectData?.connected && !stripeConnectData?.onboardingComplete ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(184,134,11,0.1)] border border-[rgba(184,134,11,0.2)]">
                      <Loader2 size={20} className="text-[#B8860B]" />
                      <div>
                        <span className="text-[#B8860B] font-medium block">Onboarding incomplete</span>
                        <span className="text-xs text-[rgba(184,134,11,0.8)]">
                          Complete your Stripe account setup to receive payments
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleConnectStripe}
                      disabled={stripeConnectLoading2}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all disabled:opacity-50"
                    >
                      {stripeConnectLoading2 ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink size={16} />
                          Complete Setup
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-[rgba(102,0,51,0.5)]">
                      You haven't connected a Stripe account yet. Connect one to start receiving payments for your music sales.
                    </p>
                    <button
                      onClick={handleConnectStripe}
                      disabled={stripeConnectLoading2}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all disabled:opacity-50"
                    >
                      {stripeConnectLoading2 ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <DollarSign size={16} />
                          Connect Stripe Account
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div
                className="mt-8 rounded-[20px] p-7"
                style={{ background: 'rgba(220, 53, 69, 0.05)', border: '1px solid rgba(220, 53, 69, 0.2)' }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(220,53,69,0.1)]">
                    <Trash2 size={20} className="text-[#dc3545]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#dc3545]">Danger Zone</h3>
                </div>
                <p className="text-sm text-[rgba(102,0,51,0.6)] mb-4">
                  Once you delete your account, there is no going back. Your account will be
                  scheduled for permanent deletion after a 30-day grace period.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-6 py-3 bg-[#dc3545] text-white rounded-xl font-semibold text-sm hover:bg-[#c82333] transition-all"
                  data-testid="button-delete-account"
                >
                  Delete Account
                </button>
              </div>
            </>
          )}

          {showDeleteModal && (
            <DeleteAccountModal
              onClose={() => setShowDeleteModal(false)}
              onDeleted={handleAccountDeleted}
            />
          )}

          {showUpgradeModal && (
            <UpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
            />
          )}

          {/* Split Management Modal */}
          {splitsModalTrack && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[rgba(102,0,51,0.1)] flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#660033]">
                      Collaborator Splits
                    </h2>
                    <p className="text-sm text-[rgba(102,0,51,0.6)]">
                      "{splitsModalTrack.title}"
                    </p>
                  </div>
                  <button
                    onClick={() => setSplitsModalTrack(null)}
                    className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.1)] transition-colors"
                  >
                    <X size={20} className="text-[rgba(102,0,51,0.6)]" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {trackSplitsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin text-[#660033]" size={32} />
                    </div>
                  ) : trackSplits.length > 0 ? (
                    <div className="space-y-6">
                      {/* Show verification status */}
                      <SplitVerificationStatus
                        track={splitsModalTrack}
                        splits={trackSplits}
                        ownerSplitPercentage={splitsModalTrack.ownerSplitPercentage || 100}
                        autoPublishAt={splitsModalTrack.autoPublishAt}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* No splits yet - show registration form */}
                      <SplitRegistrationForm
                        track={splitsModalTrack}
                        existingSplits={[]}
                        onSuccess={() => {
                          // Refresh tracks list and close modal
                          queryClient.invalidateQueries({ queryKey: ['/api/landing-page/tracks'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/tracks', splitsModalTrack.id, 'splits'] });
                          setSplitsModalTrack(null);
                        }}
                        onCancel={() => setSplitsModalTrack(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      </div>
    </div>
  );
}
