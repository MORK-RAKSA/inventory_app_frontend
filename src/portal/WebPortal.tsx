import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { ReceiptModal } from '../components/ReceiptModal';
import { DashboardTab } from './dashboard/DashboardTab';
import { BatchIntakePage } from './inventory/BatchIntakePage';
import { InventoryTab } from './inventory/InventoryTab';
import { ProductFormPage } from './inventory/ProductFormPage';
import { BatchModal } from './modals/BatchModal';
import { ProductModal } from './modals/ProductModal';
import { UomModal } from './modals/UomModal';
import { PosTab } from './pos/PosTab';
import { SettingsTab } from './settings/SettingsTab';
import { Aurora } from './shell/Aurora';
import { PortalHeader } from './shell/PortalHeader';
import { PortalSidebar } from './shell/PortalSidebar';
import { P, shadow } from './theme';
import { TxnTab } from './txn/TxnTab';
import { UomTab } from './uom/UomTab';
import { usePortalController } from './usePortalController';

export function WebPortal({ onSwitchToMobile }: { onSwitchToMobile: () => void }) {
  void onSwitchToMobile;
  const portal = usePortalController();
  const { activeReceipt, isCompact, loading, setActiveReceipt, tab } = portal;

  return (
    <View style={{ flex: 1, backgroundColor: P.canvas }}>
      <Aurora />

      <View style={{ flex: 1, padding: isCompact ? 0 : 16 }}>
        <View
          style={{
            flex: 1,
            flexDirection: isCompact ? 'column' : 'row',
            borderRadius: isCompact ? 0 : 28,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: isCompact ? 0 : 1,
            borderColor: 'rgba(255, 255, 255, 0.75)',
            ...(isCompact ? null : shadow),
          }}
        >
          <PortalSidebar portal={portal} />

          <View style={{ flex: 1 }}>
            <PortalHeader portal={portal} />

            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={P.primary} />
                <Text style={{ color: P.muted, marginTop: 12, fontWeight: '700', fontSize: 12.5 }}>
                  Loading គ្រប់គ្រងហាង · EasySell Portal...
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  padding: isCompact ? 18 : 26,
                  paddingBottom: 60,
                  gap: 18,
                }}
                showsVerticalScrollIndicator={false}
              >
                {tab === 'dashboard' && <DashboardTab portal={portal} />}
                {tab === 'pos' && <PosTab portal={portal} />}
                {tab === 'inventory' && <InventoryTab portal={portal} />}
                {tab === 'product-form' && <ProductFormPage portal={portal} />}
                {tab === 'batch-intake' && <BatchIntakePage portal={portal} />}
                {tab === 'uom' && <UomTab portal={portal} />}
                {tab === 'sales' && <TxnTab portal={portal} />}
                {tab === 'settings' && <SettingsTab portal={portal} />}
              </ScrollView>
            )}
          </View>
        </View>
      </View>

      <ProductModal portal={portal} />
      <UomModal portal={portal} />
      <BatchModal portal={portal} />
      <ReceiptModal sale={activeReceipt} onClose={() => setActiveReceipt(null)} />
    </View>
  );
}
