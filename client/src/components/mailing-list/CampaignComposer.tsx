import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  Clock,
  Send,
  Loader2,
  Trash2,
  X,
  Users,
} from 'lucide-react';
import type { EmailCampaign } from '@shared/schema';

interface CampaignComposerProps {
  campaignId?: string;
  onBack: () => void;
}

interface SubscribersResponse {
  subscribers: unknown[];
  counts: {
    total: number;
    active: number;
    unsubscribed: number;
  };
}

export function CampaignComposer({ campaignId, onBack }: CampaignComposerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [body, setBody] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Load existing campaign if editing
  const { data: campaign, isLoading: loadingCampaign } = useQuery<EmailCampaign>({
    queryKey: ['/api/mailing-list/campaigns', campaignId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/mailing-list/campaigns/${campaignId}`);
      return res.json();
    },
    enabled: !!campaignId,
  });

  // Get subscriber count
  const { data: subscriberData } = useQuery<SubscribersResponse>({
    queryKey: ['/api/mailing-list/subscribers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/mailing-list/subscribers');
      return res.json();
    },
  });

  const activeSubscriberCount = subscriberData?.counts?.active ?? 0;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setBody(editor.getHTML());
    },
  });

  // Populate form when campaign data loads
  useEffect(() => {
    if (campaign && !initialized && editor) {
      setSubject(campaign.subject);
      setPreviewText(campaign.previewText || '');
      setBody(campaign.body);
      editor.commands.setContent(campaign.body);
      setInitialized(true);
    }
  }, [campaign, initialized, editor]);

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string; previewText?: string }) => {
      const res = await apiRequest('POST', '/api/mailing-list/campaigns', data);
      return res.json() as Promise<EmailCampaign>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/campaigns'] });
      toast({ title: 'Campaign created', description: 'Your draft has been saved.' });
      onBack();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create campaign.' });
    },
  });

  // Update campaign mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { subject?: string; body?: string; previewText?: string }) => {
      await apiRequest('PATCH', `/api/mailing-list/campaigns/${campaignId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/campaigns'] });
      toast({ title: 'Campaign saved', description: 'Your changes have been saved.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save campaign.' });
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/mailing-list/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/campaigns'] });
      toast({ title: 'Campaign deleted', description: 'The campaign has been removed.' });
      onBack();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete campaign.' });
    },
  });

  // Send campaign mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/mailing-list/campaigns/${campaignId}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/campaigns'] });
      toast({ title: 'Campaign sent', description: 'Your campaign is being sent to subscribers.' });
      onBack();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send campaign.' });
    },
  });

  // Schedule campaign mutation
  const scheduleMutation = useMutation({
    mutationFn: async (scheduledFor: string) => {
      await apiRequest('POST', `/api/mailing-list/campaigns/${campaignId}/schedule`, { scheduledFor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/campaigns'] });
      toast({ title: 'Campaign scheduled', description: 'Your campaign has been scheduled.' });
      setShowScheduleModal(false);
      onBack();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to schedule campaign.' });
    },
  });

  // Cancel schedule mutation
  const cancelScheduleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/mailing-list/campaigns/${campaignId}/cancel-schedule`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/campaigns', campaignId] });
      toast({ title: 'Schedule cancelled', description: 'The campaign has been moved back to draft.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to cancel schedule.' });
    },
  });

  const handleSaveDraft = useCallback(() => {
    if (!subject.trim()) {
      toast({ title: 'Missing subject', description: 'Please enter a subject line.' });
      return;
    }
    const payload = {
      subject: subject.trim(),
      body: body || '<p></p>',
      previewText: previewText.trim() || undefined,
    };
    if (campaignId) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }, [subject, body, previewText, campaignId]);

  const handleSchedule = useCallback(() => {
    if (!scheduleDate || !scheduleTime) {
      toast({ title: 'Select date and time', description: 'Please pick when to send the campaign.' });
      return;
    }
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    scheduleMutation.mutate(scheduledFor);
  }, [scheduleDate, scheduleTime]);

  const handleSendNow = useCallback(() => {
    sendMutation.mutate();
    setShowSendConfirm(false);
  }, []);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canSend = campaignId && (campaign?.status === 'draft' || campaign?.status === 'scheduled');
  const isScheduled = campaign?.status === 'scheduled';

  if (campaignId && loadingCampaign) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#660033]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-[rgba(102,0,51,0.9)]">
            {campaignId ? 'Edit Campaign' : 'New Campaign'}
          </h2>
          {campaign?.status && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              campaign.status === 'draft' ? 'bg-gray-100 text-gray-600' :
              campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {campaignId && (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          {isScheduled && (
            <button
              onClick={() => cancelScheduleMutation.mutate()}
              disabled={cancelScheduleMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[rgba(102,0,51,0.6)] border border-[rgba(102,0,51,0.15)] hover:bg-[rgba(102,0,51,0.05)] transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel Schedule
            </button>
          )}
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[rgba(102,0,51,0.7)] border border-[rgba(102,0,51,0.15)] hover:bg-[rgba(102,0,51,0.05)] transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          {canSend && (
            <>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[rgba(102,0,51,0.7)] border border-[rgba(102,0,51,0.15)] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              >
                <Clock className="w-4 h-4" />
                Schedule
              </button>
              <button
                onClick={() => setShowSendConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#660033] text-white hover:bg-[#7a1a4a] transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recipient Count */}
      <div className="flex items-center gap-2 text-sm text-[rgba(102,0,51,0.5)]">
        <Users className="w-4 h-4" />
        <span>{activeSubscriberCount} active subscriber{activeSubscriberCount !== 1 ? 's' : ''} will receive this email</span>
      </div>

      {/* Subject & Preview Text */}
      <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[rgba(102,0,51,0.7)] mb-1.5">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter your email subject..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-[rgba(102,0,51,0.15)] text-[rgba(102,0,51,0.9)] placeholder:text-[rgba(102,0,51,0.3)] focus:outline-none focus:ring-2 focus:ring-[rgba(102,0,51,0.2)] focus:border-transparent transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[rgba(102,0,51,0.5)] mb-1.5">
            Preview Text <span className="font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Short preview shown in inbox..."
            className="w-full px-3.5 py-2 rounded-lg border border-[rgba(102,0,51,0.1)] text-[rgba(102,0,51,0.8)] placeholder:text-[rgba(102,0,51,0.25)] focus:outline-none focus:ring-2 focus:ring-[rgba(102,0,51,0.15)] focus:border-transparent transition-all text-xs"
          />
        </div>
      </div>

      {/* TipTap Editor */}
      <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-[rgba(102,0,51,0.08)] flex-wrap">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold') ?? false}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic') ?? false}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive('underline') ?? false}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-[rgba(102,0,51,0.1)] mx-1" />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor?.isActive('heading', { level: 1 }) ?? false}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive('heading', { level: 2 }) ?? false}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-[rgba(102,0,51,0.1)] mx-1" />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList') ?? false}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList') ?? false}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-[rgba(102,0,51,0.1)] mx-1" />
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            active={editor?.isActive({ textAlign: 'left' }) ?? false}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            active={editor?.isActive({ textAlign: 'center' }) ?? false}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            active={editor?.isActive({ textAlign: 'right' }) ?? false}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Editor Content */}
        <div className="min-h-[300px] px-5 py-4">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none min-h-[280px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] text-[rgba(102,0,51,0.85)]"
          />
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[rgba(102,0,51,0.9)]">Schedule Campaign</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg text-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[rgba(102,0,51,0.7)] mb-1.5">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[rgba(102,0,51,0.15)] text-[rgba(102,0,51,0.9)] focus:outline-none focus:ring-2 focus:ring-[rgba(102,0,51,0.2)] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgba(102,0,51,0.7)] mb-1.5">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[rgba(102,0,51,0.15)] text-[rgba(102,0,51,0.9)] focus:outline-none focus:ring-2 focus:ring-[rgba(102,0,51,0.2)] focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={scheduleMutation.isPending || !scheduleDate || !scheduleTime}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#660033] text-white hover:bg-[#7a1a4a] transition-colors disabled:opacity-50"
              >
                {scheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-[rgba(102,0,51,0.9)] mb-2">Send Campaign Now?</h3>
            <p className="text-sm text-[rgba(102,0,51,0.6)] mb-1">
              This will send "<strong>{subject}</strong>" to {activeSubscriberCount} active subscriber{activeSubscriberCount !== 1 ? 's' : ''}.
            </p>
            <p className="text-xs text-[rgba(102,0,51,0.4)] mb-5">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSendConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNow}
                disabled={sendMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#660033] text-white hover:bg-[#7a1a4a] transition-colors disabled:opacity-50"
              >
                {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Toolbar button sub-component
function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-[rgba(102,0,51,0.1)] text-[#660033]'
          : 'text-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.05)] hover:text-[rgba(102,0,51,0.7)]'
      }`}
    >
      {children}
    </button>
  );
}
