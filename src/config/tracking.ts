export const DEFAULT_TRACKING_ENDPOINT = 'https://heloisaa34aa-afk--vehicle360-tracking-fastapi-app.modal.run';

export function getTrackingEndpoint() {
  return (import.meta.env.VITE_TRACKING_ENDPOINT || DEFAULT_TRACKING_ENDPOINT)
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/track$/, '');
}
