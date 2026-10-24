import React, { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  CheckCircle2,
  Printer,
  ReceiptText,
  Share2,
  Store,
  X,
} from 'lucide-react-native';
import { Sale } from '../api';
import { getUsername } from '../auth';
import { Btn, C, IconBadge, khr, money, shadow } from '../ui';
import { Press } from '../motion';
import { useLanguage } from '../i18n';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!
  );

export function getItemPackagingTag(i: Sale['items'][0], priceTier?: string): string {
  if (i.cases && i.cases > 0) {
    const caseName = i.caseUnitName || 'Case';
    const baseName = i.baseUnit || 'pcs';
    if (i.loose && i.loose > 0) {
      return `${i.cases} ${caseName} + ${i.loose} ${baseName}`;
    }
    return `${i.cases} ${caseName}`;
  }
  if (i.uom) return i.uom;
  if (i.isWholesale || priceTier === 'WHOLESALE') return 'Wholesale';
  return '';
}

function generateBarcodeBars(seed: string): number[] {
  const bars: number[] = [2, 1, 2, 1];
  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i);
    bars.push((code % 3) + 1);
    bars.push(((code >> 2) % 2) + 1);
  }
  bars.push(2, 1, 2);
  return bars.slice(0, 42);
}

function receiptHtml(s: Sale, cashier: string) {
  const totalUnits = s.items.reduce((acc, i) => acc + i.quantity, 0);
  const receiptNo = s.id.slice(0, 8).toUpperCase();
  const dt = new Date(s.createdAt).toLocaleString();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Receipt #${esc(receiptNo)}</title>
<style>
  @page { margin: 4mm; }
  body {
    font-family: 'Courier New', Courier, 'Hanuman', 'Khmer OS Battambang', monospace;
    width: 300px;
    margin: 0 auto;
    padding: 12px 10px;
    color: #111827;
    background: #FFFFFF;
    font-size: 12px;
    line-height: 1.45;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .brand-kh { font-size: 20px; font-weight: 800; margin: 0; }
  .sub { font-size: 11px; color: #4B5563; }
  .dash { border-top: 1.5px dashed #374151; margin: 8px 0; }
  .double-dash { border-top: 2px double #111827; margin: 8px 0; }
  .meta-row { display: flex; justify-content: space-between; font-size: 11.5px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th { text-align: left; font-size: 11px; padding: 4px 0; border-bottom: 1.5px dashed #374151; }
  td { padding: 6px 0; vertical-align: top; border-bottom: 1px dotted #D1D5DB; }
  .total-box {
    background: #F8F6FF;
    border: 1.5px solid #6946B8;
    border-radius: 8px;
    padding: 10px 12px;
    margin: 10px 0;
  }
  .grand-khr { font-size: 24px; font-weight: 900; color: #241A3F; text-align: center; margin: 6px 0; }
  .barcode {
    text-align: center;
    letter-spacing: 3px;
    font-size: 10px;
    margin-top: 10px;
  }
</style>
</head>
<body>
  <div class="center">
    <div class="brand-kh">គ្រប់ហាង · EasySell</div>
    <div class="sub">បង្កាន់ដៃទូទាត់ប្រាក់ / OFFICIAL POS RECEIPT</div>
    <div class="sub">Phnom Penh, Cambodia</div>
  </div>
  <div class="double-dash"></div>
  <div class="meta-row"><span>RECEIPT NO:</span><span class="bold">#${esc(receiptNo)}</span></div>
  <div class="meta-row"><span>DATE/TIME:</span><span>${esc(dt)}</span></div>
  <div class="meta-row"><span>CASHIER:</span><span>${esc(cashier || 'Admin')}</span></div>
  <div class="meta-row"><span>TENDER:</span><span class="bold">${esc(s.paidCurrency || 'KHR')}</span></div>
  <div class="meta-row"><span>SALE TYPE:</span><span class="bold">${s.priceTier === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL'}</span></div>
  <div class="meta-row"><span>RATE:</span><span>1 USD = ${esc(khr(s.rateSnapshot))}</span></div>
  <div class="dash"></div>
  <table>
    <thead>
      <tr>
        <th style="width:48%">ITEM / មុខទំនិញ</th>
        <th class="center" style="width:14%">QTY</th>
        <th class="right" style="width:38%">AMOUNT (៛)</th>
      </tr>
    </thead>
    <tbody>
      ${s.items
        .map(
          (i, idx) => {
            const pkgTag = getItemPackagingTag(i, s.priceTier);
            return `
      <tr>
        <td>
          <div class="bold">${idx + 1}. ${esc(i.productName)} ${pkgTag ? `<span style="font-size:10px;color:#0F766E;font-weight:700;">[${esc(pkgTag)}]</span>` : ''}</div>
          <div class="sub">@ ${esc(khr(i.unitPriceUsd * s.rateSnapshot))} (${esc(money(i.unitPriceUsd))})</div>
        </td>
        <td class="center bold">
          <div>×${i.quantity}</div>
          ${pkgTag ? `<div class="sub" style="font-size:9.5px;color:#0F766E;font-weight:700;">${esc(pkgTag)}</div>` : ''}
        </td>
        <td class="right">
          <div class="bold">${esc(khr(i.lineTotalUsd * s.rateSnapshot))}</div>
          <div class="sub">${esc(money(i.lineTotalUsd))}</div>
        </td>
      </tr>`;
          }
        )
        .join('')}
    </tbody>
  </table>
  <div class="dash"></div>
  <div class="meta-row"><span>TOTAL QTY / ចំនួនសរុប:</span><span class="bold">${totalUnits}</span></div>
  <div class="total-box">
    <div class="meta-row"><span class="bold">GRAND TOTAL · សរុបត្រូវបង់</span><span class="bold">PAID</span></div>
    <div class="grand-khr">${esc(khr(s.totalKhr))}</div>
    <div class="meta-row" style="margin-top:4px;"><span>TOTAL USD · សរុបជាដុល្លារ</span><span class="bold">${esc(money(s.totalUsd))}</span></div>
  </div>
  <div class="dash"></div>
  <div class="center" style="margin-top:10px;">
    <div class="bold">សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត</div>
    <div class="sub">Thank you for shopping at គ្រប់ហាង · EasySell!</div>
    <div class="barcode">*${esc(receiptNo)}*</div>
  </div>
</body>
</html>`;
}

/** Web helper: renders the receipt onto a high-DPI HTML5 Canvas and returns a PNG Blob */
async function renderWebReceiptPngBlob(sale: Sale, cashier: string): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const scale = 2;
  const width = 380;
  const itemRowHeight = 46;
  const height = 430 + sale.items.length * itemRowHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFEF9';
  ctx.fillRect(0, 0, width, height);

  const receiptNo = sale.id.slice(0, 8).toUpperCase();
  const totalUnits = sale.items.reduce((acc, i) => acc + i.quantity, 0);
  const dt = new Date(sale.createdAt).toLocaleString();

  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.font = '900 20px sans-serif';
  ctx.fillText('គ្រប់ហាង · EasySell', width / 2, 38);

  ctx.fillStyle = '#4B5563';
  ctx.font = '700 11px sans-serif';
  ctx.fillText('បង្កាន់ដៃទូទាត់ប្រាក់ / OFFICIAL POS RECEIPT', width / 2, 58);

  // Divider
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, 72);
  ctx.lineTo(width - 20, 72);
  ctx.stroke();

  const drawRow = (label: string, val: string, y: number, boldVal = false) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4B5563';
    ctx.font = '600 11.5px sans-serif';
    ctx.fillText(label, 22, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = `${boldVal ? '800' : '600'} 11.5px sans-serif`;
    ctx.fillText(val, width - 22, y);
  };

  drawRow('RECEIPT NO:', `#${receiptNo}`, 94, true);
  drawRow('DATE / TIME:', dt, 112);
  drawRow('CASHIER:', cashier, 130);
  drawRow(
    'SALE TYPE:',
    sale.priceTier === 'WHOLESALE' ? 'WHOLESALE / លក់ដុំ' : 'RETAIL / លក់រាយ',
    148,
    true
  );
  drawRow('RATE:', `1 USD = ${khr(sale.rateSnapshot)}`, 166);

  let y = 186;
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.moveTo(20, y);
  ctx.lineTo(width - 20, y);
  ctx.stroke();
  ctx.setLineDash([]);

  y += 20;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = '800 11px sans-serif';
  ctx.fillText('ITEM / មុខទំនិញ', 22, y);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', width * 0.62, y);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT (៛)', width - 22, y);

  y += 10;
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(width - 20, y);
  ctx.stroke();

  for (let idx = 0; idx < sale.items.length; idx++) {
    const it = sale.items[idx];
    y += 22;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827';
    ctx.font = '800 12.5px sans-serif';
    const nameStr =
      it.productName.length > 24
        ? it.productName.slice(0, 23) + '…'
        : it.productName;
    const pkgTag = getItemPackagingTag(it, sale.priceTier);
    ctx.fillText(`${idx + 1}. ${nameStr}${pkgTag ? ` [${pkgTag}]` : ''}`, 22, y);

    ctx.textAlign = 'center';
    ctx.fillText(`×${it.quantity}`, width * 0.62, y);
    if (pkgTag) {
      ctx.font = '700 9.5px sans-serif';
      ctx.fillStyle = '#0F766E';
      ctx.fillText(pkgTag, width * 0.62, y + 14);
      ctx.font = '800 12.5px sans-serif';
      ctx.fillStyle = '#111827';
    }

    ctx.textAlign = 'right';
    ctx.fillText(khr(it.lineTotalUsd * sale.rateSnapshot), width - 22, y);

    y += 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B7280';
    ctx.font = '600 10.5px sans-serif';
    ctx.fillText(
      `@ ${khr(it.unitPriceUsd * sale.rateSnapshot)} (${money(it.unitPriceUsd)})`,
      22,
      y
    );
    ctx.textAlign = 'right';
    ctx.fillText(money(it.lineTotalUsd), width - 22, y);
  }

  y += 16;
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(width - 20, y);
  ctx.stroke();

  y += 20;
  drawRow('TOTAL ITEMS / ចំនួនសរុប:', `${totalUnits}`, y, true);

  // Grand Total Box
  y += 14;
  ctx.fillStyle = '#F5F3FF';
  ctx.strokeStyle = '#6946B8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(20, y, width - 40, 104, 12);
  } else {
    ctx.rect(20, y, width - 40, 104);
  }
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#4B2F94';
  ctx.font = '800 11.5px sans-serif';
  ctx.fillText('GRAND TOTAL · សរុបត្រូវបង់', 34, y + 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#15803D';
  ctx.font = '800 11px sans-serif';
  ctx.fillText('PAID', width - 34, y + 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#241A3F';
  ctx.font = '900 28px sans-serif';
  ctx.fillText(khr(sale.totalKhr), width / 2, y + 62);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#4B5563';
  ctx.font = '700 11.5px sans-serif';
  ctx.fillText('TOTAL IN USD · សរុបជាដុល្លារ', 34, y + 88);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#241A3F';
  ctx.font = '900 14px sans-serif';
  ctx.fillText(money(sale.totalUsd), width - 34, y + 88);

  y += 132;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#111827';
  ctx.font = '800 12px sans-serif';
  ctx.fillText('សូមអរគុណ! Thank you for shopping!', width / 2, y);
  ctx.fillStyle = '#6B7280';
  ctx.font = '700 11px monospace';
  ctx.fillText(`*${receiptNo}*`, width / 2, y + 20);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export function ReceiptModal({
  sale,
  onClose,
}: {
  sale: Sale | null;
  onClose: () => void;
}) {
  const { tr } = useLanguage();
  const { height: winHeight } = useWindowDimensions();
  const cashier = getUsername() || 'Admin';
  const svgRef = useRef<any>(null);
  const [sharingPng, setSharingPng] = useState(false);

  async function print() {
    if (!sale) return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const win = window.open('', '_blank', 'width=420,height=700');
        if (win) {
          win.document.write(receiptHtml(sale, cashier));
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
          }, 250);
          return;
        }
      }
      await Print.printAsync({ html: receiptHtml(sale, cashier) });
    } catch (e) {
      Alert.alert('Print error', String(e));
    }
  }

  async function sharePng() {
    if (!sale || sharingPng) return;
    const receiptNo = sale.id.slice(0, 8).toUpperCase();
    setSharingPng(true);
    try {
      if (Platform.OS === 'web') {
        const blob = await renderWebReceiptPngBlob(sale, cashier);
        if (!blob) {
          await print();
          return;
        }
        const fileName = `receipt-${receiptNo}.png`;
        const nav = navigator as any;
        if (nav?.canShare && typeof File !== 'undefined') {
          try {
            const webFile = new window.File([blob], fileName, { type: 'image/png' });
            if (nav.canShare({ files: [webFile] })) {
              await nav.share({
                title: `Receipt #${receiptNo}`,
                files: [webFile],
              });
              return;
            }
          } catch {
            // Fall through to direct download
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // Native (iOS / Android): Export the rendered SVG receipt to a PNG file via toDataURL
      const svgNode = svgRef.current;
      if (!svgNode || typeof svgNode.toDataURL !== 'function') {
        Alert.alert('Error', 'Receipt image generator is not ready yet.');
        return;
      }

      const base64Data: string = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out generating PNG')),
          6000
        );
        svgNode.toDataURL(
          (data: string) => {
            clearTimeout(timeout);
            if (!data) reject(new Error('Empty PNG output'));
            else resolve(data);
          },
          { width: 760, height: svgHeight * 2 }
        );
      });

      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
      const file = new File(Paths.cache, `receipt-${receiptNo}.png`);
      file.create({ overwrite: true });
      file.write(cleanBase64, { encoding: 'base64' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'image/png',
          dialogTitle: `Share Receipt #${receiptNo}`,
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Saved Receipt PNG', file.uri);
      }
    } catch (e) {
      Alert.alert(
        tr('Share PNG Error', 'មិនអាចចែករំលែករូបភាពបានទេ'),
        String(e instanceof Error ? e.message : e)
      );
    } finally {
      setSharingPng(false);
    }
  }

  const totalUnits = sale ? sale.items.reduce((acc, i) => acc + i.quantity, 0) : 0;
  const receiptNo = sale ? sale.id.slice(0, 8).toUpperCase() : '';
  const barcodeBars = sale ? generateBarcodeBars(sale.id) : [];

  // Calculate SVG dimensions for native PNG export
  const svgItemRowH = 44;
  const svgItemsStartY = 206;
  const svgAfterItemsY = sale ? svgItemsStartY + sale.items.length * svgItemRowH : 260;
  const svgHeight = svgAfterItemsY + 215;

  if (!sale) return null;

  return (
    <Modal
      visible={!!sale}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Hidden Native SVG Receipt Renderer for Instant High-Res PNG Export */}
        {Platform.OS !== 'web' && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -9999,
              top: 0,
              opacity: 0.01,
            }}
          >
            <Svg
              ref={svgRef}
              width={380}
              height={svgHeight}
              viewBox={`0 0 380 ${svgHeight}`}
            >
              <Rect x="0" y="0" width="380" height={svgHeight} fill="#FFFEF9" />

              {/* Store Brand */}
              <SvgText
                x="190"
                y="34"
                fill="#111827"
                fontSize="20"
                fontWeight="bold"
                textAnchor="middle"
              >
                គ្រប់ហាង · EasySell
              </SvgText>
              <SvgText
                x="190"
                y="52"
                fill="#4B5563"
                fontSize="10.5"
                fontWeight="bold"
                textAnchor="middle"
              >
                បង្កាន់ដៃទូទាត់ប្រាក់ / OFFICIAL POS RECEIPT
              </SvgText>
              <SvgText
                x="190"
                y="67"
                fill="#6B7280"
                fontSize="10"
                textAnchor="middle"
              >
                Phnom Penh, Cambodia
              </SvgText>

              <Line x1="20" y1="78" x2="360" y2="78" stroke="#111827" strokeWidth="1.5" />

              {/* Metadata */}
              <SvgText x="22" y="96" fill="#4B5563" fontSize="11">
                RECEIPT NO:
              </SvgText>
              <SvgText x="358" y="96" fill="#111827" fontSize="11" fontWeight="bold" textAnchor="end">
                #{receiptNo}
              </SvgText>

              <SvgText x="22" y="114" fill="#4B5563" fontSize="11">
                DATE / TIME:
              </SvgText>
              <SvgText x="358" y="114" fill="#111827" fontSize="11" textAnchor="end">
                {new Date(sale.createdAt).toLocaleString()}
              </SvgText>

              <SvgText x="22" y="132" fill="#4B5563" fontSize="11">
                CASHIER:
              </SvgText>
              <SvgText x="358" y="132" fill="#111827" fontSize="11" textAnchor="end">
                {cashier}
              </SvgText>

              <SvgText x="22" y="150" fill="#4B5563" fontSize="11">
                SALE TYPE:
              </SvgText>
              <SvgText x="358" y="150" fill="#111827" fontSize="11" fontWeight="bold" textAnchor="end">
                {sale.priceTier === 'WHOLESALE' ? 'WHOLESALE / លក់ដុំ' : 'RETAIL / លក់រាយ'}
              </SvgText>

              <SvgText x="22" y="168" fill="#4B5563" fontSize="11">
                EXCHANGE RATE:
              </SvgText>
              <SvgText x="358" y="168" fill="#111827" fontSize="11" textAnchor="end">
                1 USD = {khr(sale.rateSnapshot)}
              </SvgText>

              <Line
                x1="20"
                y1="180"
                x2="360"
                y2="180"
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="4,3"
              />

              {/* Table Header */}
              <SvgText x="22" y="196" fill="#111827" fontSize="10.5" fontWeight="bold">
                ITEM / មុខទំនិញ
              </SvgText>
              <SvgText x="235" y="196" fill="#111827" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                QTY
              </SvgText>
              <SvgText x="358" y="196" fill="#111827" fontSize="10.5" fontWeight="bold" textAnchor="end">
                AMOUNT (៛)
              </SvgText>
              <Line x1="20" y1="203" x2="360" y2="203" stroke="#CBD5E1" strokeWidth="1" />

              {/* Item Rows */}
              {sale.items.map((it, idx) => {
                const rowY = svgItemsStartY + idx * svgItemRowH;
                const pkgTag = getItemPackagingTag(it, sale.priceTier);
                const cleanName =
                  it.productName.length > 20
                    ? it.productName.slice(0, 19) + '…'
                    : it.productName;
                return (
                  <G key={it.id}>
                    <SvgText
                      x="22"
                      y={rowY + 18}
                      fill="#111827"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {`${idx + 1}. ${cleanName}${pkgTag ? ` [${pkgTag}]` : ''}`}
                    </SvgText>
                    <SvgText
                      x="22"
                      y={rowY + 34}
                      fill="#6B7280"
                      fontSize="10"
                    >
                      {`@ ${khr(it.unitPriceUsd * sale.rateSnapshot)} (${money(it.unitPriceUsd)})`}
                    </SvgText>
                    <SvgText
                      x="235"
                      y={rowY + 18}
                      fill="#111827"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {`×${it.quantity}`}
                    </SvgText>
                    {pkgTag ? (
                      <SvgText
                        x="235"
                        y={rowY + 32}
                        fill="#0F766E"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {pkgTag}
                      </SvgText>
                    ) : null}
                    <SvgText
                      x="358"
                      y={rowY + 18}
                      fill="#111827"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {khr(it.lineTotalUsd * sale.rateSnapshot)}
                    </SvgText>
                    <SvgText
                      x="358"
                      y={rowY + 34}
                      fill="#6B7280"
                      fontSize="10"
                      textAnchor="end"
                    >
                      {money(it.lineTotalUsd)}
                    </SvgText>
                  </G>
                );
              })}

              <Line
                x1="20"
                y1={svgAfterItemsY + 6}
                x2="360"
                y2={svgAfterItemsY + 6}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="4,3"
              />

              <SvgText x="22" y={svgAfterItemsY + 24} fill="#4B5563" fontSize="11" fontWeight="bold">
                TOTAL QTY / ចំនួនសរុប:
              </SvgText>
              <SvgText x="358" y={svgAfterItemsY + 24} fill="#111827" fontSize="11.5" fontWeight="bold" textAnchor="end">
                {`${totalUnits} items`}
              </SvgText>

              {/* Grand Total Box in SVG */}
              <Rect
                x="20"
                y={svgAfterItemsY + 36}
                width="340"
                height="108"
                rx="12"
                fill="#F5F3FF"
                stroke="#6946B8"
                strokeWidth="1.8"
              />
              <SvgText
                x="34"
                y={svgAfterItemsY + 58}
                fill="#4B2F94"
                fontSize="11"
                fontWeight="bold"
              >
                GRAND TOTAL · សរុបត្រូវបង់
              </SvgText>
              <SvgText
                x="346"
                y={svgAfterItemsY + 58}
                fill="#15803D"
                fontSize="11"
                fontWeight="bold"
                textAnchor="end"
              >
                PAID
              </SvgText>
              <SvgText
                x="190"
                y={svgAfterItemsY + 96}
                fill="#241A3F"
                fontSize="26"
                fontWeight="bold"
                textAnchor="middle"
              >
                {khr(sale.totalKhr)}
              </SvgText>
              <SvgText
                x="34"
                y={svgAfterItemsY + 128}
                fill="#4B5563"
                fontSize="11"
                fontWeight="bold"
              >
                TOTAL IN USD · សរុបជាដុល្លារ
              </SvgText>
              <SvgText
                x="346"
                y={svgAfterItemsY + 128}
                fill="#241A3F"
                fontSize="14"
                fontWeight="bold"
                textAnchor="end"
              >
                {money(sale.totalUsd)}
              </SvgText>

              {/* Footer */}
              <SvgText
                x="190"
                y={svgAfterItemsY + 172}
                fill="#111827"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត
              </SvgText>
              <SvgText
                x="190"
                y={svgAfterItemsY + 192}
                fill="#6B7280"
                fontSize="11"
                textAnchor="middle"
              >
                {`*${receiptNo}*`}
              </SvgText>
            </Svg>
          </View>
        )}

        {/* Centered Popup Receipt Card (No Slide-Up Sheet) */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.modalCardWrap,
            { maxHeight: Math.min(winHeight * 0.9, 760) },
          ]}
        >
          {/* Top Modal Header */}
          <View style={styles.topHeaderBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconBadge icon={ReceiptText} size={38} />
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {tr('Official Receipt', 'វិក្កយបត្រផ្លូវការ')}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  #{receiptNo} · គ្រប់ហាង EasySell
                </Text>
              </View>
            </View>
            <Press
              accessibilityLabel="Close receipt"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X color={C.text} size={19} />
            </Press>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }}
          >
            {/* Thermal Paper Receipt Container */}
            <View style={styles.paperContainer}>
              <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
                {/* STORE HEADER */}
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View style={styles.storeIconWrap}>
                    <Store size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.storeBrandText}>គ្រប់ហាង · EasySell</Text>
                  <Text style={styles.storeSubText}>
                    បង្កាន់ដៃទូទាត់ប្រាក់ / OFFICIAL POS RECEIPT
                  </Text>
                  <Text style={styles.storeAddressText}>
                    Phnom Penh, Cambodia · Tel: 012 888 999
                  </Text>
                </View>

                <View style={styles.doubleLine} />

                {/* RECEIPT METADATA ROWS */}
                <View style={{ gap: 4, marginBottom: 10 }}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>RECEIPT NO / លេខវិក្កយបត្រ:</Text>
                    <Text selectable style={styles.metaValueBold}>
                      #{receiptNo}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>DATE / កាលបរិច្ឆេទ:</Text>
                    <Text style={styles.metaValue}>
                      {new Date(sale.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>CASHIER / បេឡាធិការ:</Text>
                    <Text style={styles.metaValue}>{cashier}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>SALE TYPE / ប្រភេទលក់:</Text>
                    <Text style={styles.metaValueBold}>
                      {sale.priceTier === 'WHOLESALE'
                        ? 'WHOLESALE / លក់ដុំ'
                        : 'RETAIL / លក់រាយ'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>RATE / អត្រាប្តូរប្រាក់:</Text>
                    <Text style={styles.metaValue}>
                      1 USD = {khr(sale.rateSnapshot)}
                    </Text>
                  </View>
                </View>

                <View style={styles.dashedDivider} />

                {/* TABLE COLUMN HEADERS */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { flex: 2.2 }]}>
                    ITEM / មុខទំនិញ
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { flex: 0.6, textAlign: 'center' },
                    ]}
                  >
                    QTY
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { flex: 1.4, textAlign: 'right' },
                    ]}
                  >
                    AMOUNT (៛)
                  </Text>
                </View>

                {/* ITEMIZED LINES */}
                {sale.items.map((i, idx) => {
                  const pkgTag = getItemPackagingTag(i, sale.priceTier);
                  return (
                    <View
                      key={i.id}
                      style={[
                        styles.itemRow,
                        idx === sale.items.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={{ flex: 2.2, paddingRight: 6 }}>
                        <Text style={styles.itemNameText}>
                          {idx + 1}. {i.productName}
                        </Text>
                        {pkgTag ? (
                          <View
                            style={{
                              backgroundColor: '#CCFBF1',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              alignSelf: 'flex-start',
                              marginTop: 2,
                              marginBottom: 2,
                            }}
                          >
                            <Text style={{ color: '#0F766E', fontSize: 10, fontWeight: '800' }}>
                              [{pkgTag}]
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.itemUnitText}>
                          @ {khr(i.unitPriceUsd * sale.rateSnapshot)} (
                          {money(i.unitPriceUsd)})
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={styles.itemQtyText}>×{i.quantity}</Text>
                        {pkgTag ? (
                          <Text style={{ color: '#0F766E', fontSize: 9.5, fontWeight: '700', marginTop: 1 }}>
                            {pkgTag}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                        <Text style={styles.itemTotalKhrText}>
                          {khr(i.lineTotalUsd * sale.rateSnapshot)}
                        </Text>
                        <Text style={styles.itemTotalUsdText}>
                          {money(i.lineTotalUsd)}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.dashedDivider} />

                {/* SUBTOTALS */}
                <View style={{ gap: 4, marginBottom: 12 }}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>
                      TOTAL QTY / ចំនួនទំនិញសរុប:
                    </Text>
                    <Text style={styles.metaValueBold}>
                      {totalUnits} {tr('items', 'មុខ')}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>
                      TENDER / រូបិយប័ណ្ណទូទាត់:
                    </Text>
                    <Text style={styles.metaValueBold}>
                      {sale.paidCurrency === 'USD'
                        ? 'USD ($ ដុល្លារ)'
                        : 'KHR (៛ ប្រាក់រៀល)'}
                    </Text>
                  </View>
                </View>

                {/* REDESIGNED GRAND TOTAL CARD */}
                <View style={styles.grandTotalCard}>
                  <View style={styles.grandTotalTopRow}>
                    <View>
                      <Text style={styles.grandTotalTitleEn}>GRAND TOTAL</Text>
                      <Text style={styles.grandTotalTitleKh}>
                        សរុបត្រូវបង់ (KHR)
                      </Text>
                    </View>
                    <View style={styles.paidBadge}>
                      <CheckCircle2 size={12} color="#15803D" />
                      <Text style={styles.paidBadgeText}>
                        {tr('PAID', 'បានទូទាត់')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.grandTotalAmountBox}>
                    <Text style={styles.grandTotalKhrValue}>
                      {khr(sale.totalKhr)}
                    </Text>
                  </View>

                  <View style={styles.grandTotalUsdRow}>
                    <Text style={styles.grandTotalUsdLabel}>
                      {tr('Total in USD', 'សរុបជាដុល្លារ ($)')}
                    </Text>
                    <Text style={styles.grandTotalUsdValue}>
                      {money(sale.totalUsd)}
                    </Text>
                  </View>
                </View>

                {/* BARCODE GRAPHIC & FOOTER */}
                <View style={{ alignItems: 'center', marginTop: 14 }}>
                  <View style={styles.barcodeRow}>
                    {barcodeBars.map((w, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: w * 1.7,
                          height: '100%',
                          backgroundColor:
                            idx % 2 === 0 ? '#111827' : 'transparent',
                        }}
                      />
                    ))}
                  </View>
                  <Text style={styles.barcodeCodeText}>*{receiptNo}*</Text>
                  <Text style={styles.thankYouKh}>
                    សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត
                  </Text>
                  <Text style={styles.thankYouEn}>
                    Thank you for shopping at គ្រប់ហាង · EasySell!
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Pinned Bottom Action Bar inside Modal: Print & Share PNG */}
          <View style={styles.bottomActionsRow}>
            <View style={{ flex: 1 }}>
              <Btn outline icon={Printer} onPress={() => void print()}>
                {tr('Print', 'បោះពុម្ព')}
              </Btn>
            </View>
            <View style={{ flex: 1.3 }}>
              <Btn
                icon={Share2}
                loading={sharingPng}
                onPress={() => void sharePng()}
              >
                {sharingPng
                  ? tr('Saving PNG…', 'កំពុងបង្កើតរូបភាព…')
                  : tr('Share PNG', 'ចែករំលែករូបភាព PNG')}
              </Btn>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardWrap: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.bg,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    ...shadow.lg,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalHeaderTitle: {
    fontSize: 17,
    color: C.text,
    fontWeight: '800',
  },
  modalHeaderSubtitle: {
    fontSize: 11.5,
    color: C.muted,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: C.bg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperContainer: {
    marginTop: 14,
    backgroundColor: '#FFFEF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.sm,
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  storeBrandText: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
  },
  storeSubText: {
    color: '#374151',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.8,
    fontSize: 10.5,
    fontWeight: '800',
  },
  storeAddressText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    fontSize: 11,
  },
  doubleLine: {
    borderTopWidth: 2,
    borderBottomWidth: 1,
    borderColor: '#111827',
    height: 4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: '#4B5563',
    fontSize: 11.5,
    fontWeight: '600',
  },
  metaValue: {
    color: '#111827',
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaValueBold: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  dashedDivider: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginVertical: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#374151',
  },
  tableHeaderCell: {
    color: '#111827',
    fontSize: 10.5,
    fontWeight: '900',
  },
  itemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemNameText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 13,
  },
  itemUnitText: {
    color: '#6B7280',
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  itemQtyText: {
    flex: 0.6,
    color: '#111827',
    fontWeight: '800',
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 2,
  },
  itemTotalKhrText: {
    fontWeight: '900',
    color: '#111827',
    fontSize: 13.5,
  },
  itemTotalUsdText: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 1,
    fontWeight: '600',
  },

  // Improved GRAND TOTAL Card UI
  grandTotalCard: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 16,
    padding: 14,
  },
  grandTotalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalTitleEn: {
    color: C.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  grandTotalTitleKh: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paidBadgeText: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
  },
  grandTotalAmountBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  grandTotalKhrValue: {
    color: C.text,
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  grandTotalUsdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  grandTotalUsdLabel: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  grandTotalUsdValue: {
    color: C.primaryDark,
    fontSize: 16,
    fontWeight: '900',
  },

  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    gap: 2,
    marginBottom: 4,
  },
  barcodeCodeText: {
    color: '#374151',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 8,
  },
  thankYouKh: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 12.5,
    textAlign: 'center',
  },
  thankYouEn: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});
