const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/receiptHtml.ts'), 'utf8');
const moduleObject = { exports: {} };
const barcodeModule = {exports:{}};
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/receiptBarcode.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(barcodeModule.exports, barcodeModule);
new Function('exports', 'module', 'require', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText) (moduleObject.exports, moduleObject, name => { assert.equal(name,'./receiptBarcode'); return barcodeModule.exports; });
const sale = { id: '315bf5e1-0000-4000-8000-000000000000', cashierName: 'Cashier <A>', createdAt: '2026-10-28T00:00:00Z', rateSnapshot: 4100,
  totalUsd: 1, totalKhr: 4100, tenderAmount: 2, tenderCurrency: 'USD', changeText: '4,100 ៛',
  items: [{ productName: '<script>alert(1)</script>', quantity: 1, unitPriceUsd: 1, lineTotalUsd: 1 }] };
for (const width of [58, 80]) {
  const html = moduleObject.exports.receiptHtml(sale, width);
  assert(html.includes(`width:${width}mm`));
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;script&gt;'));
  assert(html.includes('4,100 ៛'));
  assert(!html.includes('SPLIT'));
  assert(html.includes('07:00:00'));
  assert(html.includes('Cashier &lt;A&gt;'));
  assert(html.includes('<svg'));
  assert(html.includes('315BF5E1')); 
}
console.log('Receipt width, escaping, persisted change and content checks passed.');
