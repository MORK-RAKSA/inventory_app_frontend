import { View } from 'react-native';
import type { PortalController } from '../usePortalController';
import { PosCartColumn } from './PosCartColumn';
import { PosCatalogColumn } from './PosCatalogColumn';
import { PosModeSwitcher } from './PosModeSwitcher';

export function PosTab({ portal }: { portal: PortalController }) {
  const {
    cartLines,
    isCompact,
    posMode,
    setPosMode,
    tr,
    wholesaleCartLines,
  } = portal;

  return (
    <View style={{ gap: 16 }}>
      <PosModeSwitcher
        mode={posMode}
        onModeChange={setPosMode}
        retailCount={cartLines.length}
        wholesaleCount={wholesaleCartLines.length}
        tr={tr}
      />

      <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 22, alignItems: 'flex-start' }}>
        <PosCatalogColumn portal={portal} />
        <PosCartColumn portal={portal} />
      </View>
    </View>
  );
}
