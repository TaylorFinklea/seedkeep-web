// Client-only SPA: the store is in memory and the shell reads the clock,
// theme and viewport. adapter-static serves index.html as the fallback.
export const ssr = false;
export const prerender = false;
