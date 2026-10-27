import { AppText as Text } from '../src/components/AppText';
import { useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import {
  Bell,
  ReceiptText,
  Trash2,
  Eye,
  CheckCheck,
} from "lucide-react-native";
import { SwipeActions } from "../src/components/SwipeActions";
import { Sale } from "../src/api";
import { useLiveData } from "../src/hooks/useLiveData";
import { ReceiptModal } from "../src/components/ReceiptModal";
import { Screen, Card, C, Empty, khr, money } from "../src/ui";
import { Press } from "../src/motion";
import {
  getLiveActivityLog,
  subscribeLiveActivity,
  markAllNotificationsRead,
} from "../src/liveSync";
import React from "react";

const STORAGE = "retailflow:dismissed-notifications:v1";
type Event = {
  key: string;
  title: string;
  detail: string;
  danger: boolean;
  sale?: Sale;
};
export default function Notifications() {
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return <PortalNotifications />;
}
function PortalNotifications() {
  const router = useRouter();
  const { products, sales, refresh } = useLiveData("all");
  const [tab, setTab] = useState<"transaction" | "normal">("normal");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  useEffect(() => {
    return subscribeLiveActivity(() => setLiveTick((n) => n + 1));
  }, []);
  // Opening (or staying on) this screen marks everything as read, clearing the home-screen badge.
  useEffect(() => {
    markAllNotificationsRead();
  }, [liveTick]);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE)
      .then((v) => {
        if (mounted) {
          setDismissed(v ? JSON.parse(v) : []);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function dismiss(key: string) {
    const next = [...new Set([...dismissed, key])];
    setDismissed(next);
    await AsyncStorage.setItem(STORAGE, JSON.stringify(next)).catch(() => {});
  }
  function confirmClear() {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm("Clear displayed notifications?")
      )
        void clearVisible();
      return;
    }
    Alert.alert(
      "Clear notifications?",
      "Only notifications will be dismissed. Sales and products are kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => void clearVisible(),
        },
      ],
    );
  }
  async function clearVisible() {
    const next = [...new Set([...dismissed, ...visible.map((e) => e.key)])];
    setDismissed(next);
    await AsyncStorage.setItem(STORAGE, JSON.stringify(next)).catch(() => {});
  }
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const liveEvents = useMemo(
    () =>
      getLiveActivityLog().map((ev) => ({
        key: ev.id,
        title: `${ev.titleKh} · ${ev.titleEn}`,
        detail: `${ev.detail} · ${new Date(ev.timestampMs || ev.createdAt).toLocaleString()}`,
        danger: false,
      })),
    [liveTick, products],
  );
  const normal = useMemo<Event[]>(
    () => [
      ...liveEvents,
      ...products
        .filter((p) => p.stock <= 0)
        .map((p) => ({
          key: "out:" + p.id,
          title: "Out of stock · អស់ស្តុក",
          detail: p.name,
          danger: true,
        })),
      ...products
        .filter(
          (p) =>
            p.expirationDate &&
            new Date(p.expirationDate + "T23:59:59").getTime() <=
              Date.now() + 7 * 86400000,
        )
        .map((p) => ({
          key: "exp:" + p.id + ":" + p.expirationDate,
          title: "Expired / expires within 7 days",
          detail: p.name + " · " + p.expirationDate,
          danger: true,
        })),
      ...products
        .filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold)
        .map((p) => ({
          key: "low:" + p.id,
          title: "Low stock · ស្តុកជិតអស់",
          detail: p.name + " · " + p.stock + " remaining",
          danger: false,
        })),
    ],
    [products, liveEvents],
  );
  const transactions = useMemo<Event[]>(
    () =>
      sales
        .filter((s) => new Date(s.createdAt).getTime() >= sevenDaysAgo)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((s) => ({
          key: "sale:" + s.id,
          title: "Sale #" + s.id.slice(0, 8).toUpperCase(),
          detail:
            new Date(s.createdAt).toLocaleString() +
            " · " +
            khr(s.totalKhr) +
            " (" +
            money(s.totalUsd) +
            ")",
          danger: false,
          sale: s,
        })),
    [sales],
  );
  const visible = (tab === "normal" ? normal : transactions).filter(
    (e) => !dismissed.includes(e.key),
  );
  return (
    <Screen
      title="Notifications"
      subtitle="Alerts and transactions (last 7 days)"
      tabs={false}
      onBack={() => router.back()}
      onRefresh={refresh}
    >
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {(
          [
            { key: "normal", Icon: Bell, label: "Alerts" },
            { key: "transaction", Icon: ReceiptText, label: "Transactions" },
          ] as const
        ).map((t) => (
          <Press
            key={t.key}
            accessibilityLabel={t.label}
            onPress={() => setTab(t.key)}
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              backgroundColor: tab === t.key ? C.primary : C.pale,
              padding: 14,
              borderRadius: 13,
            }}
          >
            <t.Icon size={22} color={tab === t.key ? "white" : C.primary} />
          </Press>
        ))}
      </View>
      {tab === "normal" && (
        <Press
          accessibilityLabel="Browse expiring and expired products"
          onPress={() => router.push("/inventory?expiry=1" as any)}
          style={{
            padding: 13,
            marginBottom: 10,
            backgroundColor: C.pale,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: C.primary, fontWeight: "800" }}>
            View all expired / expiring products
          </Text>
          <Eye size={19} color={C.primary} />
        </Press>
      )}
      {visible.length > 0 && (
        <Press
          accessibilityLabel="Clear all displayed notifications"
          onPress={confirmClear}
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            alignSelf: "flex-end",
            padding: 10,
            marginBottom: 8,
          }}
        >
          <CheckCheck size={16} color={C.primary} />
        </Press>
      )}
      {!ready ? (
        <ActivityIndicator color={C.primary} />
      ) : visible.length === 0 ? (
        <Empty message="No notifications to show" />
      ) : (
        visible.map((e) => (
          <SwipeActions
            key={e.key}
            onlyDelete
            onDelete={() => {
              if (Platform.OS === "web") {
                void dismiss(e.key);
              } else
                Alert.alert(
                  "Dismiss notification?",
                  "The product or sale will remain available.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Dismiss",
                      style: "destructive",
                      onPress: () => void dismiss(e.key),
                    },
                  ],
                );
            }}
          >
            <Card style={{ marginBottom: 10 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: e.danger ? C.red : C.primary,
                      fontWeight: "800",
                    }}
                  >
                    {e.title}
                  </Text>
                  <Text style={{ color: C.text, marginTop: 5 }}>
                    {e.detail}
                  </Text>
                </View>
                {e.sale && (
                  <Press
                    accessibilityLabel="View receipt"
                    onPress={() => setReceipt(e.sale!)}
                    style={{
                      padding: 10,
                      backgroundColor: C.pale,
                      borderRadius: 11,
                    }}
                  >
                    <Eye size={22} color={C.primary} />
                  </Press>
                )}
              </View>
            </Card>
          </SwipeActions>
        ))
      )}
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>
        Swiping dismisses an alert, but never removes its product or sales
        record. Find expiring items in Inventory → expiry filter.
      </Text>
      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
    </Screen>
  );
}
