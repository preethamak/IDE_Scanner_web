const ACCOUNT_AUTH_OVERLAY_MARKER = 'data-account-auth-overlay-fix="true"';

const ACCOUNT_AUTH_OVERLAY_FIX = `<style ${ACCOUNT_AUTH_OVERLAY_MARKER}>.accountModern{padding-bottom:180px!important}@media (max-width:560px){.accountModern{padding-bottom:240px!important}}aside[aria-label="Analytics cookie consent"]{pointer-events:none!important}aside[aria-label="Analytics cookie consent"] button,aside[aria-label="Analytics cookie consent"] a{pointer-events:auto!important}</style>`;

export function rewriteAccountDocument(html: string): string {
  if (html.includes(ACCOUNT_AUTH_OVERLAY_MARKER) || !html.includes("</head>")) {
    return html;
  }

  return html.replace("</head>", `${ACCOUNT_AUTH_OVERLAY_FIX}</head>`);
}
