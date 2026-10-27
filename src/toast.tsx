import { AppText as Text } from './components/AppText';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, AlertTriangle, Check, Info, X } from 'lucide-react-native';
import { Press } from './motion';

export type Tone = 'success' | 'error' | 'warning' | 'info';

export interface Notice {
  id: number;
  message: string;
  /** Short headline naming the action that produced the toast, e.g. "Payment received". */
  title?: string;
  tone: Tone;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export interface ToastApi {
  show: (message: string, opts?: Partial<Omit<Notice, 'id' | 'message'>>) => void;
  dismiss: () => void;
}

const Context = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}

const ENTER_MS = 300;
const EXIT_MS = 200;
const DEFAULT_DURATION = 4200;

/** Per-tone colourway. Titles always come from the call site; these are only a last resort. */
const TONES: Record<
  Tone,
  {
    accent: string;
    tint: string;
    border: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    fallbackTitle: string;
  }
> = {
  success: {
    accent: '#2E9C6A',
    tint: 'rgba(46, 156, 106, 0.12)',
    border: 'rgba(46, 156, 106, 0.28)',
    icon: Check,
    fallbackTitle: 'Success',
  },
  info: {
    accent: '#6553D6',
    tint: 'rgba(101, 83, 214, 0.10)',
    border: 'rgba(101, 83, 214, 0.24)',
    icon: Info,
    fallbackTitle: 'Heads up',
  },
  warning: {
    accent: '#C98A16',
    tint: 'rgba(201, 138, 22, 0.14)',
    border: 'rgba(201, 138, 22, 0.30)',
    icon: AlertTriangle,
    fallbackTitle: 'Check this',
  },
  error: {
    accent: '#C75471',
    tint: 'rgba(199, 84, 113, 0.13)',
    border: 'rgba(199, 84, 113, 0.30)',
    icon: AlertCircle,
    fallbackTitle: "Couldn't complete that",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const enter = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clear = useCallback(() => {
    clearTimer();
    setNotice(null);
    enter.setValue(0);
    progress.setValue(1);
  }, [enter, progress]);

  const dismiss = useCallback(() => {
    clearTimer();
    Animated.timing(enter, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) clear();
    });
  }, [enter, clear]);

  const show = useCallback(
    (message: string, opts: Partial<Omit<Notice, 'id' | 'message'>> = {}) => {
      // 1. Android native default toast
      if (Platform.OS === 'android') {
        try {
          ToastAndroid.show(message, ToastAndroid.SHORT);
          return;
        } catch {
          /* fall through to the in-app card */
        }
      }

      // 2. Web portal & iOS in-app banner
      clearTimer();
      const duration = opts.duration ?? DEFAULT_DURATION;
      idRef.current += 1;
      setNotice({
        id: idRef.current,
        message,
        title: opts.title,
        tone: opts.tone || 'info',
        actionLabel: opts.actionLabel,
        onAction: opts.onAction,
        duration,
      });

      enter.setValue(0);
      progress.setValue(1);
      Animated.parallel([
        Animated.timing(enter, {
          toValue: 1,
          duration: ENTER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        dismiss();
      }, duration);
    },
    [enter, progress, dismiss]
  );

  useEffect(() => clearTimer, []);

  // Stable context value: consumers keep this object in hook dependency arrays, so a fresh
  // object per render would re-run their effects (and re-fire their toasts) in a loop.
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  const tone = notice ? TONES[notice.tone] : null;
  const Icon = tone?.icon;

  return (
    <Context.Provider value={api}>
      {children}
      {notice && tone && Icon && (
        <View
          pointerEvents="box-none"
          style={
            isWeb
              ? {
                  position: 'fixed' as any,
                  top: 22,
                  right: 22,
                  zIndex: 99999,
                  width: 380,
                  maxWidth: 'calc(100vw - 44px)' as any,
                }
              : {
                  position: 'absolute',
                  top: insets.top + 8,
                  left: 16,
                  right: 16,
                  zIndex: 9999,
                }
          }
        >
          <Animated.View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{
              opacity: enter,
              transform: [
                {
                  translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }),
                },
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
              backgroundColor: 'rgba(255, 255, 255, 0.97)',
              borderWidth: 1,
              borderColor: tone.border,
              borderRadius: 18,
              overflow: 'hidden',
              shadowColor: '#3B2A7A',
              shadowOpacity: 0.16,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 8,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 13,
                paddingLeft: 14,
                paddingRight: 10,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: tone.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={19} color={tone.accent} strokeWidth={2.4} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: '#2F2657',
                    fontWeight: '800',
                    fontSize: 13.5,
                    letterSpacing: -0.1,
                  }}
                >
                  {notice.title || tone.fallbackTitle}
                </Text>
                <Text
                  style={{
                    color: '#5B5478',
                    fontSize: 12.5,
                    lineHeight: 17,
                    marginTop: 2,
                  }}
                >
                  {notice.message}
                  {notice.actionLabel && notice.onAction ? (
                    <Text
                      onPress={() => {
                        const action = notice.onAction;
                        dismiss();
                        action?.();
                      }}
                      style={{ color: tone.accent, fontWeight: '800' }}
                    >
                      {'  '}
                      {notice.actionLabel}
                    </Text>
                  ) : null}
                </Text>
              </View>

              <Press
                accessibilityLabel="Dismiss notification"
                onPress={dismiss}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={15} color="#8B84A6" strokeWidth={2.4} />
              </Press>
            </View>

            {/* Time remaining before auto-dismiss */}
            <Animated.View
              style={{
                height: 3,
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: tone.accent,
                opacity: 0.55,
              }}
            />
          </Animated.View>
        </View>
      )}
    </Context.Provider>
  );
}
