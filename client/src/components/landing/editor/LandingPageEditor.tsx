// Landing Page Editor - Tabbed interface with live preview
// Story 9.10: Landing Page Editor Redesign

import { useState, useEffect, useCallback } from 'react';
import { Palette, Link, Share2, Settings, Loader2, Save } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DesignTab } from './DesignTab';
import { LinksTab } from './LinksTab';
import { SocialTab } from './SocialTab';
import { SettingsTab } from './SettingsTab';
import { EditorPreview } from './EditorPreview';
import type { SocialIcon } from '@/components/landing/SocialIconsEditor';

const EDITOR_TABS = [
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'links', label: 'Links', icon: Link },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type TabId = typeof EDITOR_TABS[number]['id'];

interface LandingPageLink {
  id: string;
  title: string;
  url: string;
  enabled: boolean | null;
  order?: string | null;
  type?: string | null;
  videoUrl?: string | null;
}

interface LandingPageData {
  id?: string;
  artistName?: string | null;
  tagline?: string | null;
  bio?: string | null;
  slug?: string | null;
  avatarUrl?: string | null;
  isPublished?: boolean | null;
  themeId?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  textColor?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  buttonStyle?: string | null;
  backgroundType?: string | null;
  backgroundValue?: string | null;
  backgroundOverlay?: string | null;
  socialIcons?: SocialIcon[] | null;
  showSocialBar?: boolean | null;
  layout?: string | null;
  avatarPosition?: string | null;
  linkWidth?: string | null;
  links?: LandingPageLink[];
}

interface LandingPageEditorProps {
  landingPageData: LandingPageData;
  isPro: boolean;
  isSaving: boolean;
  onUpdate: (updates: Record<string, unknown>) => void;
  onCreateLink: (data: { title: string; url: string; type?: string; videoUrl?: string }) => void;
  onUpdateLink: (data: { id: string; enabled?: boolean; title?: string; url?: string; order?: string }) => void;
  onDeleteLink: (id: string) => void;
  onImageUpload: (file: File) => Promise<string>;
  onNavigateToUpgrade: () => void;
}

export function LandingPageEditor({
  landingPageData,
  isPro,
  isSaving,
  onUpdate,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onImageUpload,
  onNavigateToUpgrade,
}: LandingPageEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('design');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcut for save (Cmd/Ctrl+S)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      // Trigger save via onUpdate with empty object (will cause re-fetch)
      // Note: The actual save happens immediately via mutations in Dashboard
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving]);

  const links = landingPageData.links || [];

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] gap-4">
      {/* Editor Panel */}
      <div className="w-1/2 flex flex-col rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        {/* Tabs Header */}
        <div className="p-4 border-b border-[rgba(102,0,51,0.1)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#660033]">Editor</h3>
            {isSaving && (
              <div className="flex items-center gap-2 text-xs text-[rgba(102,0,51,0.5)]">
                <Loader2 size={12} className="animate-spin" />
                Saving...
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          {isMobile ? (
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITOR_TABS.map(tab => (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2">
                      <tab.icon size={14} />
                      {tab.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
              <TabsList className="w-full grid grid-cols-4 bg-[rgba(102,0,51,0.05)]">
                {EDITOR_TABS.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:text-[#660033]"
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'design' && (
            <DesignTab
              landingPageData={landingPageData}
              onUpdate={onUpdate}
              onImageUpload={onImageUpload}
            />
          )}
          {activeTab === 'links' && (
            <LinksTab
              links={links}
              isPro={isPro}
              onCreateLink={onCreateLink}
              onUpdateLink={onUpdateLink}
              onDeleteLink={onDeleteLink}
              onNavigateToUpgrade={onNavigateToUpgrade}
            />
          )}
          {activeTab === 'social' && (
            <SocialTab
              icons={(landingPageData.socialIcons as SocialIcon[]) || []}
              showSocialBar={landingPageData.showSocialBar !== false}
              onIconsChange={(icons) => onUpdate({ socialIcons: icons })}
              onShowSocialBarChange={(show) => onUpdate({ showSocialBar: show })}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              landingPageData={landingPageData}
              onUpdate={onUpdate}
            />
          )}
        </div>

        {/* Status Bar */}
        <div className="p-3 border-t border-[rgba(102,0,51,0.1)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {landingPageData.isPublished ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[rgba(40,167,69,0.15)] text-[#28a745]">
                Published
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[rgba(255,193,7,0.15)] text-[#B8860B]">
                Draft
              </span>
            )}
          </div>
          <span className="text-xs text-[rgba(102,0,51,0.4)]">
            Cmd/Ctrl+S to save
          </span>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="w-1/2 rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <EditorPreview
          page={landingPageData}
          links={links}
        />
      </div>
    </div>
  );
}
