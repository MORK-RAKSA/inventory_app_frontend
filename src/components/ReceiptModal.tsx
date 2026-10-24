import React from 'react';
import { Alert, Modal, Platform, ScrollView, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CheckCircle2, Printer, ReceiptText, Share2, Store, X } from 'lucide-react-native';
import { Sale } from '../api';
import { getUsername } from '../auth';
import { Btn, C, IconBadge, khr, money } from '../ui';
import { Press, Rise } from '../motion';
import { useLanguage } from '../i18n';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!
  );

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
  .brand-en { font-size: 15px; font-weight: 800; letter-spacing: 1px; margin: 2px 0 4px; }
  .sub { font-size: 11px; color: #4B5563; }
  .dash { border-top: 1.5px dashed #374151; margin: 8px 0; }
  .double-dash { border-top: 2px double #111827; margin: 8px 0; }
  .meta-row { display: flex; justify-content: space-between; font-size: 11.5px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th { text-align: left; font-size: 11px; padding: 4px 0; border-bottom: 1.5px dashed #374151; }
  td { padding: 6px 0; vertical-align: top; border-bottom: 1px dotted #D1D5DB; }
  .total-box {
    background: #F3F4F6;
    border: 1.5px solid #111827;
    padding: 8px 10px;
    margin: 10px 0;
  }
  .grand-khr { font-size: 22px; font-weight: 900; }
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
          (i, idx) => `
      <tr>
        <td>
          <div class="bold">${idx + 1}. ${esc(i.productName)}</div>
          <div class="sub">@ ${esc(khr(i.unitPriceUsd * s.rateSnapshot))} (${esc(money(i.unitPriceUsd))})</div>
        </td>
        <td class="center bold">×${i.quantity}</td>
        <td class="right">
          <div class="bold">${esc(khr(i.lineTotalUsd * s.rateSnapshot))}</div>
          <div class="sub">${esc(money(i.lineTotalUsd))}</div>
        </td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <div class="dash"></div>
  <div class="meta-row"><span>TOTAL QTY / ចំនួនសរុប:</span><span class="bold">${totalUnits}</span></div>
  <div class="meta-row"><span>SUBTOTAL (USD):</span><span>${esc(money(s.totalUsd))}</span></div>
  <div class="total-box">
    <div class="meta-row"><span class="bold">សរុបត្រូវបង់ / GRAND TOTAL</span><span>KHR</span></div>
    <div class="right grand-khr">${esc(khr(s.totalKhr))}</div>
    <div class="meta-row" style="margin-top:4px;"><span>សរុបជាដុល្លារ / TOTAL USD</span><span class="bold">${esc(money(s.totalUsd))}</span></div>
  </div>
  <div class="meta-row"><span>STATUS:</span><span class="bold">PAID / បានទូទាត់រួចរាល់ ✓</span></div>
  <div class="dash"></div>
  <div class="center" style="margin-top:10px;">
    <div class="bold">សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត</div>
    <div class="sub">Thank you for shopping at គ្រប់ហាង · EasySell!</div>
    <div class="barcode">*${esc(receiptNo)}*</div>
  </div>
</body>
</html>`;
}

export function ReceiptModal({
  sale,
  onClose,
}: {
  sale: Sale | null;
  onClose: () => void;
}) {
  const { tr } = useLanguage();
  const cashier = getUsername() || 'Admin';

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

  async function save() {
    if (!sale) return;
    try {
      if (Platform.OS === 'web') {
        await print();
        return;
      }
      const f = await Print.printToFileAsync({ html: receiptHtml(sale, cashier) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(f.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved PDF', f.uri);
      }
    } catch (e) {
      Alert.alert('PDF error', String(e));
    }
  }

  const totalUnits = sale ? sale.items.reduce((acc, i) => acc + i.quantity, 0) : 0;
  const receiptNo = sale ? sale.id.slice(0, 8).toUpperCase() : '';
  const barcodeBars = sale ? generateBarcodeBars(sale.id) : [];

  return (
    <Modal
      visible={!!sale}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={{ backgroundColor: '#E2E8F0' }}
        contentContainerStyle={{
          padding: 20,
          flexGrow: 1,
          paddingBottom: 60,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Action Header */}
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBadge icon={ReceiptText} size={40} />
            <View>
              <Text
                style={{
                  fontSize: 20,
                  color: '#0F172A',
                  fontWeight: '800',
                  letterSpacing: -0.4,
                }}
              >
                {tr('Official Receipt', 'វិក្កយបត្រផ្លូវការ')}
              </Text>
              <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                គ្រប់ហាង · EasySell POS
              </Text>
            </View>
          </View>
          <Press
            accessibilityLabel="Close receipt"
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X color="#0F172A" size={20} />
          </Press>
        </View>

        {sale && (
          <View style={{ width: '100%', maxWidth: 420 }}>
            <Rise>
              {/* REALISTIC THERMAL PAPER RECEIPT CONTAINER */}
              <View
                style={{
                  backgroundColor: '#FFFEF9',
                  borderRadius: 6,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.14,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 6,
                }}
              >
                {/* Top Serrated Paper Edge */}
                <View
                  style={{
                    flexDirection: 'row',
                    height: 8,
                    backgroundColor: '#E2E8F0',
                    justifyContent: 'space-between',
                  }}
                >
                  {Array.from({ length: 28 }).map((_, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: '#FFFEF9',
                        transform: [{ rotate: '45deg' }],
                        marginTop: 3,
                      }}
                    />
                  ))}
                </View>

                <View style={{ paddingHorizontal: 22, paddingVertical: 20 }}>
                  {/* STORE HEADER */}
                  <View style={{ alignItems: 'center', marginBottom: 14 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: '#111827',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Store size={22} color="#FFFFFF" />
                    </View>
                    <Text
                      style={{
                        color: '#111827',
                        fontWeight: '900',
                        fontSize: 22,
                        textAlign: 'center',
                        letterSpacing: -0.3,
                      }}
                    >
                      គ្រប់ហាង · EasySell
                    </Text>
                    <Text
                      style={{
                        color: '#374151',
                        textAlign: 'center',
                        marginTop: 3,
                        letterSpacing: 1.2,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      បង្កាន់ដៃទូទាត់ប្រាក់ / OFFICIAL POS RECEIPT
                    </Text>
                    <Text
                      style={{
                        color: '#6B7280',
                        textAlign: 'center',
                        marginTop: 2,
                        fontSize: 11.5,
                      }}
                    >
                      Phnom Penh, Cambodia · Tel: 012 888 999
                    </Text>
                  </View>

                  {/* DOUBLE DASHED LINE */}
                  <View
                    style={{
                      borderTopWidth: 2,
                      borderBottomWidth: 1,
                      borderColor: '#111827',
                      height: 4,
                      marginBottom: 12,
                    }}
                  />

                  {/* RECEIPT METADATA ROWS */}
                  <View style={{ gap: 5, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '600' }}>
                        RECEIPT NO / លេខវិក្កយបត្រ:
                      </Text>
                      <Text selectable style={{ color: '#111827', fontSize: 12.5, fontWeight: '800' }}>
                        #{receiptNo}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '600' }}>
                        DATE / កាលបរិច្ឆេទ:
                      </Text>
                      <Text style={{ color: '#111827', fontSize: 12, fontWeight: '700' }}>
                        {new Date(sale.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '600' }}>
                        CASHIER / បេឡាធិការ:
                      </Text>
                      <Text style={{ color: '#111827', fontSize: 12, fontWeight: '700' }}>
                        {cashier}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '600' }}>
                        EXCHANGE RATE / អត្រាប្តូរប្រាក់:
                      </Text>
                      <Text style={{ color: '#111827', fontSize: 12, fontWeight: '700' }}>
                        1 USD = {khr(sale.rateSnapshot)}
                      </Text>
                    </View>
                  </View>

                  {/* DASHED DIVIDER */}
                  <View
                    style={{
                      borderTopWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: '#374151',
                      marginVertical: 8,
                    }}
                  />

                  {/* TABLE COLUMN HEADERS */}
                  <View
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 6,
                      borderBottomWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: '#374151',
                    }}
                  >
                    <Text style={{ flex: 2.2, color: '#111827', fontSize: 11, fontWeight: '900' }}>
                      ITEM / មុខទំនិញ
                    </Text>
                    <Text style={{ flex: 0.6, color: '#111827', fontSize: 11, fontWeight: '900', textAlign: 'center' }}>
                      QTY
                    </Text>
                    <Text style={{ flex: 1.4, color: '#111827', fontSize: 11, fontWeight: '900', textAlign: 'right' }}>
                      AMOUNT (៛)
                    </Text>
                  </View>

                  {/* ITEMIZED LINES */}
                  {sale.items.map((i, idx) => (
                    <View
                      key={i.id}
                      style={{
                        paddingVertical: 10,
                        borderBottomWidth: idx === sale.items.length - 1 ? 0 : 1,
                        borderStyle: 'dotted',
                        borderColor: '#CBD5E1',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                      }}
                    >
                      <View style={{ flex: 2.2, paddingRight: 6 }}>
                        <Text
                          style={{
                            color: '#111827',
                            fontWeight: '800',
                            fontSize: 13.5,
                          }}
                        >
                          {idx + 1}. {i.productName}
                        </Text>
                        <Text style={{ color: '#4B5563', marginTop: 2, fontSize: 11.5, fontWeight: '600' }}>
                          @ {khr(i.unitPriceUsd * sale.rateSnapshot)} ({money(i.unitPriceUsd)})
                        </Text>
                      </View>
                      <Text
                        style={{
                          flex: 0.6,
                          color: '#111827',
                          fontWeight: '800',
                          fontSize: 13,
                          textAlign: 'center',
                          marginTop: 2,
                        }}
                      >
                        ×{i.quantity}
                      </Text>
                      <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                        <Text style={{ fontWeight: '900', color: '#111827', fontSize: 14 }}>
                          {khr(i.lineTotalUsd * sale.rateSnapshot)}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1, fontWeight: '600' }}>
                          {money(i.lineTotalUsd)}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {/* DASHED DIVIDER */}
                  <View
                    style={{
                      borderTopWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: '#374151',
                      marginVertical: 10,
                    }}
                  />

                  {/* SUBTOTALS */}
                  <View style={{ gap: 4, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '700' }}>
                        TOTAL QTY / ចំនួនទំនិញសរុប:
                      </Text>
                      <Text style={{ color: '#111827', fontSize: 12.5, fontWeight: '800' }}>
                        {totalUnits} {tr('items', 'មុខ')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '700' }}>
                        TENDER CURRENCY / រូបិយប័ណ្ណទូទាត់:
                      </Text>
                      <Text style={{ color: '#111827', fontSize: 12.5, fontWeight: '800' }}>
                        {sale.paidCurrency === 'USD' ? 'USD ($ ដុល្លារ)' : 'KHR (៛ ប្រាក់រៀល)'}
                      </Text>
                    </View>
                  </View>

                  {/* GRAND TOTAL THERMAL BOX */}
                  <View
                    style={{
                      backgroundColor: '#F3F4F6',
                      borderWidth: 2,
                      borderColor: '#111827',
                      borderRadius: 8,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#111827', fontSize: 12.5, fontWeight: '900' }}>
                        សរុបត្រូវបង់ / GRAND TOTAL (KHR)
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: '#065F46',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <CheckCircle2 size={11} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>PAID</Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: '#111827',
                        fontWeight: '900',
                        fontSize: 30,
                        marginTop: 6,
                        textAlign: 'right',
                        letterSpacing: -0.8,
                      }}
                    >
                      {khr(sale.totalKhr)}
                    </Text>

                    <View
                      style={{
                        borderTopWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: '#9CA3AF',
                        marginVertical: 8,
                      }}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#374151', fontSize: 12, fontWeight: '700' }}>
                        សរុបជាដុល្លារ / TOTAL IN USD ($)
                      </Text>
                      <Text style={{ color: '#111827', fontSize: 16, fontWeight: '900' }}>
                        {money(sale.totalUsd)}
                      </Text>
                    </View>
                  </View>

                  {/* BARCODE GRAPHIC & FOOTER */}
                  <View style={{ alignItems: 'center', marginTop: 18 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 38,
                        gap: 2,
                        marginBottom: 4,
                      }}
                    >
                      {barcodeBars.map((w, idx) => (
                        <View
                          key={idx}
                          style={{
                            width: w * 1.8,
                            height: '100%',
                            backgroundColor: idx % 2 === 0 ? '#111827' : 'transparent',
                          }}
                        />
                      ))}
                    </View>
                    <Text
                      style={{
                        color: '#374151',
                        fontSize: 11,
                        fontWeight: '700',
                        letterSpacing: 3,
                        marginBottom: 10,
                      }}
                    >
                      *{receiptNo}*
                    </Text>

                    <Text
                      style={{
                        color: '#111827',
                        fontWeight: '800',
                        fontSize: 13,
                        textAlign: 'center',
                      }}
                    >
                      សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត
                    </Text>
                    <Text
                      style={{
                        color: '#4B5563',
                        textAlign: 'center',
                        marginTop: 2,
                        fontSize: 11.5,
                        fontWeight: '600',
                      }}
                    >
                      Thank you for shopping at គ្រប់ហាង · EasySell!
                    </Text>
                    <Text
                      style={{
                        color: '#9CA3AF',
                        textAlign: 'center',
                        marginTop: 4,
                        fontSize: 10.5,
                      }}
                    >
                      ទំនិញដែលទិញរួចមិនអាចប្តូរយកប្រាក់វិញបានទេ
                    </Text>
                  </View>
                </View>

                {/* Bottom Serrated Paper Edge */}
                <View
                  style={{
                    flexDirection: 'row',
                    height: 8,
                    backgroundColor: '#E2E8F0',
                    justifyContent: 'space-between',
                  }}
                >
                  {Array.from({ length: 28 }).map((_, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: '#FFFEF9',
                        transform: [{ rotate: '45deg' }],
                        marginTop: -6,
                      }}
                    />
                  ))}
                </View>
              </View>
            </Rise>

            {/* PRINT & SHARE BUTTONS */}
            <Rise index={2} style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Btn icon={Printer} style={{ flex: 1 }} onPress={() => void print()}>
                {tr('Print Receipt', 'បោះពុម្ពវិក្កយបត្រ')}
              </Btn>
              <Btn soft icon={Share2} style={{ flex: 1 }} onPress={() => void save()}>
                {tr('PDF / Share', 'ចែករំលែក PDF')}
              </Btn>
            </Rise>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}
