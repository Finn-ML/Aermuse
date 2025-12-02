// Video URL parser for embedding YouTube, Vimeo, and Spotify content
// Story 9.9: Video Embeds (Pro Feature)

export type VideoPlatform = 'youtube' | 'vimeo' | 'spotify';

export interface VideoEmbed {
  platform: VideoPlatform;
  embedUrl: string;
  aspectRatio: '16:9' | '1:1';
  thumbnailUrl?: string;
}

/**
 * Parse a video URL and return embed information
 * Supports: YouTube, Vimeo, Spotify (tracks and albums)
 */
export function parseVideoUrl(url: string): VideoEmbed | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  // YouTube - multiple formats
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const ytMatch = trimmedUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      aspectRatio: '16:9',
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
    };
  }

  // Vimeo
  // https://vimeo.com/123456789
  // https://player.vimeo.com/video/123456789
  const vimeoMatch = trimmedUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch) {
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      aspectRatio: '16:9',
    };
  }

  // Spotify Track
  // https://open.spotify.com/track/TRACK_ID
  const spotifyTrackMatch = trimmedUrl.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (spotifyTrackMatch) {
    return {
      platform: 'spotify',
      embedUrl: `https://open.spotify.com/embed/track/${spotifyTrackMatch[1]}?utm_source=generator`,
      aspectRatio: '1:1',
    };
  }

  // Spotify Album
  // https://open.spotify.com/album/ALBUM_ID
  const spotifyAlbumMatch = trimmedUrl.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
  if (spotifyAlbumMatch) {
    return {
      platform: 'spotify',
      embedUrl: `https://open.spotify.com/embed/album/${spotifyAlbumMatch[1]}?utm_source=generator`,
      aspectRatio: '1:1',
    };
  }

  // Spotify Playlist
  // https://open.spotify.com/playlist/PLAYLIST_ID
  const spotifyPlaylistMatch = trimmedUrl.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (spotifyPlaylistMatch) {
    return {
      platform: 'spotify',
      embedUrl: `https://open.spotify.com/embed/playlist/${spotifyPlaylistMatch[1]}?utm_source=generator`,
      aspectRatio: '1:1',
    };
  }

  return null;
}

/**
 * Check if a URL is from a supported video platform
 */
export function isSupportedVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

/**
 * Get the platform name from a URL
 */
export function getVideoPlatform(url: string): VideoPlatform | null {
  const embed = parseVideoUrl(url);
  return embed?.platform ?? null;
}
