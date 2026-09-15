self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Mantém a navegação controlada sem armazenar conteúdo antigo do estoque.
});
