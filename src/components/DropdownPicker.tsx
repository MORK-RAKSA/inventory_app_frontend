import { AppText as Text } from './AppText';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { Field, Btn, C, R } from '../ui';
import { Press } from '../motion';
import { useLanguage } from '../i18n';

export interface DropdownPickerProps {
  label?: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  allowCustom?: boolean;
}

export function DropdownPicker({
  label,
  value,
  options,
  placeholder,
  onChange,
  allowCustom = false,
}: DropdownPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { tr, t } = useLanguage();

  const q = search.trim().toLowerCase();
  const uniqueOptions = Array.from(
    new Set((options || []).map((o) => String(o).trim()).filter(Boolean))
  );

  const filtered = uniqueOptions.filter((opt) =>
    opt.toLowerCase().includes(q)
  );

  const close = () => {
    setSearch('');
    setOpen(false);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    close();
  };

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 7 }}>
          {label}
        </Text>
      ) : null}

      <Press
        scale={0.99}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          height: 50,
          backgroundColor: '#FFFFFF',
          borderRadius: R.md,
          borderColor: C.border,
          borderWidth: 1.5,
          ...(Platform.OS === 'web' ? ({ outline: 'none', cursor: 'pointer' } as any) : {}),
        }}
      >
        <Text
          style={{
            color: value ? C.text : C.faint,
            fontSize: 15,
            fontWeight: value ? '700' : '500',
          }}
          numberOfLines={1}
        >
          {value || placeholder || tr('Select option…', 'ជ្រើសរើស…')}
        </Text>
        <ChevronDown size={18} color={C.muted} />
      </Press>

      <Modal
        visible={open}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={close}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#140D2699',
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={close} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Animated.View
            entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(200)}
            style={{
              backgroundColor: C.bg,
              padding: 20,
              paddingBottom: Platform.OS === 'ios' ? 36 : 24,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '80%',
            }}
          >
            {/* Grab Bar */}
            <View
              style={{
                alignSelf: 'center',
                width: 44,
                height: 4,
                borderRadius: 2,
                backgroundColor: C.paleStrong,
                marginBottom: 16,
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
                {label || placeholder || tr('Select Option', 'ជ្រើសរើសជម្រើស')}
              </Text>
              <Press
                onPress={close}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color={C.muted} />
              </Press>
            </View>

            {/* Search Input if more than 5 options */}
            {uniqueOptions.length > 5 && (
              <View style={{ marginBottom: 12 }}>
                <Field
                  icon={Search}
                  placeholder={tr('Search options…', 'ស្វែងរក…')}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            )}

            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320, marginBottom: 14 }}>
              {filtered.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: C.muted, fontSize: 13.5 }}>
                    {tr('No matching options', 'គ្មានជម្រើសត្រូវគ្នា')}
                  </Text>
                  {allowCustom && q ? (
                    <Press
                      onPress={() => handleSelect(search.trim())}
                      style={{
                        marginTop: 12,
                        backgroundColor: C.primary,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                        {tr(`Use "${search.trim()}"`, `ប្រើ "${search.trim()}"`)}
                      </Text>
                    </Press>
                  ) : null}
                </View>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.toLowerCase() === value.toLowerCase();
                  return (
                    <Press
                      key={`${opt}-${idx}`}
                      scale={0.985}
                      onPress={() => handleSelect(opt)}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 10,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottomWidth: 1,
                        borderColor: C.border,
                        backgroundColor: isSelected ? '#F0FDF4' : 'transparent',
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? C.primary : C.text,
                          fontSize: 15,
                          fontWeight: isSelected ? '800' : '500',
                        }}
                      >
                        {opt}
                      </Text>
                      {isSelected ? <Check size={18} color={C.primary} strokeWidth={2.5} /> : null}
                    </Press>
                  );
                })
              )}
            </ScrollView>

            <Btn outline onPress={close}>
              {tr('Cancel', 'បោះបង់')}
            </Btn>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
