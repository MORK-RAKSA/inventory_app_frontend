import { useEffect, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  Check,
  Minus,
  Pencil,
  Plus,
  ScanLine,
  Trash2,
  PackagePlus,
} from "lucide-react-native";
import { api, BatchResult, Product } from "../src/api";
import { useLiveData } from "../src/hooks/useLiveData";
import { useSounds } from "../src/hooks/useSounds";
import { CameraScanner } from "../src/components/CameraScanner";
import { lookupBarcodeOnline } from "../src/barcodeLookup";
import { SwipeActions } from "../src/components/SwipeActions";
import { CategorySelect } from "../src/components/CategorySelect";
import {
  Press,
  Rise,
  fade,
  fadeOut,
  listLayout,
  slideOut,
} from "../src/motion";
import { C, Btn, Card, Field, Screen, Pill, money, khr, roundKhr, ErrorLine } from "../src/ui";
import { useLanguage } from "../src/i18n";
import { useToast } from "../src/toast";
import React from "react";

type Pending = {
  key: string;
  product?: Product;
  name: string;
  barcode: string;
  category: string;
  quantity: number;
  priceUsd: number;
  lowStockThreshold: number;
};

/** Alert.alert with buttons is a no-op on react-native-web, so use window.confirm there. */
function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export default function Batch() {
  const router = useRouter();
  const { products, rate, refresh } = useLiveData("products");
  const [refreshing, setRefreshing] = useState(false);
  const pullRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };
  const { playScan, playFail } = useSounds();
  const { language } = useLanguage();
  const kh = language === "kh";
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [draft, setDraft] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState<Record<string, string>>({});
  useEffect(() => setRaw({}), [draft?.key]);
  const cats = [...new Set(products.map((p) => p.category))];

  function foundCode(raw: string, qty = 1) {
    const code = raw.trim();
    if (!code) return;
    const p = products.find((x) => x.barcode === code);
    if (p) {
      playScan();
      setPending((prev) => {
        const existing = prev.find((x) => x.product?.id === p.id);
        return existing
          ? prev.map((x) =>
              x.key === existing.key ? { ...x, quantity: x.quantity + qty } : x,
            )
          : [
              ...prev,
              {
                key: p.id,
                product: p,
                name: p.name,
                barcode: code,
                category: p.category,
                quantity: qty,
                priceUsd: p.priceUsd,
                lowStockThreshold: p.lowStockThreshold,
              },
            ];
      });
    } else {
      playScan();
      setPending((prev) =>
        prev.some((x) => x.barcode === code)
          ? prev.map((x) =>
              x.barcode === code ? { ...x, quantity: x.quantity + qty } : x,
            )
          : [
              ...prev,
              {
                key: `new-${Date.now()}-${code}`,
                name: "",
                barcode: code,
                category: "General",
                quantity: qty,
                priceUsd: 0,
                lowStockThreshold: 5,
              },
            ],
      );
      void lookupBarcodeOnline(code).then((info) => {
        if (!info) return;
        setPending((prev) =>
          prev.map((x) =>
            x.barcode === code && !x.name.trim()
              ? {
                  ...x,
                  name: info.name,
                  category: info.category || x.category,
                }
              : x,
          ),
        );
      });
    }
  }
  function addManual() {
    setDraft({
      key: `new-${Date.now()}`,
      name: "",
      barcode: "",
      category: "General",
      quantity: 1,
      priceUsd: 0,
      lowStockThreshold: 5,
    });
  }
  function stage() {
    if (
      !draft ||
      !draft.name.trim() ||
      !draft.category.trim() ||
      !Number.isInteger(draft.quantity) ||
      draft.quantity < 0 ||
      draft.priceUsd < 0
    ) {
      setError("Enter valid product name, category, quantity and price");
      return;
    }
    setPending((prev) =>
      prev.some((x) => x.key === draft.key)
        ? prev.map((x) => (x.key === draft.key ? draft : x))
        : [...prev, draft],
    );
    setDraft(null);
    setError("");
  }
  async function save() {
    if (!pending.length) return;
    if (draft) {
      setError(
        kh
          ? "សូមបញ្ចប់ ឬបោះបង់ទម្រង់ទំនិញដែលកំពុងបើកជាមុន"
          : "Finish (Add to pending list) or Cancel the open product form first.",
      );
      return;
    }
    const incomplete = pending.filter((x) => !x.product && (!x.name.trim() || !x.category.trim()));
    if (incomplete.length) {
      setError(
        kh
          ? `ទំនិញថ្មី ${incomplete.length} ត្រូវការឈ្មោះ — សូមបំពេញ`
          : `${incomplete.length} new item(s) need a name. Opening the first one…`,
      );
      setDraft(incomplete[0]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Requires the Spring backend atomic batch endpoint; deliberately never silently creates partial batches.
      const result = await api<BatchResult>("/inventory/batches/commit", {
        method: "POST",
        body: JSON.stringify({
          items: pending.map((p) =>
            p.product
              ? { productId: p.product.id, quantityAdded: p.quantity }
              : {
                  name: p.name,
                  barcode: p.barcode || null,
                  category: p.category,
                  stock: p.quantity,
                  price: p.priceUsd,
                  currency: "USD",
                  lowStockThreshold: p.lowStockThreshold,
                },
          ),
        }),
      });
      setPending([]);
      await refresh();
      toast.show(
        kh
          ? `បានរក្សាទុកស្តុក · ថ្មី ${result.created} · បន្ថែម ${result.restocked}`
          : `${result.created} new · ${result.restocked} restocked`,
        { tone: "success" },
      );
    } catch (e) {
      const m =
        (kh ? "មិនបានរក្សាទុកទេ៖ " : "Batch was not saved: ") +
        (e instanceof Error ? e.message : String(e));
      setError(m);
      toast.show(m, { tone: "error" });
    } finally {
      setBusy(false);
    }
  }
  const removePending = (p: Pending) =>
    confirmAction(
      kh ? "លុបទំនិញនេះ?" : "Remove pending item?",
      `${p.name || p.barcode || "Item"} × ${p.quantity}`,
      kh ? "លុប" : "Remove",
      () => {
        setPending((a) => a.filter((x) => x.key !== p.key));
        if (draft?.key === p.key) setDraft(null);
        setError("");
      },
    );
  const setQty = (key: string, fn: (q: number) => number) =>
    setPending((a) =>
      a.map((x) => (x.key === key ? { ...x, quantity: fn(x.quantity) } : x)),
    );
  const numeric = (
    key: "priceUsd" | "quantity" | "lowStockThreshold",
    label: string,
  ) => (
    <Field
      label={label}
      placeholder={label}
      keyboardType="decimal-pad"
      value={raw[key] ?? (draft ? String(draft[key]) : "")}
      onChangeText={(v) => {
        setRaw((r) => ({ ...r, [key]: v }));
        setDraft((d) => (d ? { ...d, [key]: Number(v) || 0 } : d));
      }}
    />
  );

  return (
    <Screen
      onBack={() => router.back()}
      tabs={false}
      onRefresh={pullRefresh}
      refreshing={refreshing}
      title={kh ? "បញ្ចូលទំនិញច្រើន" : "Batch inventory"}
      subtitle={
        kh
          ? "ស្កេន ឬបញ្ចូលទំនិញច្រើន រួចរក្សាទុកទាំងអស់"
          : "Add or restock multiple items, then save all changes together"
      }
    >
      <Rise
        index={2}
        style={{ flexDirection: "row", gap: 10, marginBottom: 22 }}
      >
        <Btn
          icon={ScanLine}
          style={{ flex: 1 }}
          onPress={() => setScanning(true)}
        >
          {kh ? "ស្កេនបាកូដ" : "Scan barcode"}
        </Btn>
        <Btn soft icon={Plus} style={{ flex: 1 }} onPress={addManual}>
          {kh ? "បញ្ចូលដោយដៃ" : "Manual add"}
        </Btn>
      </Rise>

      <Text
        style={{
          color: C.text,
          fontWeight: "800",
          fontSize: 17,
          marginBottom: 12,
        }}
      >
        {kh ? "ទំនិញរង់ចាំ" : "Pending items"} ({pending.length})
      </Text>
      {pending.length === 0 ? (
        <Animated.View
          entering={fade}
          style={{
            borderStyle: "dashed",
            borderWidth: 1.5,
            borderColor: C.paleStrong,
            borderRadius: 20,
            paddingVertical: 34,
            paddingHorizontal: 14,
            marginBottom: 26,
            alignItems: "center",
            gap: 10,
          }}
        >
          <PackagePlus size={26} color={C.faint} />
          <Text style={{ color: C.muted, textAlign: "center", fontSize: 13 }}>
            {kh
              ? "មិនទាន់មានទំនិញទេ"
              : "Nothing pending. Add as many products as you need."}
          </Text>
        </Animated.View>
      ) : (
        pending.map((p) => (
          <Animated.View
            key={p.key}
            layout={listLayout}
            entering={fade}
            exiting={slideOut}
          >
            <SwipeActions
              onEdit={() => setDraft(p)}
              onDelete={() => removePending(p)}
              deleteLabel={kh ? "លុប" : "Remove"}
            >
              <Card>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: p.name ? C.text : C.amber,
                        fontWeight: "700",
                      }}
                    >
                      {p.name ||
                        (kh ? "ត្រូវបំពេញព័ត៌មាន" : "Details required")}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pill tone={p.product ? "green" : "amber"}>
                        {p.product ? "Restock" : "New"}
                      </Pill>
                      <Text
                        numberOfLines={1}
                        style={{ color: C.muted, fontSize: 11.5, flex: 1 }}
                      >
                        {p.barcode || "No barcode"} · {khr(p.priceUsd * rate)} ({money(p.priceUsd)})
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: C.pale,
                      borderRadius: 14,
                      padding: 2,
                    }}
                  >
                    <Press
                      scale={0.85}
                      onPress={() => setQty(p.key, (q) => Math.max(0, q - 1))}
                      style={{
                        width: 32,
                        height: 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Minus size={15} color={C.primary} />
                    </Press>
                    <Text
                      style={{
                        color: C.text,
                        fontWeight: "800",
                        minWidth: 24,
                        textAlign: "center",
                      }}
                    >
                      {p.quantity}
                    </Text>
                    <Press
                      scale={0.85}
                      onPress={() => setQty(p.key, (q) => q + 1)}
                      style={{
                        width: 32,
                        height: 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={15} color={C.primary} />
                    </Press>
                  </View>
                  <Press
                    scale={0.88}
                    accessibilityLabel="Remove pending item"
                    onPress={() => removePending(p)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: C.redPale,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={16} color={C.red} />
                  </Press>
                </View>
              </Card>
            </SwipeActions>
          </Animated.View>
        ))
      )}

      {draft && (
        <Animated.View entering={fade} exiting={fadeOut} layout={listLayout}>
          <Card>
            <Text
              style={{
                fontSize: 18,
                color: C.text,
                fontWeight: "800",
                marginBottom: 16,
              }}
            >
              {draft.product ? "Update product" : "New product"}
            </Text>
            <Field
              label="Product name"
              placeholder="Product name"
              value={draft.name}
              onChangeText={(v) => setDraft((d) => (d ? { ...d, name: v } : d))}
            />
            {!draft.product && (
              <Field
                label="Barcode"
                placeholder="Barcode"
                value={draft.barcode}
                onChangeText={(v) =>
                  setDraft((d) => (d ? { ...d, barcode: v } : d))
                }
              />
            )}
            <Text
              style={{
                color: C.muted,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 7,
              }}
            >
              Category
            </Text>
            <CategorySelect
              value={draft.category}
              categories={cats}
              onChange={(v) => setDraft((d) => (d ? { ...d, category: v } : d))}
            />
            <Field
              label={kh ? "តម្លៃ (៛ KHR)" : "Price (៛ KHR)"}
              placeholder="0 ៛"
              keyboardType="decimal-pad"
              value={
                raw["priceKhr"] ??
                (draft ? String(roundKhr(draft.priceUsd * rate)) : "")
              }
              onChangeText={(v) => {
                setRaw((r) => ({ ...r, priceKhr: v }));
                const khrVal = Number(v) || 0;
                setDraft((d) =>
                  d ? { ...d, priceUsd: Number((khrVal / rate).toFixed(4)) } : d,
                );
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>{numeric("quantity", "Quantity")}</View>
              <View style={{ flex: 1 }}>
                {numeric("lowStockThreshold", "Low stock at")}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Btn outline onPress={() => setDraft(null)}>
                  {kh ? "បោះបង់" : "Cancel"}
                </Btn>
              </View>
              <View style={{ flex: 1 }}>
                <Btn onPress={stage}>
                  {kh ? "រក្សាទុកក្នុងបញ្ជី" : "Add to pending list"}
                </Btn>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      <ErrorLine message={error} />
      <Btn
        icon={Check}
        loading={busy}
        disabled={!pending.length}
        onPress={() => void save()}
      >
        {`${kh ? "រក្សាទុកទាំងអស់" : "Save all"} (${pending.length})`}
      </Btn>

      <CameraScanner
        visible={scanning}
        count={pending.length}
        onCode={foundCode}
        title={kh ? "ស្កេនទំនិញជាបន្តបន្ទាប់" : "Continuous batch scan"}
        onClose={() => {
          setScanning(false);
          const todo = pending.find((x) => !x.product && !x.name.trim());
          if (todo) setDraft(todo);
        }}
      />
    </Screen>
  );
}
