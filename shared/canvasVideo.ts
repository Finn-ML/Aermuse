/** Versioned manifest; legacy pages with only webm/mp4/poster remain supported. */
export interface CanvasSources { webm?: string; mp4?: string }
export interface CanvasVideoData extends CanvasSources {
  version?: number;
  mobile?: CanvasSources;
  poster?: string;
  duration?: number;
}

export function parseCanvasVideo(value: string | null | undefined): CanvasVideoData | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const sources = (item: any): CanvasSources => ({
      webm: typeof item?.webm === 'string' ? item.webm : undefined,
      mp4: typeof item?.mp4 === 'string' ? item.mp4 : undefined,
    });
    return { version: typeof data.version === 'number' ? data.version : undefined, ...sources(data), mobile: data.mobile ? sources(data.mobile) : undefined,
      poster: typeof data.poster === 'string' ? data.poster : undefined,
      duration: typeof data.duration === 'number' ? data.duration : undefined };
  } catch { return null; }
}

export function selectCanvasSources(data: CanvasVideoData, mobile: boolean): CanvasSources {
  return mobile && (data.mobile?.webm || data.mobile?.mp4) ? data.mobile : data;
}
