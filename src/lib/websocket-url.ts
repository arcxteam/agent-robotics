/**
 * Shared WebSocket URL detection for all environments:
 * - Codespaces: direct connection to port 3003 (auto-forwarded by Codespaces)
 * - Localhost: direct connection to port 3003
 * - Production: env var or nginx proxy path
 */
export function getWebSocketUrl(): string {
  // Production: use env var if set to a real domain
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  if (typeof window === 'undefined') return 'http://localhost:3003';

  const hostname = window.location.hostname;

  // Codespaces/GitHub.dev: connect directly to port 3003 URL
  // Codespaces URL format: {name}-{port}.app.github.dev
  // Replace the port number in the hostname to point to WebSocket server port
  if (hostname.includes('.app.github.dev')) {
    const wsHostname = hostname.replace(/-\d+\.app\.github\.dev$/, '-3003.app.github.dev');
    return `${window.location.protocol}//${wsHostname}`;
  }

  // Local development: direct connection
  const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '3003';
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
    return `http://localhost:${wsPort}`;
  }

  // Production with nginx proxy
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${hostname}/ws`;
}
