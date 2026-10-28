import { AppText as Text } from '../components/AppText';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
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

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'portal-no-focus-outline';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          *:focus,
          *:focus-visible,
          input:focus,
          textarea:focus,
          select:focus,
          button:focus,
          [tabindex]:focus {
            outline: none !important;
            box-shadow: none !important;
            -webkit-focus-ring-color: transparent !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <View style={{ flex: 1, minHeight: 0, height: Platform.OS === 'web' ? '100dvh' as any : undefined, backgroundColor: P.canvas }}>
      <Aurora />

      <View style={{ flex: 1, padding: isCompact ? 0 : 6 }}>
        <View
          style={{
            flex: 1,
            flexDirection: isCompact ? 'column' : 'row',
            borderRadius: isCompact ? 0 : 16,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: isCompact ? 0 : 1,
            borderColor: 'rgba(255, 255, 255, 0.75)',
            ...(isCompact ? null : shadow),
          }}
        >
          <PortalSidebar portal={portal} />

          <View style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            <PortalHeader portal={portal} />

            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={P.primary} />
                <Text style={{ color: P.muted, marginTop: 12, fontWeight: '700', fontSize: 12.5 }}>
                  Loading គ្រប់គ្រងហាង · EasySell Portal...
                </Text>
              </View>
            ) : tab === 'pos' && !isCompact ? (
              <View style={{flex:1,minHeight:0,padding:12}}><PosTab portal={portal}/></View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  padding: isCompact ? 14 : 16,
                  paddingBottom: 24,
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
