import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { X, ZoomIn } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Press } from '../motion';
import { C, R, shadow } from '../theme';
import { useLanguage } from '../i18n';

interface ImagePreviewModalProps {
  visible: boolean;
  uri?: string | null;
  name?: string;
  barcode?: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({
  visible,
  uri,
  name,
  barcode,
  onClose,
}: ImagePreviewModalProps) {
  const { width, height } = useWindowDimensions();
  const { tr } = useLanguage();

  if (!visible || !uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Click outside to close */}
        <Pressable style={styles.dismissArea} onPress={onClose} />

        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.modalCard, { maxWidth: Math.min(width - 32, 420) }]}
        >
          {/* Top Bar with Name and Close button */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text numberOfLines={1} style={styles.title}>
                {name || tr('Product Image', 'រូបភាពទំនិញ')}
              </Text>
              {barcode ? (
                <Text style={styles.barcodeText}>
                  {tr('Barcode', 'បាកូដ')}: {barcode}
                </Text>
              ) : null}
            </View>
            <Press onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#FFFFFF" />
            </Press>
          </View>

          {/* Full Image Container */}
          <View style={styles.imageWrap}>
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          </View>

          {/* Bottom caption */}
          <View style={styles.footer}>
            <Text style={styles.hintText}>
              {tr('Tap outside or close icon to exit preview', 'ចុចលើសញ្ញាខ្វែង ឬខាងក្រៅដើម្បីបិទ')}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 29, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  barcodeText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: '100%',
    height: 320,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  hintText: {
    color: '#64748B',
    fontSize: 12,
  },
});
