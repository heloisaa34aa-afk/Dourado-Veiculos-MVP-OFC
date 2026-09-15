export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

interface ShareNavigator {
  share?: (data: SharePayload) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

export async function shareVehicle(payload: SharePayload, browserNavigator: ShareNavigator = navigator): Promise<ShareResult> {
  if (typeof browserNavigator.share === 'function') {
    try {
      await browserNavigator.share(payload);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  if (browserNavigator.clipboard?.writeText) {
    try {
      await browserNavigator.clipboard.writeText(payload.url);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }

  return 'unavailable';
}
