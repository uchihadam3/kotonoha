/**
 * Where the game is running. Inside a frame (an embedded/published page) the browser refuses downloads,
 * the microphone and service workers, so a few features change their behaviour there.
 */
export const EMBEDDED: boolean = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

/** where the installable versions live */
export const HOME_URL = 'https://uchihadam3.github.io/kotonoha/';
export const RELEASES_URL = 'https://github.com/uchihadam3/kotonoha/releases/latest';
