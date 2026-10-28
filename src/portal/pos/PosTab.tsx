import { ScrollView, View } from 'react-native';
import type { PortalController } from '../usePortalController';
import { PosCartColumn } from './PosCartColumn';
import { PosCatalogColumn } from './PosCatalogColumn';
import { PosModeSwitcher } from './PosModeSwitcher';

export function PosTab({ portal }: { portal: PortalController }) {
  return <View style={{ gap: 16, flex: portal.isCompact ? undefined : 1, minHeight: 0 }}>

    <View style={{ flexDirection: portal.isCompact ? 'column' : 'row', gap: 20, alignItems: 'stretch', flex: portal.isCompact ? undefined : 1, minHeight: 0 }}>
      <View style={{flex:1,minWidth:0,minHeight:0,width:'100%',gap:12}}>
    <PosModeSwitcher mode={portal.posMode} onModeChange={portal.setPosMode}
      retailCount={portal.cartLines.length} wholesaleCount={portal.wholesaleCartLines.length} tr={portal.tr} />
        <ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{paddingBottom:20}}><PosCatalogColumn portal={portal}/></ScrollView>
      </View>
      <View style={{ flex: 1.15, minWidth: 0, minHeight: 0, width: '100%' }}><PosCartColumn portal={portal} /></View>
    </View>
  </View>;
}
