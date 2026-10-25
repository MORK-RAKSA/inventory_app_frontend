import { ScrollView, Text, View } from 'react-native';
import { ChevronRight, LogOut, Smartphone, Usb } from 'lucide-react-native';
import { khr } from '../../theme';
import { logout } from '../../auth';
import { showSignedOut } from '../../authEvents';
import { Press } from '../../motion';
import { glassInset, P, shadow } from '../theme';
import type { PortalController } from '../usePortalController';

/** 2×2 brand mark matching the dashboard mock. */
function BrandMark() {
  return (
    <View style={{ width: 30, height: 30, justifyContent: 'center', gap: 3 }}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: 'row', gap: 3 }}>
          {[0, 1].map((col) => (
            <View
              key={col}
              style={{
                width: 11,
                height: 11,
                borderRadius: 4,
                backgroundColor: P.primary,
                opacity: row === 0 && col === 0 ? 1 : row + col === 1 ? 0.75 : 0.45,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function PortalSidebar({ portal }: { portal: PortalController }) {
  const {
    isCompact,
    language,
    lastScannedCode,
    navItems,
    rate,
    scannerFlash,
    setLanguage,
    setTab,
    tab,
    tr,
    user,
  } = portal;

  const initials = (user || 'A')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'A';

  return (
    <View
      style={{
        width: isCompact ? '100%' : 258,
        backgroundColor: P.sidebarBg,
        borderRightWidth: isCompact ? 0 : 1,
        borderBottomWidth: isCompact ? 1 : 0,
        borderColor: P.sidebarBorder,
        paddingVertical: isCompact ? 14 : 22,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
      }}
    >
      <View>
        {/* Brand */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            paddingHorizontal: 6,
            marginBottom: isCompact ? 12 : 20,
          }}
        >
          <BrandMark />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: P.text, fontSize: 16.5, fontWeight: '800', letterSpacing: -0.4 }}>
              {tr('EasySell', 'EasySell')}
            </Text>
            <Text style={{ color: P.muted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
              គ្រប់ហាង · {tr('Web Portal', 'ផតថលវេប')}
            </Text>
          </View>
        </View>

        {/* Signed-in account */}
        {!isCompact && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 10,
              marginBottom: 20,
              ...glassInset,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: P.primaryLight,
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.9)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: P.primaryDark, fontSize: 13, fontWeight: '800' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: P.text, fontSize: 13, fontWeight: '800' }} numberOfLines={1}>
                {user}
              </Text>
              <Text style={{ color: P.muted, fontSize: 10.5, marginTop: 1 }} numberOfLines={1}>
                {tr('Store Admin', 'អ្នកគ្រប់គ្រងហាង')}
              </Text>
            </View>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: P.emerald }} />
          </View>
        )}

        {/* Navigation */}
        <ScrollView
          horizontal={isCompact}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 5 }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <Press
                key={item.id}
                onPress={() => setTab(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  marginBottom: isCompact ? 0 : 2,
                  backgroundColor: active ? P.sidebarActive : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? 'rgba(101, 83, 214, 0.12)' : 'transparent',
                  ...(active ? shadow : null),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <Icon size={17} color={active ? P.primary : P.sidebarText} strokeWidth={2.2} />
                  <Text
                    style={{
                      color: active ? P.sidebarTextActive : P.sidebarText,
                      fontWeight: active ? '800' : '600',
                      fontSize: 13,
                      letterSpacing: -0.1,
                    }}
                  >
                    {tr(item.label, item.khLabel)}
                  </Text>
                </View>
                {item.badge ? (
                  <View
                    style={{
                      backgroundColor: active ? P.primary : P.primaryLight,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 99,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : P.primary,
                        fontSize: 10.5,
                        fontWeight: '800',
                      }}
                    >
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom controls (desktop) */}
      {!isCompact && (
        <View style={{ gap: 10, marginTop: 16 }}>
          {/* Live KHR rate */}
          <View style={{ ...glassInset, padding: 12 }}>
            <Text
              style={{
                color: P.muted,
                fontSize: 9.5,
                fontWeight: '800',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {tr('KHR rate', 'អត្រាប្រាក់រៀល')}
            </Text>
            <Text style={{ color: P.text, fontSize: 15.5, fontWeight: '800', marginTop: 5 }}>
              1 USD = {khr(rate)}
            </Text>
            {/* <Text style={{ color: P.muted, fontSize: 10, marginTop: 2 }}>
              {tr('All Riel prices round to 100 ៛', 'គិតជាមូលដ្ឋាន ១០០ រៀល')}
            </Text> */}
          </View>

          {/* Scanner gun status */}
          <View
            style={{
              ...glassInset,
              padding: 12,
              borderColor: scannerFlash ? 'rgba(46, 156, 106, 0.55)' : 'rgba(255, 255, 255, 0.7)',
              backgroundColor: scannerFlash ? P.emeraldLight : P.surfaceAlt,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: scannerFlash ? P.emerald : P.teal,
                }}
              />
              <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '800', flex: 1 }}>
                {tr('Scanner gun ready', 'ម៉ាស៊ីនស្កេនរួចរាល់')}
              </Text>
              <Usb size={13} color={P.teal} />
              <Smartphone size={12} color={P.primary} />
            </View>
            <Text style={{ color: P.muted, fontSize: 10.5, marginTop: 4 }} numberOfLines={2}>
              {lastScannedCode
                ? `${tr('Last scanned:', 'ស្កេនចុងក្រោយ៖')} ${lastScannedCode}`
                : tr('USB / Bluetooth or mobile scanner', 'USB / Bluetooth ឬម៉ាស៊ីនស្កេនទូរស័ព្ទ')}
            </Text>
          </View>

          {/* Language */}
          <View style={{ flexDirection: 'row', ...glassInset, padding: 3, borderRadius: 12 }}>
            {(['kh', 'en'] as const).map((lang) => {
              const active = language === lang;
              return (
                <Press
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 9,
                    alignItems: 'center',
                    backgroundColor: active ? '#FFFFFF' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: active ? P.primaryDark : P.muted,
                      fontSize: 11.5,
                      fontWeight: '800',
                    }}
                  >
                    {lang === 'kh' ? 'ភាសាខ្មែរ' : 'English'}
                  </Text>
                </Press>
              );
            })}
          </View>

          {/* Sign out */}
          <Press
            onPress={async () => {
              await logout();
              showSignedOut();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(199, 84, 113, 0.22)',
              backgroundColor: P.roseLight,
            }}
          >
            <Text style={{ color: P.rose, fontSize: 12, fontWeight: '800' }}>
              {tr('Sign out of portal', 'ចាកចេញពីផតថល')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <LogOut size={14} color={P.rose} />
              <ChevronRight size={13} color={P.rose} />
            </View>
          </Press>
        </View>
      )}
    </View>
  );
}
