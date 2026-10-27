import React, { useEffect, useState, useRef } from 'react';
import { Alert, Modal, Platform, ScrollView, View, Pressable } from 'react-native';
import { AppText as Text } from './AppText';
import { X } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { toBlob } from 'html-to-image';
import { receiptBarcode, receiptTime } from '../receiptBarcode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NotoSansKhmer_400Regular } from '@expo-google-fonts/noto-sans-khmer';
import { Sale } from '../api';
import { receiptHtml } from '../receiptHtml';
import { Btn, khr, money } from '../ui';
import { useLanguage } from '../i18n';

export function ReceiptModal({sale, onClose}: {sale: Sale | null; onClose: () => void}) {
  const preview = useRef<View>(null);
  const {tr} = useLanguage();
  const [paper, setPaper] = useState<58 | 80>(80);
  useEffect(() => { void AsyncStorage.getItem('receipt:paper').then(v => { if(v === '58' || v === '80') setPaper(Number(v) as 58 | 80); }); }, []);
  const [font, setFont] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active=true;
    const load = async () => {
      const asset=Asset.fromModule(NotoSansKhmer_400Regular);
      await asset.downloadAsync();
      let uri: string;
      if (Platform.OS==='web') {
        const blob=await (await fetch(asset.uri)).blob();
        uri=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
      } else uri='data:font/ttf;base64,'+await new File(asset.localUri || asset.uri).base64();
      if(active)setFont(uri);
    };
    void load().catch(()=>{});
    return ()=>{active=false};
  },[]);
  if(!sale)return null;
  const html=receiptHtml(sale,paper,font);
  async function print() {
    if(busy)return;
    setBusy(true);
    try {
      if(Platform.OS==='web') {
        const win=window.open('','_blank','width=440,height=720');
        if(!win)throw new Error('Allow pop-ups to open the print dialog.');
        win.document.write(html);win.document.close();
        await win.document.fonts.ready;
        win.focus();win.print();
      } else await Print.printAsync({html});
    } catch(e){Alert.alert('Print failed',String(e));}
    finally{setBusy(false);}
  }
  async function share() {
    if (busy || !preview.current) return;
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        const blob = await toBlob(preview.current as unknown as HTMLElement, { pixelRatio: 3, backgroundColor: '#FFFFFF' });
        if (!blob) throw new Error('Image export failed');
        const file = new globalThis.File([blob], `receipt-${sale!.id.slice(0,8)}.png`, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
        else { const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
      } else {
        const uri = await captureRef(preview, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
      }
    } catch(e) { Alert.alert('Share failed', String(e)); } finally { setBusy(false); }
  }
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={{flex:1,backgroundColor:'#0008',alignItems:'center',justifyContent:'center',paddingHorizontal:20,paddingVertical:36}}>
      <Pressable accessibilityLabel="Close receipt" onPress={onClose} style={{position:'absolute',top:0,left:0,right:0,bottom:0}} />
      <View style={{width:'100%',maxWidth:500,maxHeight:'90%',backgroundColor:'#F8FAFC',borderRadius:24,padding:20,gap:14}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:18,fontWeight:'700'}}>{tr('Receipt','បង្កាន់ដៃ')}</Text><Pressable accessibilityLabel="Close receipt" onPress={onClose} style={{padding:10,borderRadius:12,backgroundColor:'#EDE9F7'}}><X size={22} color="#6946B8" /></Pressable></View>
        <View style={{flexDirection:'row',gap:8}}>{([58,80] as const).map(width=><Btn key={width} outline={paper!==width} onPress={()=>{setPaper(width);void AsyncStorage.setItem('receipt:paper',String(width));}}>{width} mm</Btn>)}</View>
        <ScrollView style={{flexShrink:1}} contentContainerStyle={{alignItems:'center'}}>
          <View ref={preview} collapsable={false} style={{backgroundColor:'white',padding:20,width:'100%',maxWidth:paper===58?280:380,gap:10,borderWidth:1,borderColor:'#E2E8F0',borderRadius:4}}>
            <Text style={{textAlign:'center',fontWeight:'700',fontSize:20}}>EasySell</Text><Text style={{textAlign:'center'}}>បង្កាន់ដៃ / RECEIPT</Text>
            <View style={{borderTopWidth:1,borderBottomWidth:1,borderStyle:'dashed',borderColor:'#CBD5E1',paddingVertical:10,gap:4}}><Text style={{fontSize:11,color:'#64748B'}}>No. {sale.id.slice(0,8).toUpperCase()}</Text><Text style={{fontSize:11,color:'#64748B'}}>{receiptTime(sale.createdAt)} ICT</Text></View>
            <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:11,color:'#64748B'}}>ទំនិញ / ITEM</Text><Text style={{fontSize:11,color:'#64748B'}}>សរុប / KHR</Text></View>
            <Text style={{fontSize:11,color:'#64748B'}}>Cashier: {sale.cashierName || '—'}</Text>
            {sale.items.map(item=><View key={item.id} style={{borderBottomWidth:1,borderColor:'#E2E8F0',paddingVertical:8,gap:4}}><Text style={{fontSize:13}}>{item.productName}</Text><View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}><Text style={{fontSize:11,color:'#64748B'}}>{item.quantity} × {khr(item.unitPriceUsd*sale.rateSnapshot)}</Text><Text style={{fontSize:13}}>{khr(item.lineTotalUsd*sale.rateSnapshot)}</Text></View></View>)}
            <Text style={{fontSize:18,fontWeight:'700'}}>សរុប: {khr(sale.totalKhr)}</Text><Text>{money(sale.totalUsd)}</Text>
            {sale.tenderAmount!=null&&<><Text>Received: {sale.tenderAmount} {sale.tenderCurrency}</Text><Text>Change: {sale.changeText || khr(sale.changeKhr || 0)}</Text></>}
            <Text style={{textAlign:'center'}}>សូមអរគុណ! Thank you.</Text>
            <SvgXml xml={receiptBarcode(sale.id)} width="100%" height={44} /><Text style={{textAlign:'center',fontSize:11}}>{sale.id.slice(0,8).toUpperCase()}</Text>
          </View>
        </ScrollView>
        <Text style={{fontSize:11,color:'#555'}}>{tr('Select the matching paper size in your printer settings. Scale 100%; disable browser headers and footers.','ជ្រើសទំហំក្រដាសដូចគ្នាក្នុងការកំណត់ម៉ាស៊ីនបោះពុម្ព។')}</Text>
        <View style={{flexDirection:'row',gap:10,flexShrink:0,paddingTop:12,borderTopWidth:1,borderColor:'#E2E8F0'}}><Btn disabled={busy} onPress={()=>void print()}>{tr('Print receipt','បោះពុម្ពបង្កាន់ដៃ')}</Btn><Btn outline disabled={busy} onPress={()=>void share()}>{tr('Share PNG','ចែករំលែក PNG')}</Btn></View>
      </View>
    </View>
  </Modal>;
}
