import React, { useRef } from 'react';
import { Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
  Extrapolation,
} from 'react-native-reanimated';
import { Pencil, Trash2 } from 'lucide-react-native';
import { C, R, shadow } from '../theme';
import { Press } from '../motion';

function RightActions({
  progress,
  drag,
  onEdit,
  onDelete,
  onlyDelete = false,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: {
  progress: SharedValue<number>;
  drag: SharedValue<number>;
  onEdit: () => void;
  onDelete: () => void;
  onlyDelete?: boolean;
  editLabel?: string;
  deleteLabel?: string;
}) {
  const totalWidth = onlyDelete ? 78 : 154;

  const trayStyle = useAnimatedStyle(() => {
    const p = Math.max(0, progress.value);
    return {
      opacity: interpolate(p, [0, 0.25, 1], [0, 0.85, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            -drag.value,
            [0, totalWidth],
            [28, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            p,
            [0, 0.6, 1],
            [0.86, 0.97, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: totalWidth,
          flexDirection: 'row',
          alignItems: 'stretch',
          paddingLeft: 10,
          paddingBottom: 14,
          gap: 8,
        },
        trayStyle,
      ]}
    >
      {!onlyDelete && (
        <Press
          accessibilityLabel={editLabel}
          onPress={onEdit}
          scale={0.93}
          style={{
            flex: 1,
            borderRadius: R.lg - 2,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            ...shadow.sm,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pencil size={16} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text
            numberOfLines={1}
            style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}
          >
            {editLabel}
          </Text>
        </Press>
      )}
      <Press
        accessibilityLabel={deleteLabel}
        onPress={onDelete}
        scale={0.93}
        style={{
          flex: 1,
          borderRadius: R.lg - 2,
          backgroundColor: C.red,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          ...shadow.sm,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 size={16} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <Text
          numberOfLines={1}
          style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}
        >
          {deleteLabel}
        </Text>
      </Press>
    </Animated.View>
  );
}

export function SwipeActions({
  children,
  onEdit,
  onDelete,
  onlyDelete = false,
  editLabel = 'Edit',
  deleteLabel = 'Archive',
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete: () => void;
  onlyDelete?: boolean;
  editLabel?: string;
  deleteLabel?: string;
}) {
  const ref = useRef<any>(null);

  return (
    <Swipeable
      ref={ref}
      friction={1.2}
      rightThreshold={32}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
      animationOptions={{
        damping: 26,
        stiffness: 280,
        mass: 0.7,
        overshootClamping: true,
      }}
      renderRightActions={(progress, drag) => (
        <RightActions
          progress={progress}
          drag={drag}
          onlyDelete={onlyDelete}
          editLabel={editLabel}
          deleteLabel={deleteLabel}
          onEdit={() => {
            ref.current?.close();
            onEdit?.();
          }}
          onDelete={() => {
            ref.current?.close();
            onDelete();
          }}
        />
      )}
    >
      <View>{children}</View>
    </Swipeable>
  );
}
