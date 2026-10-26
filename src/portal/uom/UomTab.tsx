import { Text, View } from 'react-native';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { UomHeader } from './UomHeader';
import { UomKpiCards } from './UomKpiCards';
import { UomProductRow } from './UomProductRow';
import { UomSearchBar } from './UomSearchBar';
import { UomTableHeader } from './UomTableHeader';
import { UomTemplateManager } from './UomTemplateManager';

export function UomTab({ portal }: { portal: PortalController }) {
  const {
    deleteUomConfigAction,
    openCreateUomModal,
    openCreateUomProduct,
    openEditProduct,
    products,
    rate,
    setUomSearch,
    tr,
    uomConfigs,
    uomSearch,
  } = portal;

  const visibleProducts = products.filter((p) => {
    if (!uomSearch) return true;
    const q = uomSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.baseUnit || '').toLowerCase().includes(q) ||
      (p.caseUnitName || '').toLowerCase().includes(q)
    );
  });

  return (
    <View
      style={{
        backgroundColor: P.surface,
        borderRadius: 16,
        padding: 22,
        borderWidth: 1,
        borderColor: P.border,
      }}
    >
      <UomHeader products={products} onCreateUomProduct={() => openCreateUomProduct()} tr={tr} />

      <UomKpiCards products={products} tr={tr} />

      <UomTemplateManager
        configs={uomConfigs}
        onCreate={openCreateUomModal}
        onDelete={(config) => void deleteUomConfigAction(config)}
        tr={tr}
      />

      {/* UOM Summary Stats */}
      <View style={{ marginBottom: 10, marginTop: 10 }}>
        <Text style={{ color: P.text, fontSize: 14, fontWeight: '800' }}>
          {tr('UOM Configuration Summary', 'ការការណ៍សម្រាប់ UOM')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700' }}>
              {tr('Total UOM Templates', 'ជនជីរទម្រង់ UOM')}
            </Text>
            <Text style={{ color: P.text, fontSize: 24, fontWeight: '800' }}>
              {uomConfigs.length}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700' }}>
              {tr('Active Products', 'ថ្មីរួមជាកេស')}
            </Text>
            <Text style={{ color: P.text, fontSize: 24, fontWeight: '800' }}>
              {products.length}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700' }}>
              {tr('With Case Config', 'មានកំណត់កេសរួម')}
            </Text>
            <Text style={{ color: P.text, fontSize: 24, fontWeight: '800' }}>
              {products.filter((p) => Boolean(p.caseQty)).length}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
          {tr('Products Linked to Packaging UOM', 'ទំនិញដែលបានកំណត់ឯកតា UOM')}
        </Text>
      </View>

      <UomSearchBar search={uomSearch} onSearchChange={setUomSearch} tr={tr} />

      <UomTableHeader tr={tr} />

      {visibleProducts.map((p) => (
        <UomProductRow key={p.id} product={p} rate={rate} onEdit={openEditProduct} tr={tr} />
      ))}
    </View>
  );
}
