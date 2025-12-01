import { useMemo } from 'react';

interface HighlightTextProps {
  text: string;
  highlight: string;
  className?: string;
}

/**
 * Utility to escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Component that highlights matching text within a string.
 * AC-6: Highlight matching terms in results
 */
export function HighlightText({ text, highlight, className = '' }: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!highlight.trim()) {
      return [{ text, isMatch: false }];
    }

    const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi');
    const splitParts = text.split(regex);

    return splitParts.map((part) => ({
      text: part,
      isMatch: regex.test(part) && part.toLowerCase() === highlight.toLowerCase()
    }));
  }, [text, highlight]);

  // Reset regex lastIndex for subsequent tests
  const regex = highlight.trim() ? new RegExp(`(${escapeRegex(highlight)})`, 'gi') : null;

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = regex ? part.text.toLowerCase() === highlight.toLowerCase() : false;
        return isMatch ? (
          <mark
            key={index}
            className="bg-[rgba(255,193,7,0.4)] text-[#660033] px-0.5 rounded"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        );
      })}
    </span>
  );
}
