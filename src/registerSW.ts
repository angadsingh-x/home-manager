// Register the service worker in production builds. We skip dev because vite's
// HMR doesn't play nicely with cached assets.
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    const url = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(url).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}
