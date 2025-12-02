// Design Tab - Theme, Colors, Fonts, Buttons, Background
// Story 9.10: Landing Page Editor Redesign

import { ThemeSelector } from '@/components/landing/ThemeSelector';
import { ColorPicker } from '@/components/landing/ColorPicker';
import { FontSelector } from '@/components/landing/FontSelector';
import { ButtonStylePicker } from '@/components/landing/ButtonStylePicker';
import { BackgroundEditor } from '@/components/landing/BackgroundEditor';
import type { ThemePreset, ButtonStyle, BackgroundType, BackgroundOverlay } from '@shared/themes';

// WCAG contrast ratio calculation
function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)?.map(c => {
    const val = parseInt(c, 16) / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  }) || [0, 0, 0];
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface DesignTabProps {
  landingPageData: {
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
  };
  onUpdate: (updates: Record<string, unknown>) => void;
  onImageUpload: (file: File) => Promise<string>;
}

export function DesignTab({ landingPageData, onUpdate, onImageUpload }: DesignTabProps) {
  return (
    <div className="space-y-6">
      {/* Theme Selector */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Theme Presets</h4>
        <ThemeSelector
          selectedThemeId={landingPageData.themeId}
          onThemeSelect={(theme: ThemePreset) => {
            onUpdate({
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
      </div>

      {/* Custom Colors */}
      <div className="p-4 rounded-xl bg-white/60">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-[#660033]">Custom Colors</h4>
          {landingPageData.themeId && (
            <span className="text-xs text-[rgba(102,0,51,0.5)]">
              Theme: {landingPageData.themeId}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ColorPicker
            label="Primary"
            value={landingPageData.primaryColor || '#660033'}
            onChange={(color) => onUpdate({ primaryColor: color, themeId: null })}
          />
          <ColorPicker
            label="Secondary"
            value={landingPageData.secondaryColor || '#F7E6CA'}
            onChange={(color) => onUpdate({ secondaryColor: color, themeId: null })}
          />
          <ColorPicker
            label="Accent"
            value={landingPageData.accentColor || '#FFD700'}
            onChange={(color) => onUpdate({ accentColor: color, themeId: null })}
          />
          <ColorPicker
            label="Text"
            value={landingPageData.textColor || '#FFFFFF'}
            onChange={(color) => onUpdate({ textColor: color, themeId: null })}
          />
        </div>

        {/* WCAG Contrast Warning */}
        {(() => {
          const textColor = landingPageData.textColor || '#FFFFFF';
          const bgColor = landingPageData.primaryColor || '#660033';
          const ratio = getContrastRatio(textColor, bgColor);
          if (ratio < 4.5) {
            return (
              <div className="mt-3 p-2 rounded-lg bg-[rgba(255,193,7,0.15)] border border-[rgba(255,193,7,0.3)]">
                <p className="text-xs text-[#B8860B] font-medium">
                  Low contrast: {ratio.toFixed(1)}:1 (WCAG AA: 4.5:1)
                </p>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Fonts */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Fonts</h4>
        <div className="grid grid-cols-2 gap-3">
          <FontSelector
            label="Heading"
            value={landingPageData.headingFont || 'Inter'}
            onChange={(font) => onUpdate({ headingFont: font })}
          />
          <FontSelector
            label="Body"
            value={landingPageData.bodyFont || 'Inter'}
            onChange={(font) => onUpdate({ bodyFont: font })}
          />
        </div>
        {/* Font preview */}
        <div className="mt-3 p-3 rounded-lg bg-white border border-[rgba(102,0,51,0.1)]">
          <p className="text-xs text-[rgba(102,0,51,0.5)] mb-1">Preview</p>
          <h5
            className="text-lg font-bold"
            style={{ fontFamily: `"${landingPageData.headingFont || 'Inter'}", system-ui, sans-serif` }}
          >
            Heading
          </h5>
          <p
            className="text-sm"
            style={{ fontFamily: `"${landingPageData.bodyFont || 'Inter'}", system-ui, sans-serif` }}
          >
            Body text preview
          </p>
        </div>
      </div>

      {/* Button Style */}
      <div className="p-4 rounded-xl bg-white/60">
        <ButtonStylePicker
          value={(landingPageData.buttonStyle as ButtonStyle) || 'rounded'}
          onChange={(style) => onUpdate({ buttonStyle: style })}
          primaryColor={landingPageData.primaryColor || '#660033'}
          secondaryColor={landingPageData.secondaryColor || '#F7E6CA'}
        />
      </div>

      {/* Background */}
      <div className="p-4 rounded-xl bg-white/60">
        <h4 className="text-sm font-bold text-[#660033] mb-4">Background</h4>
        <BackgroundEditor
          backgroundType={(landingPageData.backgroundType as BackgroundType) || 'solid'}
          backgroundValue={landingPageData.backgroundValue || '#660033'}
          backgroundOverlay={(landingPageData.backgroundOverlay as BackgroundOverlay) || 'none'}
          onBackgroundTypeChange={(type) => onUpdate({ backgroundType: type })}
          onBackgroundValueChange={(value) => onUpdate({ backgroundValue: value })}
          onBackgroundOverlayChange={(overlay) => onUpdate({ backgroundOverlay: overlay })}
          onImageUpload={onImageUpload}
        />
      </div>
    </div>
  );
}
