import { AppText as Text } from '../../components/AppText';
import { ScrollView} from 'react-native';
import { Press } from '../../motion';
import { P } from '../theme';

export function InventoryCategoryFilter({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
    >
      {categories.map((c) => {
        const active = activeCategory === c;
        return (
          <Press
            key={c}
            onPress={() => onSelect(c)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: active ? P.primary : P.surfaceAlt,
            }}
          >
            <Text style={{ color: active ? '#FFFFFF' : P.textSub, fontSize: 12, fontWeight: '700' }}>
              {c}
            </Text>
          </Press>
        );
      })}
    </ScrollView>
  );
}
