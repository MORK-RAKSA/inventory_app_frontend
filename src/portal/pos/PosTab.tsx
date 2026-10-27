import { View } from 'react-native';
import type { PortalController } from '../usePortalController';
import { PosCartColumn } from './PosCartColumn';
import { PosCatalogColumn } from './PosCatalogColumn';
import { PosModeSwitcher } from './PosModeSwitcher';

export function PosTab({ portal }: { portal: PortalController }) {
  return <View style={{ gap: 16 }}>
    <PosModeSwitcher mode={portal.posMode} onModeChange={portal.setPosMode}
      retailCount={portal.cartLines.length} wholesaleCount={portal.wholesaleCartLines.length} tr={portal.tr} />
    <View style={{ flexDirection: portal.isCompact ? 'column' : 'row', gap: 20, alignItems: 'flex-start' }}>
      <View style={{ flex: 1.2, minWidth: 0, width: '100%' }}><PosCatalogColumn portal={portal} /></View>
      <View style={{ flex: 1, minWidth: 0, width: '100%' }}><PosCartColumn portal={portal} /></View>
    </View>
  </View>;
}
