// Social Tab - Social Icons Editor
// Story 9.10: Landing Page Editor Redesign

import { SocialIconsEditor, type SocialIcon } from '@/components/landing/SocialIconsEditor';

interface SocialTabProps {
  icons: SocialIcon[];
  showSocialBar: boolean;
  onIconsChange: (icons: SocialIcon[]) => void;
  onShowSocialBarChange: (show: boolean) => void;
}

export function SocialTab({
  icons,
  showSocialBar,
  onIconsChange,
  onShowSocialBarChange,
}: SocialTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Social Icons</h4>
        <SocialIconsEditor
          icons={icons}
          showSocialBar={showSocialBar}
          onIconsChange={onIconsChange}
          onShowSocialBarChange={onShowSocialBarChange}
        />
      </div>
    </div>
  );
}
