import { Text, View } from 'react-native';
import { Barcode, Layers, Plus, RefreshCw } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

const pill = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingHorizontal: 13,
  paddingVertical: 9,
  borderRadius: 12,
  backgroundColor: P.surfaceAlt,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.75)',
};

export function PortalHeader({ portal }: { portal: PortalController }) {
  const {
    isCompact,
    lastScannedCode,
    loadAll,
    navItems,
    openBatchModal,
    openCreateProduct,
    refreshing,
    scannerFlash,
    tab,
    tr,
    user,
  } = portal;

  const current = navItems.find((n) => n.id === tab);

  return (
    <View
      style={{
        minHeight: isCompact ? 74 : 84,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: isCompact ? 18 : 26,
        paddingVertical: isCompact ? 12 : 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <View style={{ minWidth: 200 }}>
        <Text
          style={{
            color: P.muted,
            fontSize: 9.5,
            fontWeight: '800',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {tr('Workspace', 'កន្លែងការងារ')}
        </Text>
        <Text
          style={{
            color: P.text,
            fontSize: isCompact ? 16 : 18.5,
            fontWeight: '800',
            letterSpacing: -0.4,
            marginTop: 2,
          }}
        >
          {tr(current?.label || '', current?.khLabel || '')}
        </Text>
        <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>
          {tr(
            `គ្រប់គ្រងហាង · EasySell (${user})`
          )}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Hardware barcode scanner pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: scannerFlash ? P.emerald : P.emeraldLight,
            borderColor: scannerFlash ? P.emerald : 'rgba(46, 156, 106, 0.2)',
          }}
        >
          <Barcode size={15} color={scannerFlash ? '#FFFFFF' : P.emerald} />
          <Text
            style={{
              color: scannerFlash ? '#FFFFFF' : P.emerald,
              fontSize: 11.5,
              fontWeight: '800',
            }}
          >
            {scannerFlash && lastScannedCode
              ? `Scanned: ${lastScannedCode}`
              : tr('USB/BT Scanner Ready', 'ម៉ាស៊ីនស្កេនរួចរាល់')}
          </Text>
        </View>

        <Press onPress={() => void loadAll()} style={pill}>
          <RefreshCw size={14} color={P.primary} />
          <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
            {refreshing ? 'Syncing...' : tr('Sync', 'ធ្វើបច្ចុប្បន្នភាព')}
          </Text>
        </Press>

        <Press onPress={() => openBatchModal()} style={pill}>
          <Layers size={14} color={P.primary} />
          <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
            {tr('Batch Intake', 'បង្កើតជាបាច់')}
          </Text>
        </Press>

        <Press
          onPress={() => openCreateProduct()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 15,
            paddingVertical: 9,
            borderRadius: 12,
            backgroundColor: P.primary,
            shadowColor: '#4B3FA8',
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <Plus size={15} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
            {tr('New Product', 'បន្ថែមទំនិញ')}
          </Text>
        </Press>
      </View>
    </View>
  );
}
