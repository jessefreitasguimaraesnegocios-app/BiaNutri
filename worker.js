/**
 * Worker mínimo para o check "Workers Builds: bianutri" passar no GitHub.
 * O app real (React/Vite) está em bia-nutri.vercel.app.
 */
export default {
  async fetch(request) {
    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  },
};
