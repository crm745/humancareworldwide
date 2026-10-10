// Client-side downloads: CSV exports and generated HTML documents (case summaries, invoices).

export function downloadFile(filename: string, content: BlobPart, mime = 'text/plain;charset=utf-8'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCSV(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','));
  // BOM so Excel opens UTF-8 (₹, names) correctly.
  downloadFile(filename, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Minimal branded, printable HTML document. */
export function buildDocumentHtml(title: string, subtitle: string, sections: { heading: string; rows: [string, string][] }[], footer = ''): string {
  const body = sections
    .map(
      (s) => `<h2>${esc(s.heading)}</h2><table>${s.rows
        .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
        .join('')}</table>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;color:#0B1B33;max-width:760px;margin:40px auto;padding:0 24px}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1A5BE0;padding-bottom:12px}
.brand{font-weight:800;font-size:20px;color:#1A5BE0}.muted{color:#64748B;font-size:13px}
h1{font-size:22px;margin:24px 0 4px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#1648BE;margin:28px 0 8px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:14px}
th{width:38%;color:#475569;font-weight:600}footer{margin-top:36px;font-size:12px;color:#64748B}</style></head>
<body><header><div class="brand">HumanCare Worldwide</div><div class="muted">Vendor / Corporate Portal</div></header>
<h1>${esc(title)}</h1><div class="muted">${esc(subtitle)}</div>${body}
<footer>${esc(footer || `Generated on ${new Date().toLocaleString('en-GB')} from the HumanCare Worldwide Vendor Portal.`)}</footer></body></html>`;
}
