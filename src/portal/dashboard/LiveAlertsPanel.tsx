import { AppText as Text } from '../../components/AppText';
import { View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Product } from '../../api';
import { khr } from '../../theme';
import { Press } from '../../motion';
import { glass, glassInset, P } from '../theme';
import type { PortalController } from '../usePortalController';

export function LiveAlertsPanel({
  liveFeed,
  lowStockProducts,
  rate,
  onManage,
  onRestock,
  tr,
}: {
  liveFeed: PortalController['liveFeed'];
  lowStockProducts: Product[];
  rate: number;
  onManage: () => void;
  onRestock: (product: Product, delta: number) => void;
  tr: PortalController['tr'];
}) {
  return (
    <View style={{ ...glass, flex: 1.1, padding: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              backgroundColor: P.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={15} color={P.primary} strokeWidth={2.3} />
          </View>
          <Text style={{ color: P.text, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 }}>
            {tr('Notification', 'ការជូនដំណឹង')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: P.emeraldLight,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 99,
            }}
          >
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: P.emerald }} />
            <Text style={{ color: P.emerald, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>
              LIVE
            </Text>
          </View>
        </View>
        <Press onPress={onManage}>
          <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>
            {tr('Manage', 'គ្រប់គ្រង')}
          </Text>
        </Press>
      </View>

      {liveFeed.length > 0 && (
        <View style={{ gap: 6, marginBottom: 12 }}>
          {liveFeed.slice(0, 3).map((ev) => (
            <View
              key={ev.id}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 11,
                borderRadius: 12,
                backgroundColor: ev.type === 'CHECKOUT' ? P.emeraldLight : P.primaryLight,
              }}
            >
              <Text
                style={{
                  color: ev.type === 'CHECKOUT' ? P.emerald : P.primary,
                  fontWeight: '800',
                  fontSize: 11.5,
                }}
              >
                {tr(ev.titleEn, ev.titleKh)}
              </Text>
              <Text style={{ color: P.textSub, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                {ev.detail}
              </Text>
            </View>
          ))}
        </View>
      )}

      {lowStockProducts.length === 0 ? (
        <View style={{ paddingVertical: 26, alignItems: 'center' }}>
          <Text style={{ color: P.emerald, fontWeight: '800', fontSize: 12.5 }}>
            {tr('All products well-stocked!', 'ទំនិញទាំងអស់មានស្តុកគ្រប់គ្រាន់!')}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 7 }}>
          {lowStockProducts.slice(0, 4).map((p) => (
            <View
              key={p.id}
              style={{
                ...glassInset,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 9,
                paddingHorizontal: 11,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: P.text, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text
                  style={{
                    color: p.stock === 0 ? P.rose : P.amber,
                    fontSize: 10.5,
                    fontWeight: '700',
                    marginTop: 1,
                  }}
                >
                  {p.stock === 0 ? 'OUT OF STOCK' : `${p.stock} left`} · {khr(p.priceUsd * rate)}
                </Text>
              </View>
              {/* <Press
                onPress={() => onRestock(p, 20)}
                style={{
                  backgroundColor: P.primary,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 9,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>+20</Text>
              </Press> */}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
