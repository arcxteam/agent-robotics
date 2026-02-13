/**
 * Shared WebSocket URL detection for all environments:
 * - Vscode: direct connection to port 3003
 * - Localhost: direct connection to port 3003
 * - Production: same origin (nginx proxies /socket.io/ to port 3003)
 */
export function getWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    // SSR: use env var or default to localhost
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    return 'http://localhost:3003';
  }

  const hostname = window.location.hostname;

  // Vscode/GitHub.dev: connect directly to port 3003 URL
  // Vscode URL format: {name}-{port}.app.github.dev
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

  // Production: return origin URL (same domain).
  // nginx proxies /socket.io/ requests to the WebSocket server on port 3003.
  // Socket.IO client will use default path /socket.io/ which nginx intercepts.
  // Do NOT append /ws — that would create a Socket.IO namespace "/ws" which doesn't exist on the server.
  return `${window.location.protocol}//${hostname}`;
}
