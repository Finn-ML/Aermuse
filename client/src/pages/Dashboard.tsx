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
import { ThemeSelector } from '@/components/landing/ThemeSelector';
import { useTemplates } from '@/hooks/useTemplates';
import type { ThemePreset } from '@shared/themes';
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
  Inbox
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showAddContract, setShowAddContract] = useState(false);
  const [showUploadContract, setShowUploadContract] = useState(false);
  const [newContract, setNewContract] = useState({ name: '', type: 'publishing', partnerName: '', value: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  // Configure drag sensor with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Templates for proposal-to-contract flow (Story 7.6)
  const { templates } = useTemplates();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/auth');
    }
  }, [user, authLoading, setLocation]);

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

  // Fetch unread proposal count for badge (Story 7.4)
  const { data: proposalCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/proposals/unread-count'],
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
  const unreadProposalCount = proposalCountData?.count || 0;

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

  const createContractMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; partnerName: string; value: string }) => {
      const res = await apiRequest('POST', '/api/contracts', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setShowAddContract(false);
      setNewContract({ name: '', type: 'publishing', partnerName: '', value: '' });
      toast({ title: "Contract added", description: "Your contract has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create contract.", variant: "destructive" });
    },
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
      toast({ title: "Landing page updated" });
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: { title: string; url: string }) => {
      const res = await apiRequest('POST', '/api/landing-page/links', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landing-page'] });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; enabled?: boolean; title?: string; url?: string }) => {
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
    setCreatingContractFromProposal(true);
    createContractFromProposalMutation.mutate({
      proposalId: selectedProposalId,
      templateId: template.id,
    });
  };

  const handleViewContractFromProposal = (contractId: string) => {
    // Navigate to contracts section
    setActiveNav('contracts');
    setSelectedProposalId(null);
    // Ideally we'd select the contract, but for now just navigate to contracts
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
    { id: 'templates' as NavId, label: 'Templates', icon: Layout },
    { id: 'proposals' as NavId, label: 'Proposals', icon: Mail, badge: unreadProposalCount > 0 ? unreadProposalCount : undefined },
    { id: 'landing' as NavId, label: 'Landing Page', icon: ExternalLink },
    { id: 'settings' as NavId, label: 'Settings', icon: Settings }
  ];

  const stats = [
    { label: 'Active Contracts', value: contracts.filter(c => c.status === 'active').length.toString(), change: '+2 this month', trend: 'up' },
    { label: 'Pending Review', value: contracts.filter(c => c.status === 'pending').length.toString(), change: 'Needs attention', trend: 'up' },
    { label: 'Page Views', value: '14.2K', change: '+8.3%', trend: 'up' },
    { label: 'Total Value', value: `$${contracts.reduce((acc, c) => acc + (parseInt(c.value?.replace(/[^0-9]/g, '') || '0')), 0).toLocaleString()}`, change: 'All contracts', trend: 'up' }
  ];

  const upcomingEvents = [
    { title: 'Contract Renewal Due', date: 'Dec 1, 2025', type: 'contract' },
    { title: 'Fan Meetup - LA', date: 'Dec 5, 2025', type: 'event' },
    { title: 'Royalty Payment', date: 'Dec 15, 2025', type: 'payment' }
  ];

  const landingPageStats = [
    { label: 'Total Views', value: '14,247' },
    { label: 'Unique Visitors', value: '8,392' },
    { label: 'Avg. Time on Page', value: '2m 34s' },
    { label: 'Click Rate', value: '12.4%' }
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
      case 'event': return <Calendar size={18} />;
      case 'payment': return <DollarSign size={18} />;
      default: return null;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'contract': return 'bg-[rgba(102,0,51,0.1)] text-[#660033]';
      case 'event': return 'bg-[rgba(40,167,69,0.15)] text-[#28a745]';
      case 'payment': return 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]';
      default: return '';
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

  return (
    <div className="min-h-screen bg-[#F7E6CA] text-[#660033] flex flex-col relative">
      <style>{`
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }
      `}</style>

      <GrainOverlay />

      {/* Email Verification Banner */}
      {user && !user.emailVerified && (
        <VerificationBanner onResend={handleResendVerification} />
      )}

      <div className="flex flex-1">
      <aside 
        className={`w-[280px] flex flex-col fixed top-0 left-0 h-screen z-20 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderRight: '1px solid rgba(102, 0, 51, 0.08)',
          padding: '32px 20px'
        }}
      >
        <Link href="/">
          <div className="text-2xl font-light tracking-[0.25em] lowercase mb-12 pl-5 cursor-pointer">
            aermuse
          </div>
        </Link>

        <nav className="flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl cursor-pointer transition-all duration-300 font-medium text-[15px] mb-1 ${
                  activeNav === item.id
                    ? 'bg-[#660033] text-[#F7E6CA]'
                    : 'text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.06)] hover:text-[#660033]'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <Icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {'badge' in item && item.badge !== undefined && (
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
              <div className="text-xs text-[rgba(102,0,51,0.5)]">{user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' ? 'Premium' : 'Free Plan'}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-[280px] flex flex-col min-h-screen">
        <header 
          className={`h-20 flex items-center justify-between px-10 sticky top-0 z-50 transition-opacity duration-500 delay-100 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: 'rgba(247, 230, 202, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(102, 0, 51, 0.08)'
          }}
        >
          <div>
            <h1 className="text-2xl font-bold mb-0.5" data-testid="text-page-title">
              {activeNav === 'dashboard' && `Welcome back, ${user.name?.split(' ')[0] || 'Artist'}`}
              {activeNav === 'contracts' && 'Contract Manager'}
              {activeNav === 'templates' && 'Contract Templates'}
              {activeNav === 'proposals' && 'Proposals'}
              {activeNav === 'landing' && 'Landing Page'}
              {activeNav === 'settings' && 'Settings'}
            </h1>
            <p className="text-sm text-[rgba(102,0,51,0.6)] font-medium">
              {activeNav === 'dashboard' && "Here's what's happening with your music career"}
              {activeNav === 'contracts' && 'Manage, analyze, and sign your contracts with AI assistance'}
              {activeNav === 'templates' && 'Select a template to create a new contract'}
              {activeNav === 'proposals' && 'Review and respond to proposals from your landing page'}
              {activeNav === 'landing' && 'Customize your artist page and manage your links'}
              {activeNav === 'settings' && 'Manage your account and security settings'}
            </p>
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
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all" data-testid="button-profile-settings">
                  <User size={18} />
                  Profile Settings
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-all" data-testid="button-account-settings">
                  <Settings size={18} />
                  Account Settings
                </button>
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

        <main 
          className={`flex-1 p-10 transition-all duration-500 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        >
          {activeNav === 'dashboard' && (
            <>
              <div className="grid grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="rounded-[20px] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(102,0,51,0.08)]"
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                    data-testid={`card-stat-${index}`}
                  >
                    <div className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-3">
                      {stat.label}
                    </div>
                    <div className="text-[32px] font-bold mb-2">
                      {stat.value}
                    </div>
                    <div className="text-[13px] font-semibold text-[#28a745] flex items-center gap-1">
                      <TrendingUp size={14} />
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Awaiting Signatures Section */}
              <div className="mb-8">
                <AwaitingSignatureList maxItems={3} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div 
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Recent Contracts</h3>
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
                    <div className="space-y-4">
                      {contracts.slice(0, 3).map((contract) => (
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
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Upcoming</h3>
                  </div>
                  <div className="space-y-4">
                    {upcomingEvents.map((event, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-4 py-4 border-b border-[rgba(102,0,51,0.06)] last:border-0"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getEventColor(event.type)}`}>
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <div className="font-semibold text-[15px] mb-1">{event.title}</div>
                          <div className="text-[13px] text-[rgba(102,0,51,0.5)]">{event.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === 'contracts' && (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 -mx-10 -mt-10 -mb-10">
              {/* Folder Sidebar */}
              <FolderSidebar
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
              />

              {/* Main Content */}
              <div className="flex-1 p-10">
              {/* Header with action buttons */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#660033]">
                  {selectedFolder === null ? 'All Contracts' : selectedFolder === 'unfiled' ? 'Unfiled Contracts' : 'Contracts'}
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUploadContract(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(102,0,51,0.15)] transition-all"
                    data-testid="button-upload-contract"
                  >
                    <Upload size={18} />
                    Upload Contract
                  </button>
                  <button
                    onClick={() => setShowAddContract(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
                    data-testid="button-add-contract"
                  >
                    <Plus size={18} />
                    Add Contract
                  </button>
                </div>
              </div>

              {/* Search Bar and Sort (Story 8.6) */}
              <div className="flex items-center gap-4 mb-4">
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
                      setShowUploadContract(false);
                      toast({ title: "Contract uploaded", description: `${contract.fileName || contract.name} has been uploaded.` });
                    }}
                    onCancel={() => setShowUploadContract(false)}
                  />
                </div>
              )}

              {showAddContract && (
                <div
                  className="rounded-[20px] p-7 mb-6"
                  style={{ background: 'rgba(255, 255, 255, 0.8)', border: '2px solid rgba(102, 0, 51, 0.1)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">New Contract</h3>
                    <button onClick={() => setShowAddContract(false)} className="text-[rgba(102,0,51,0.5)] hover:text-[#660033]">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <input
                      type="text"
                      placeholder="Contract Name"
                      value={newContract.name}
                      onChange={(e) => setNewContract({ ...newContract, name: e.target.value })}
                      className="px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none"
                      data-testid="input-contract-name"
                    />
                    <select
                      value={newContract.type}
                      onChange={(e) => setNewContract({ ...newContract, type: e.target.value })}
                      className="px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none"
                      data-testid="select-contract-type"
                    >
                      <option value="publishing">Publishing</option>
                      <option value="distribution">Distribution</option>
                      <option value="sync_license">Sync License</option>
                      <option value="management">Management</option>
                      <option value="record_deal">Record Deal</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Partner Name"
                      value={newContract.partnerName}
                      onChange={(e) => setNewContract({ ...newContract, partnerName: e.target.value })}
                      className="px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none"
                      data-testid="input-partner-name"
                    />
                    <input
                      type="text"
                      placeholder="Contract Value"
                      value={newContract.value}
                      onChange={(e) => setNewContract({ ...newContract, value: e.target.value })}
                      className="px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none"
                      data-testid="input-contract-value"
                    />
                  </div>
                  <button
                    onClick={() => createContractMutation.mutate(newContract)}
                    disabled={createContractMutation.isPending || !newContract.name}
                    className="px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
                    data-testid="button-save-contract"
                  >
                    {createContractMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                    Save Contract
                  </button>
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
                      className="rounded-[20px] p-6 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(102,0,51,0.08)]"
                      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                      data-testid={`contract-${contract.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div 
                            className="w-14 h-14 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                          >
                            <FileText size={24} className="text-[#F7E6CA]" />
                          </div>
                          <div>
                            <Link
                              href={`/contracts/${contract.id}`}
                              className="font-bold text-lg mb-1 hover:text-[#660033] hover:underline cursor-pointer transition-colors"
                            >
                              <HighlightText text={contract.name} highlight={searchQuery} />
                            </Link>
                            <div className="text-sm text-[rgba(102,0,51,0.5)]">
                              <HighlightText text={contract.partnerName || 'No partner specified'} highlight={searchQuery} /> • {contract.type?.replace('_', ' ')}
                              {contract.fileName && (
                                <span className="ml-2 text-[rgba(102,0,51,0.4)]">
                                  • {contract.fileType?.toUpperCase()} {contract.fileSize ? `(${(contract.fileSize / 1024 / 1024).toFixed(2)} MB)` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {contract.value && (
                            <div className="text-right mr-4">
                              <div className="font-bold">{contract.value}</div>
                              <div className="text-xs text-[rgba(102,0,51,0.5)]">Value</div>
                            </div>
                          )}
                          <span className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] ${getStatusClass(contract.status)}`}>
                            {contract.status}
                          </span>
                          <div className="flex gap-2">
                            {(contract.filePath || contract.renderedContent) && (
                              <a
                                href={contract.filePath ? `/api/contracts/${contract.id}/download` : `/api/contracts/${contract.id}/pdf`}
                                className="p-2.5 rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                                title={`Download ${contract.fileName || 'contract'} as PDF`}
                                data-testid={`button-download-${contract.id}`}
                              >
                                <Download size={18} />
                              </a>
                            )}
                            {!!contract.aiAnalysis && (
                              <a
                                href={`/api/contracts/${contract.id}/pdf`}
                                className="p-2.5 rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                                title="Download PDF Summary"
                                data-testid={`button-pdf-${contract.id}`}
                              >
                                <FileDown size={18} />
                              </a>
                            )}
                            {contract.aiAnalysis ? (
                              <Link
                                href={`/contracts/${contract.id}`}
                                className="p-2.5 rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                                title="View Analysis"
                                data-testid={`button-view-${contract.id}`}
                              >
                                <Eye size={18} />
                              </Link>
                            ) : (
                              <button
                                onClick={() => analyzeContractMutation.mutate(contract.id)}
                                disabled={analyzeContractMutation.isPending && analyzeContractMutation.variables === contract.id}
                                className="p-2.5 rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all disabled:opacity-50"
                                title="AI Analysis"
                                data-testid={`button-analyze-${contract.id}`}
                              >
                                {analyzeContractMutation.isPending && analyzeContractMutation.variables === contract.id ? (
                                  <Loader2 size={18} className="animate-spin" />
                                ) : (
                                  <Sparkles size={18} />
                                )}
                              </button>
                            )}
                            {contract.status === 'pending' && (
                              <button
                                onClick={() => signContractMutation.mutate(contract.id)}
                                disabled={signContractMutation.isPending}
                                className="p-2.5 rounded-xl bg-[#28a745] text-white hover:bg-[#218838] transition-all"
                                title="Sign Contract"
                                data-testid={`button-sign-${contract.id}`}
                              >
                                <Check size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setMoveContractModal({
                                contractId: contract.id,
                                contractName: contract.name,
                                currentFolderId: contract.folderId || null,
                              })}
                              className="p-2.5 rounded-xl bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                              title="Move to Folder"
                              data-testid={`button-move-${contract.id}`}
                            >
                              <FolderInput size={18} />
                            </button>
                            <button
                              onClick={() => deleteContractMutation.mutate(contract.id)}
                              disabled={deleteContractMutation.isPending}
                              className="p-2.5 rounded-xl bg-[rgba(220,53,69,0.1)] text-[#dc3545] hover:bg-[rgba(220,53,69,0.2)] transition-all"
                              title="Delete"
                              data-testid={`button-delete-${contract.id}`}
                            >
                              <Trash2 size={18} />
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
            previewFormData && selectedTemplate ? (
              <ContractPreview
                template={selectedTemplate}
                formData={previewFormData}
                onBack={() => setPreviewFormData(null)}
                onContractCreated={(contractId) => {
                  toast({
                    title: 'Contract Created',
                    description: 'Your contract has been saved as a draft.',
                  });
                  setSelectedTemplate(null);
                  setPreviewFormData(null);
                  // Switch to contracts view
                  setActiveNav('contracts');
                  // Refresh contracts list
                  queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
                }}
              />
            ) : selectedTemplate ? (
              <TemplateForm
                template={selectedTemplate}
                onBack={() => setSelectedTemplate(null)}
                onPreview={(formData) => {
                  setPreviewFormData(formData);
                }}
              />
            ) : (
              <TemplateGallery
                onSelectTemplate={(template) => {
                  setSelectedTemplate(template);
                }}
              />
            )
          )}

          {activeNav === 'landing' && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {landingPageStats.map((stat, index) => (
                  <div 
                    key={index}
                    className="rounded-[16px] p-5"
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-2">
                      {stat.label}
                    </div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div 
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Page Settings</h3>
                    {landingPageData?.isPublished ? (
                      <span className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase bg-[rgba(40,167,69,0.15)] text-[#28a745]">Published</span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase bg-[rgba(255,193,7,0.15)] text-[#B8860B]">Draft</span>
                    )}
                  </div>

                  {landingPageLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-[#660033]" size={24} />
                    </div>
                  ) : landingPageData ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">Artist Name</label>
                        <input
                          type="text"
                          value={landingPageData.artistName || ''}
                          onChange={(e) => updateLandingPageMutation.mutate({ artistName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none"
                          data-testid="input-artist-name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">Tagline</label>
                        <input
                          type="text"
                          value={landingPageData.tagline || ''}
                          onChange={(e) => updateLandingPageMutation.mutate({ tagline: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none"
                          placeholder="Your tagline..."
                          data-testid="input-tagline"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">Bio</label>
                        <textarea
                          value={landingPageData.bio || ''}
                          onChange={(e) => updateLandingPageMutation.mutate({ bio: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none min-h-[100px] resize-none"
                          placeholder="Tell your story..."
                          data-testid="input-bio"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => updateLandingPageMutation.mutate({ isPublished: !landingPageData.isPublished })}
                          className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                            landingPageData.isPublished
                              ? 'bg-[rgba(220,53,69,0.1)] text-[#dc3545] hover:bg-[rgba(220,53,69,0.2)]'
                              : 'bg-[#660033] text-[#F7E6CA] hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)]'
                          }`}
                          data-testid="button-toggle-publish"
                        >
                          {landingPageData.isPublished ? 'Unpublish' : 'Publish Page'}
                        </button>
                        {landingPageData.isPublished && (
                          <a
                            href={`/artist/${landingPageData.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 rounded-xl font-semibold text-sm bg-[rgba(102,0,51,0.1)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all flex items-center gap-2"
                            data-testid="link-view-page"
                          >
                            <ExternalLink size={16} />
                            View Page
                          </a>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Your Links</h3>
                    <button 
                      onClick={() => createLinkMutation.mutate({ title: 'New Link', url: 'https://example.com' })}
                      className="flex items-center gap-2 text-sm font-semibold text-[#660033]"
                      data-testid="button-add-link"
                    >
                      <Plus size={16} />
                      Add Link
                    </button>
                  </div>

                  {landingPageLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-[#660033]" size={24} />
                    </div>
                  ) : landingPageData?.links?.length === 0 ? (
                    <p className="text-sm text-[rgba(102,0,51,0.5)] text-center py-8">No links yet. Add your first link!</p>
                  ) : (
                    <div className="space-y-3">
                      {landingPageData?.links?.map((link) => (
                        <div 
                          key={link.id}
                          className="flex items-center justify-between p-4 rounded-xl"
                          style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-sm mb-0.5">{link.title}</div>
                            <div className="text-xs text-[rgba(102,0,51,0.5)]">{link.url}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateLinkMutation.mutate({ id: link.id, enabled: !link.enabled })}
                              className={`w-12 h-6 rounded-full transition-all ${link.enabled ? 'bg-[#660033]' : 'bg-[rgba(102,0,51,0.2)]'}`}
                              data-testid={`toggle-link-${link.id}`}
                            >
                              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${link.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                            <button
                              onClick={() => deleteLinkMutation.mutate(link.id)}
                              className="p-1.5 rounded-lg text-[rgba(102,0,51,0.4)] hover:text-[#dc3545] hover:bg-[rgba(220,53,69,0.1)] transition-all"
                              data-testid={`delete-link-${link.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Theme Selector Section (Epic 9) */}
              <div
                className="rounded-[20px] p-7 mt-6"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
              >
                <h3 className="text-lg font-bold mb-6">Page Theme</h3>
                {landingPageData && (
                  <ThemeSelector
                    selectedThemeId={landingPageData.themeId}
                    onThemeSelect={(theme: ThemePreset) => {
                      updateLandingPageMutation.mutate({
                        themeId: theme.id,
                        primaryColor: theme.primaryColor,
                        secondaryColor: theme.secondaryColor,
                        accentColor: theme.accentColor,
                        textColor: theme.textColor,
                        headingFont: theme.headingFont,
                        bodyFont: theme.bodyFont,
                        buttonStyle: theme.buttonStyle,
                        backgroundType: theme.backgroundType,
                        backgroundValue: theme.backgroundValue,
                        backgroundOverlay: theme.backgroundOverlay,
                      });
                    }}
                  />
                )}
              </div>
            </>
          )}

          {activeNav === 'proposals' && (
            selectedProposalId && selectedProposal ? (
              // Proposal Detail View
              proposalDetailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-[#660033]" size={32} />
                </div>
              ) : (
                <>
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
                      <h2 className="text-2xl font-bold text-[#660033] mb-2">Select a Template</h2>
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
              </>
              )
            ) : (
              // Proposals List View
              <div className="space-y-6">
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
              </div>
            )
          )}

          {activeNav === 'settings' && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <ChangePasswordForm />
                </div>
                <div
                  className="rounded-[20px] p-7"
                  style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                    >
                      <User size={20} className="text-[#F7E6CA]" />
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
        </main>
      </div>
      </div>
    </div>
  );
}
