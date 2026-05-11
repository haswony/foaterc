import { formatMoney, currencySymbol } from './format';

export type ReceiptData = {
  amount: number;
  paidAt: string | Date;
  note?: string | null;
  customerName: string;
  customerPhone?: string | null;
  debtAmount?: number;
  debtRemaining?: number;
  currency?: string;
  storeName?: string;
  storePhone?: string | null;
  paymentId?: string;
};

function fmt(d: string | Date) {
  const dt = new Date(d);
  return dt.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Print a 58/80mm thermal receipt by opening a popup with focused CSS and triggering window.print().
 */
export function printThermalReceipt(d: ReceiptData) {
  const w = window.open('', '_blank', 'width=380,height=700');
  if (!w) return;
  const sym = currencySymbol(d.currency);
  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>وصل دفع</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Tahoma', 'Arial', sans-serif;
    font-variant-numeric: lining-nums tabular-nums;
    margin: 0;
    padding: 8mm 6mm;
    width: 80mm;
    color: #000;
    font-size: 13px;
    line-height: 1.4;
  }
  h1 { font-size: 16px; margin: 0 0 2px; text-align: center; }
  .muted { color: #555; text-align: center; font-size: 11px; }
  .divider { border-top: 1px dashed #999; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 0; vertical-align: top; }
  td.label { color: #555; }
  td.value { text-align: left; font-weight: bold; direction: ltr; }
  .big {
    font-size: 22px;
    font-weight: 900;
    text-align: center;
    margin: 8px 0;
    padding: 6px;
    border: 2px solid #000;
    border-radius: 6px;
    direction: ltr;
  }
  .center { text-align: center; }
  .small { font-size: 10px; color: #777; }
  .footer { margin-top: 12px; text-align: center; font-size: 11px; color: #555; }
  @media print { body { padding: 4mm 3mm; } }
</style>
</head>
<body>
  <h1>${d.storeName || 'وصل دفع'}</h1>
  ${d.storePhone ? `<div class="muted" dir="ltr">${d.storePhone}</div>` : ''}
  <div class="muted">${fmt(d.paidAt)}</div>
  <div class="divider"></div>
  <table>
    <tr><td class="label">الزبون</td><td class="value">${escapeHtml(d.customerName)}</td></tr>
    ${d.customerPhone ? `<tr><td class="label">الهاتف</td><td class="value" dir="ltr">${escapeHtml(d.customerPhone)}</td></tr>` : ''}
    ${
      d.debtAmount != null
        ? `<tr><td class="label">قيمة الدين</td><td class="value">${formatMoney(d.debtAmount)} ${sym}</td></tr>`
        : ''
    }
  </table>
  <div class="divider"></div>
  <div class="center muted" style="margin-bottom:4px">المبلغ المدفوع</div>
  <div class="big">${formatMoney(d.amount)} ${sym}</div>
  ${
    d.debtRemaining != null
      ? `<table><tr><td class="label">المتبقي بعد الدفع</td><td class="value">${formatMoney(d.debtRemaining)} ${sym}</td></tr></table>`
      : ''
  }
  ${d.note ? `<div class="muted" style="margin-top:6px">ملاحظة: ${escapeHtml(d.note)}</div>` : ''}
  ${d.paymentId ? `<div class="small center" style="margin-top:6px">رقم الوصل: ${escapeHtml(d.paymentId)}</div>` : ''}
  <div class="divider"></div>
  <div class="footer">شكراً لتعاملكم معنا</div>
  <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 400); };</script>
</body>
</html>`;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
