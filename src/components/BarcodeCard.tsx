import {Text,View} from 'react-native';
import Barcode from '@aramir/react-native-barcode';
import {RefreshCw} from 'lucide-react-native';
import {Btn,Card,C} from '../ui';
import React from 'react';

export function BarcodeCard({value,onGenerate}:{value:string;onGenerate:()=>void}) {
  return (
    <Card>
      <Text style={{fontWeight: '800', color: C.text, marginBottom: 14}}>Product barcode · Code 128</Text>
      {value ? (
        <View style={{alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 14}}>
          <Barcode value={value} format="CODE128" maxWidth={260} height={72} />
          <Text selectable style={{marginTop: 8, color: C.muted, letterSpacing: 1}}>{value}</Text>
        </View>
      ) : <Text style={{color: C.muted, marginBottom: 14}}>No barcode assigned</Text>}
      <Btn soft icon={RefreshCw} onPress={onGenerate}>Generate new internal barcode</Btn>
    </Card>
  );
}
