export interface SharePayload {
  title: string;
  text: string;
  url: string;
  files?: File[];
}

interface ShareNavigator {
  share?: (data: SharePayload) => Promise<void>;
  canShare?: (data: SharePayload) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

export async function shareVehicle(payload: SharePayload, browserNavigator: ShareNavigator = navigator): Promise<ShareResult> {
  if (typeof browserNavigator.share === 'function') {
    try {
      const nativePayload = payload.files?.length && browserNavigator.canShare && !browserNavigator.canShare(payload)
        ? { ...payload, files: undefined }
        : payload;
      await browserNavigator.share(nativePayload);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  if (browserNavigator.clipboard?.writeText) {
    try {
      const clipboardText = payload.url && !payload.text.includes(payload.url)
        ? `${payload.text}\n\n${payload.url}`
        : payload.text || payload.url;
      await browserNavigator.clipboard.writeText(clipboardText);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }

  return 'unavailable';
}
