import { AlignCenter, AlignLeft, AlignRight, Maximize2, Minimize2, Square } from "lucide-react";

export type Layout = "centered" | "left" | "right";
export type AvatarPosition = "top" | "left" | "hidden";
export type LinkWidth = "full" | "medium" | "compact";

interface LayoutOption {
  id: Layout;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface LinkWidthOption {
  id: LinkWidth;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: "centered", name: "Centered", description: "Content centered on page", icon: <AlignCenter className="w-5 h-5" /> },
  { id: "left", name: "Left Aligned", description: "Content aligned to left", icon: <AlignLeft className="w-5 h-5" /> },
  { id: "right", name: "Right Aligned", description: "Content aligned to right", icon: <AlignRight className="w-5 h-5" /> },
];

export const LINK_WIDTHS: LinkWidthOption[] = [
  { id: "full", name: "Full Width", description: "100% container width", icon: <Maximize2 className="w-5 h-5" /> },
  { id: "medium", name: "Medium", description: "80% container width", icon: <Square className="w-5 h-5" /> },
  { id: "compact", name: "Compact", description: "60% container width", icon: <Minimize2 className="w-5 h-5" /> },
];

interface LayoutSelectorProps {
  layout: Layout;
  linkWidth: LinkWidth;
  onLayoutChange: (layout: Layout) => void;
  onLinkWidthChange: (width: LinkWidth) => void;
}

export function LayoutSelector({
  layout,
  linkWidth,
  onLayoutChange,
  onLinkWidthChange,
}: LayoutSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Page Layout */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-3">
          Page Layout
        </label>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onLayoutChange(option.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                layout === option.id
                  ? "border-[#660033] bg-[rgba(102,0,51,0.05)]"
                  : "border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]"
              }`}
            >
              <div className={layout === option.id ? "text-[#660033]" : "text-[rgba(102,0,51,0.4)]"}>
                {option.icon}
              </div>
              <span className={`text-xs font-medium ${layout === option.id ? "text-[#660033]" : "text-[rgba(102,0,51,0.6)]"}`}>
                {option.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Link Width */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-3">
          Link Width
        </label>
        <div className="grid grid-cols-3 gap-2">
          {LINK_WIDTHS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onLinkWidthChange(option.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                linkWidth === option.id
                  ? "border-[#660033] bg-[rgba(102,0,51,0.05)]"
                  : "border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]"
              }`}
            >
              <div className={linkWidth === option.id ? "text-[#660033]" : "text-[rgba(102,0,51,0.4)]"}>
                {option.icon}
              </div>
              <span className={`text-xs font-medium ${linkWidth === option.id ? "text-[#660033]" : "text-[rgba(102,0,51,0.6)]"}`}>
                {option.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
