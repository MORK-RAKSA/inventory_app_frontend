import { receiptBarcode, receiptTime } from './receiptBarcode';
import type { Sale } from './api';
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function receiptHtml(sale: Sale, paper: 58 | 80, fontUrl = '') {
  const khr = (n: number) => Math.round(n).toLocaleString('en-US') + ' ៛';
  return `<!doctype html><html lang="km"><head><meta charset="utf-8"><title>Receipt ${esc(sale.id.slice(0,8))}</title>
  <style>${fontUrl ? `@font-face{font-family:ReceiptKhmer;src:url('${fontUrl}');}` : ''}
  @page{margin:0;size:auto} *{box-sizing:border-box} body{width:${paper}mm;margin:0;padding:3mm;color:#000;background:white;font:11px ReceiptKhmer,'Noto Sans Khmer',sans-serif;line-height:1.6}
  h1{font-size:19px;margin:0} .center{text-align:center}.line{display:flex;justify-content:space-between;gap:8px}.rule{border-top:1px dashed #000;margin:8px 0}.total{font-size:17px;font-weight:bold} table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{padding:5px 0;vertical-align:top;overflow-wrap:anywhere}th{text-align:left;border-bottom:1px dashed #000}.amount{text-align:right;width:32%}.qty{width:14%;text-align:center} tr{break-inside:avoid}small{font-size:9px} .footer{margin-top:12px;font-size:10px;overflow-wrap:anywhere} @media print{body{margin:0} .total,.footer{break-inside:avoid}}
  </style></head><body><header class="center"><h1>EasySell</h1><div>បង្កាន់ដៃ / RECEIPT</div></header><div class="rule"></div>
  <div>លេខ / No: ${esc(sale.id.slice(0,8).toUpperCase())}</div><div>${esc(receiptTime(sale.createdAt))} ICT</div><div>អ្នកគិតលុយ / Cashier: ${esc(sale.cashierName || "—")}</div>
  <div>${sale.priceTier === 'WHOLESALE' ? 'លក់ដុំ / Wholesale' : 'លក់រាយ / Retail'}</div>
  <table><thead><tr><th>ទំនិញ / Item</th><th class="qty">Qty</th><th class="amount">KHR</th></tr></thead><tbody>${sale.items.map(i=>`<tr><td>${esc(i.productName)}<br><small>${esc(khr(i.unitPriceUsd*sale.rateSnapshot))} / unit${i.uom ? '<br>'+esc(i.uom):''}</small></td><td class="qty">${esc(i.quantity)}</td><td class="amount">${esc(khr(i.lineTotalUsd*sale.rateSnapshot))}</td></tr>`).join('')}</tbody></table>
  <div class="rule"></div><div class="line total"><span>សរុប / Total</span><span>${esc(khr(sale.totalKhr))}</span></div><div class="line"><span>USD</span><span>$${sale.totalUsd.toFixed(2)}</span></div>
  ${sale.tenderAmount != null ? `<div class="rule"></div><div class="line"><span>ប្រាក់ទទួល / Received</span><span>${sale.tenderCurrency==='USD'?'$'+sale.tenderAmount.toFixed(2):esc(khr(sale.tenderAmount))}</span></div><div class="line"><span>ប្រាក់អាប់ / Change</span><span>${esc(sale.changeText || (sale.changeKhr != null?khr(sale.changeKhr):''))}</span></div>`:''}
  <div class="rule"></div><div>1 USD = ${esc(khr(sale.rateSnapshot))}</div><div class="center" style="margin-top:14px">${receiptBarcode(sale.id)}<small>${esc(sale.id.slice(0,8).toUpperCase())}</small></div><footer class="center footer">សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត<br>Thank you. Please come again.<br>${esc(sale.id)}</footer></body></html>`;
}
