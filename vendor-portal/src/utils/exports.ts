// Document builders shared by list and detail pages.
import type { CaseRecord, Invoice, Payment, VendorProfile } from '@/types';
import { buildDocumentHtml, downloadFile } from './download';
import { formatCurrency, formatDate, formatDateTime } from './format';

export function downloadCaseSummary(c: CaseRecord): void {
  const html = buildDocumentHtml(`Case Summary — ${c.id}`, `${c.service} · ${c.status}`, [
    {
      heading: 'Case',
      rows: [
        ['Case ID', c.id],
        ['Service', c.service],
        ['Status', c.status],
        ['Priority', c.priority],
        ['Request date', formatDateTime(c.requestDate)],
        ['Scheduled', formatDateTime(c.scheduledDate)],
        ['Assigned team', c.assignedTeam],
      ],
    },
    { heading: 'Transfer', rows: [['Pickup', c.pickup], ['Destination', c.destination]] },
    { heading: 'Patient', rows: [['Patient', c.patientName], ['Patient ID', c.patientId]] },
    { heading: 'Notes', rows: [['Notes', c.notes || '—']] },
  ]);
  downloadFile(`${c.id}-summary.html`, html, 'text/html;charset=utf-8');
}

export function downloadInvoice(inv: Invoice, profile?: VendorProfile | null): void {
  const html = buildDocumentHtml(`Tax Invoice ${inv.id}`, `Status: ${inv.status}`, [
    {
      heading: 'Bill To',
      rows: [
        ['Company', profile?.company.companyName ?? '—'],
        ['Vendor ID', profile?.vendorId ?? '—'],
        ['Address', profile ? `${profile.company.address}, ${profile.company.city} ${profile.company.pincode}` : '—'],
      ],
    },
    {
      heading: 'Invoice',
      rows: [
        ['Invoice number', inv.id],
        ['Case ID', inv.caseId],
        ['Service', inv.service],
        ['Invoice date', formatDate(inv.date)],
        ['Due date', formatDate(inv.dueDate)],
        ['Amount', formatCurrency(inv.amount, inv.currency)],
        ['Currency', inv.currency],
        ['Status', inv.status],
      ],
    },
  ], 'Payable to HumanCare Worldwide within 30 days of the invoice date. This is a computer-generated document.');
  downloadFile(`${inv.id}.html`, html, 'text/html;charset=utf-8');
}

export function downloadReceipt(p: Payment, profile?: VendorProfile | null): void {
  const html = buildDocumentHtml(`Payment Receipt ${p.id}`, `For invoice ${p.invoiceId}`, [
    {
      heading: 'Payment',
      rows: [
        ['Receipt number', p.id],
        ['Invoice', p.invoiceId],
        ['Paid on', formatDateTime(p.date)],
        ['Method', p.method],
        ['Reference', p.reference],
        ['Amount', formatCurrency(p.amount, p.currency)],
        ['Status', p.status],
      ],
    },
    { heading: 'Received From', rows: [['Company', profile?.company.companyName ?? '—'], ['Vendor ID', profile?.vendorId ?? '—']] },
  ]);
  downloadFile(`${p.id}-receipt.html`, html, 'text/html;charset=utf-8');
}
