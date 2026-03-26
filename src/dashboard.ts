/**
 * Generates the HTML status dashboard that mimics Herd's Integrations tab.
 * Served at GET /dashboard in HTTP mode.
 */

export interface IntegrationInfo {
  title: string;
  subtitle: string;
  isConnected: boolean;
  details?: string[];
  icon: 'forge' | 'claude';
}

export function renderDashboard(integrations: IntegrationInfo[], port: number): string {
  const rows = integrations.map(renderRow).join('\n');
  const lastUpdated = new Date().toLocaleTimeString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Integrations — Laravel Herd</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #f9f9f9;
      --panel-bg: #ffffff;
      --border: #e5e7eb;
      --text: #374151;
      --text-light: #6b7280;
      --text-heading: #111827;
      --accent: #ef4444;
      --connected-bg: #d1fae5;
      --connected-text: #065f46;
      --connected-dot: #10b981;
      --disconnected-bg: #f3f4f6;
      --disconnected-text: #6b7280;
      --disconnected-dot: #d1d5db;
      --hover: #f9fafb;
      --shadow: 0 1px 3px rgba(0,0,0,.08);
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --panel-bg: #1f2937;
        --border: #374151;
        --text: #d1d5db;
        --text-light: #9ca3af;
        --text-heading: #f9fafb;
        --hover: #374151;
        --shadow: 0 1px 3px rgba(0,0,0,.3);
        --disconnected-bg: #374151;
        --disconnected-text: #9ca3af;
      }
    }

    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 0;
    }

    .titlebar {
      background: var(--panel-bg);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      height: 52px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .titlebar-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 13px;
      color: var(--text-heading);
    }

    .titlebar-logo svg { flex-shrink: 0; }

    .nav {
      display: flex;
      gap: 0;
      margin-left: 20px;
    }

    .nav-item {
      padding: 0 14px;
      height: 52px;
      display: flex;
      align-items: center;
      font-size: 13px;
      color: var(--text-light);
      border-bottom: 2px solid transparent;
      cursor: default;
      text-decoration: none;
    }

    .nav-item.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      font-weight: 500;
    }

    .content {
      max-width: 700px;
      margin: 0 auto;
      padding: 24px 24px 48px;
    }

    .section-desc {
      font-size: 13px;
      color: var(--text-light);
      margin-bottom: 20px;
      line-height: 1.6;
    }

    .integration-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .integration-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel-bg);
      box-shadow: var(--shadow);
      cursor: default;
      transition: background 0.12s;
    }

    .integration-row:hover { background: var(--hover); }

    .integration-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .integration-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .integration-meta { display: flex; flex-direction: column; gap: 4px; }

    .integration-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-heading);
    }

    .integration-subtitle {
      font-size: 12px;
      color: var(--text-light);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 20px;
      font-weight: 500;
    }

    .status-badge.connected {
      background: var(--connected-bg);
      color: var(--connected-text);
    }

    .status-badge.disconnected {
      background: var(--disconnected-bg);
      color: var(--disconnected-text);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot.connected { background: var(--connected-dot); }
    .status-dot.disconnected { background: var(--disconnected-dot); }

    .integration-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .chevron { color: var(--text-light); }

    .footer {
      margin-top: 28px;
      font-size: 11px;
      color: var(--text-light);
      text-align: center;
    }

    .badge-new {
      font-size: 10px;
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 4px;
      padding: 1px 5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .03em;
    }

    @media (prefers-color-scheme: dark) {
      .badge-new { background: #1e3a5f; color: #60a5fa; }
    }
  </style>
</head>
<body>

<div class="titlebar">
  <div class="titlebar-logo">
    <!-- Herd-style Laravel icon -->
    <svg width="20" height="20" viewBox="0 0 196 196" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M341 1602 c-17 -32 -42 -145 -34 -152 4 -4 37 -13 73 -19 147 -25 229 -67 244 -126 6 -23 -125 -552 -156 -629 -29 -72 -88 -113 -202 -142 -36 -9 -70 -21 -75 -28 -10 -12 -41 -125 -41 -150 0 -14 32 -16 305 -16 l305 0 13 23 c8 12 36 105 62 207 25 102 53 195 61 208 14 22 18 22 219 22 204 0 206 0 215 23 11 24 60 219 60 236 0 8 -64 11 -199 11 -152 0 -201 3 -209 13 -9 10 -4 41 17 120 16 58 32 111 36 116 4 7 103 11 298 11 161 0 297 4 303 8 20 13 175 263 169 272 -4 6 -283 10 -730 10 -683 0 -725 -1 -734 -18z" fill="#ef4444" transform="scale(0.1) translate(0, 196) scale(1,-1)"/>
    </svg>
    Laravel Herd
  </div>
  <nav class="nav">
    <span class="nav-item">General</span>
    <span class="nav-item">PHP</span>
    <span class="nav-item">Services</span>
    <span class="nav-item">Node</span>
    <span class="nav-item active">Integrations</span>
  </nav>
</div>

<div class="content">
  <p class="section-desc">
    You can deploy remote sites from various providers to your local applications.
    Claude Code integration provides AI-assisted development tools directly in your editor.
  </p>

  <div class="integration-list">
    ${rows}
  </div>

  <div class="footer">
    laravel-herd-mcp &nbsp;·&nbsp; HTTP/SSE server on port ${port} &nbsp;·&nbsp; Updated ${lastUpdated}
    &nbsp;·&nbsp; <a href="/status" style="color: inherit; opacity:.6; text-decoration:none;">JSON status</a>
  </div>
</div>

</body>
</html>`;
}

function renderRow(integration: IntegrationInfo): string {
  const connected = integration.isConnected;
  const statusClass = connected ? 'connected' : 'disconnected';
  const statusLabel = connected ? 'Connected' : 'Not connected';

  const icon = integration.icon === 'claude'
    ? claudeIcon()
    : forgeIcon();

  const detailsHtml = integration.details && integration.details.length > 0
    ? `<div class="integration-subtitle">${integration.details.join(' &nbsp;·&nbsp; ')}</div>`
    : `<div class="integration-subtitle">${integration.subtitle}</div>`;

  return `
    <div class="integration-row">
      <div class="integration-left">
        <div class="integration-icon">${icon}</div>
        <div class="integration-meta">
          <div class="integration-title">
            ${integration.title}
            ${integration.icon === 'claude' ? '<span class="badge-new">MCP</span>' : ''}
          </div>
          ${detailsHtml}
        </div>
      </div>
      <div class="integration-right">
        <span class="status-badge ${statusClass}">
          <span class="status-dot ${statusClass}"></span>
          ${statusLabel}
        </span>
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>`;
}

function forgeIcon(): string {
  return `<svg width="28" height="28" viewBox="0 0 196 196" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,196) scale(0.1,-0.1)" fill="#ef4444" stroke="none">
      <path d="M341 1602 c-17 -32 -42 -145 -34 -152 4 -4 37 -13 73 -19 147 -25 229 -67 244 -126 6 -23 -125 -552 -156 -629 -29 -72 -88 -113 -202 -142 -36 -9 -70 -21 -75 -28 -10 -12 -41 -125 -41 -150 0 -14 32 -16 305 -16 l305 0 13 23 c8 12 36 105 62 207 25 102 53 195 61 208 14 22 18 22 219 22 204 0 206 0 215 23 11 24 60 219 60 236 0 8 -64 11 -199 11 -152 0 -201 3 -209 13 -9 10 -4 41 17 120 16 58 32 111 36 116 4 7 103 11 298 11 161 0 297 4 303 8 20 13 175 263 169 272 -4 6 -283 10 -730 10 -683 0 -725 -1 -734 -18z"/>
    </g>
  </svg>`;
}

function claudeIcon(): string {
  return `<svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#CC785C"/>
    <text x="50" y="68" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="52" font-weight="700" fill="white">C</text>
  </svg>`;
}
