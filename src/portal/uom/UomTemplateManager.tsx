import { Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { UomConfig } from '../../api';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { UomTemplateCard } from './UomTemplateCard';

export function UomTemplateManager({
  configs,
  onCreate,
  onDelete,
  tr,
}: {
  configs: UomConfig[];
  onCreate: (existing?: UomConfig) => void;
  onDelete: (config: UomConfig) => void;
  tr: PortalController['tr'];
}) {
  return (
    <View
      style={{
        backgroundColor: P.surfaceAlt,
        borderRadius: 14,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: P.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <View>
          <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
            {tr('Packaging UOM Configurations', 'ទម្រង់កំណត់ឯកតាកញ្ចប់ UOM')}
          </Text>
          <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
            {tr('Packaging units used for product creation and batch intake.', 'ឯកតាកញ្ចប់សម្រាប់បង្កើតទំនិញ និងនាំចូលស្តុក។')}
          </Text>
        </View>
        <Press
          onPress={() => onCreate()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: P.primary,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 8,
          }}
        >
          <Plus size={14} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
            {tr('Add UOM Template', 'បន្ថែមទម្រង់ UOM')}
          </Text>
        </Press>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {configs.map((u) => (
          <UomTemplateCard
            key={u.id}
            config={u}
            canDelete={configs.length > 1}
            onEdit={onCreate}
            onDelete={onDelete}
            tr={tr}
          />
        ))}
      </View>
    </View>
  );
}
