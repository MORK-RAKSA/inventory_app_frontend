import { Text, View } from 'react-native';
import { khr } from '../../theme';
import { Press } from '../../motion';
import { glass, P } from '../theme';
import type { PortalController } from '../usePortalController';

export function RevenueBarChart({
  days,
  maxTotal,
  onViewAll,
  tr,
}: {
  days: PortalController['chartDays'];
  maxTotal: number;
  onViewAll: () => void;
  tr: PortalController['tr'];
}) {
  return (
    <View style={{ ...glass, flex: 1.8, padding: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 18,
          gap: 10,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: P.text, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3 }}>
            {tr('7-Day Revenue Performance (KHR ៛)', 'ចំណូលប្រចាំថ្ងៃរយៈពេល ៧ ថ្ងៃ (៛)')}
          </Text>
          {/* <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 3 }}>
            {tr('Rounded to 100 ៛ Khmer Riel denominations', 'គណនាជាប្រាក់រៀល មូលដ្ឋាន ១០០ ៛')}
          </Text> */}
        </View>
        <Press
          onPress={onViewAll}
          style={{
            paddingHorizontal: 13,
            paddingVertical: 8,
            borderRadius: 11,
            backgroundColor: P.primary,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
            {tr('View All', 'មើលទាំងអស់')}
          </Text>
        </Press>
      </View>

      <View
        style={{ flexDirection: 'row', alignItems: 'flex-end', height: 190, gap: 10, paddingTop: 18 }}
      >
        {days.map((d, idx) => {
          const pct = Math.max(8, Math.round((d.total / maxTotal) * 100));
          const isToday = idx === days.length - 1;
          return (
            <View
              key={d.label}
              style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
            >
              <Text
                style={{ color: P.textSub, fontSize: 10, fontWeight: '700', marginBottom: 6 }}
                numberOfLines={1}
              >
                {d.total > 0 ? khr(d.total) : '0 ៛'}
              </Text>
              <View
                style={{
                  width: '78%',
                  height: `${pct}%`,
                  backgroundColor: isToday ? P.primary : 'rgba(101, 83, 214, 0.26)',
                  borderRadius: 10,
                  minHeight: 8,
                }}
              />
              <Text
                style={{
                  color: isToday ? P.primaryDark : P.muted,
                  fontSize: 11,
                  fontWeight: isToday ? '800' : '600',
                  marginTop: 8,
                }}
              >
                {d.shortLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
