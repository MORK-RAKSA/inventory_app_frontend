import { AppText as Text } from '../../components/AppText';
import { ActivityIndicator} from 'react-native';
import { Check } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';

export function CheckoutButton({
  disabled,
  busy,
  active,
  label,
  onPress,
}: {
  disabled: boolean;
  busy: boolean;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Press
      disabled={disabled}
      onPress={onPress}
      style={{
        height: 52,
        borderRadius: 12,
        backgroundColor: active ? P.primary : P.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
      }}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Check size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>{label}</Text>
        </>
      )}
    </Press>
  );
}
