import { Text, View } from 'react-native';
import { UomConfig } from '../../api';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function UomTemplateCard({
  config,
  canDelete,
  onEdit,
  onDelete,
  tr,
}: {
  config: UomConfig;
  canDelete: boolean;
  onEdit: (config: UomConfig) => void;
  onDelete: (config: UomConfig) => void;
  tr: PortalController['tr'];
}) {
  return (
    <View
      style={{
        backgroundColor: P.surface,
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: P.border,
        minWidth: 220,
        flex: 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: P.text, fontSize: 14, fontWeight: '800' }}>{config.name}</Text>
        <View
          style={{
            backgroundColor: P.primaryLight,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: P.primary, fontSize: 11, fontWeight: '800' }}>
            1 {config.caseUnitName || 'Case'} = {config.caseQty} {config.baseUnit || 'Piece'}s
          </Text>
        </View>
      </View>
      <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 6 }}>
        {config.description ||
          `Standard ${config.caseQty}-${config.baseUnit} ${config.caseUnitName} configuration`}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderColor: P.border,
        }}
      >
        <Press
          onPress={() => onEdit(config)}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: P.surfaceAlt,
          }}
        >
          <Text style={{ color: P.textSub, fontSize: 11, fontWeight: '700' }}>
            {tr('Edit', 'កែ')}
          </Text>
        </Press>
        {canDelete && (
          <Press
            onPress={() => onDelete(config)}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: P.roseLight,
            }}
          >
            <Text style={{ color: P.rose, fontSize: 11, fontWeight: '700' }}>
              {tr('Delete', 'លុប')}
            </Text>
          </Press>
        )}
      </View>
    </View>
  );
}
