import { Text, TextInput, View } from 'react-native';
import { Usb } from 'lucide-react-native';
import { khr } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function SettingsTab({ portal }: { portal: PortalController }) {
  const {
    rateInput,
    saveExchangeRate,
    savingRate,
    setRateInput,
    tr,
  } = portal;

  return (
    <View style={{ maxWidth: 620, gap: 22 }}>
      {/* Exchange Rate Configuration (100-Riel steps) */}
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: P.border,
        }}
      >
        <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
          {tr('Khmer Riel (KHR ៛) Exchange Rate', 'ការកំណត់អត្រាប្តូរប្រាក់រៀល (៛)')}
        </Text>
        <Text style={{ color: P.muted, fontSize: 13, marginTop: 4, marginBottom: 18 }}>
          {tr(
            'All Khmer Riel amounts automatically round to multiples of 100 ៛ (e.g., 100 ៛, 2,100 ៛, 5,010,100 ៛).',
            'គ្រប់ចំនួនទឹកប្រាក់រៀលទាំងអស់ត្រូវបានបង្គត់ទៅមូលដ្ឋាន ១០០ រៀល (ឧ. 100 ៛, 2,100 ៛, 5,010,100 ៛)។'
          )}
        </Text>

        <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
          1 USD IN KHMER RIEL (៛)
        </Text>
        <TextInput
          value={rateInput}
          onChangeText={setRateInput}
          keyboardType="numeric"
          style={{
            borderWidth: 1.5,
            borderColor: P.borderStrong,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 48,
            fontSize: 18,
            fontWeight: '800',
            color: P.text,
            backgroundColor: P.surfaceAlt,
          }}
        />

        {/* Quick 100-Riel Presets */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 18 }}>
          {[4000, 4100, 4200].map((preset) => (
            <Press
              key={preset}
              onPress={() => setRateInput(String(preset))}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: Number(rateInput) === preset ? P.primaryLight : P.surfaceAlt,
                borderWidth: 1,
                borderColor: Number(rateInput) === preset ? P.primary : P.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: P.text, fontWeight: '800', fontSize: 13 }}>
                {khr(preset)}
              </Text>
            </Press>
          ))}
        </View>

        <Press
          disabled={savingRate}
          onPress={() => void saveExchangeRate()}
          style={{
            height: 46,
            borderRadius: 10,
            backgroundColor: P.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
            {savingRate ? 'Saving...' : tr('Save Exchange Rate', 'រក្សាទុកអត្រាប្តូរប្រាក់')}
          </Text>
        </Press>
      </View>

      {/* Hardware Scanner Instructions Card */}
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: P.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Usb size={20} color={P.emerald} />
          <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
            {tr('Hardware Barcode Scanner Device (USB / Bluetooth)', 'ការភ្ជាប់ម៉ាស៊ីនស្កេនបាកូដ (USB / Bluetooth)')}
          </Text>
        </View>
        <Text style={{ color: P.muted, fontSize: 13, lineHeight: 20 }}>
          {tr(
            'Plug in any USB or 2.4GHz wireless / Bluetooth barcode scanner gun. The portal automatically listens for barcode scans globally—no camera required on web.',
            'គ្រាន់តែដោតខ្សែ USB ឬភ្ជាប់ Bluetooth ម៉ាស៊ីនស្កេនបាកូដ នោះវេបសាយនឹងទទួលការស្កេនដោយស្វ័យប្រវត្តិភ្លាមៗ។'
          )}
        </Text>
      </View>
    </View>
  );
}
