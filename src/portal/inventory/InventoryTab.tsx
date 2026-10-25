import { View } from 'react-native';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { StockFilter } from './columns';
import { InventoryCategoryFilter } from './InventoryCategoryFilter';
import { InventoryRow } from './InventoryRow';
import { InventoryTableHeader } from './InventoryTableHeader';
import { InventoryToolbar } from './InventoryToolbar';

export function InventoryTab({ portal }: { portal: PortalController }) {
  const {
    archiveProduct,
    categories,
    filteredInventory,
    handleExportInventory,
    handleHardwareBarcodeScan,
    invCat,
    invSearch,
    invStatusFilter,
    openBatchModal,
    openCreateProduct,
    openEditProduct,
    quickRestock,
    rate,
    setInvCat,
    setInvSearch,
    setInvStatusFilter,
    tr,
  } = portal;

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
      <InventoryToolbar
        search={invSearch}
        onSearchChange={setInvSearch}
        onScanSubmit={(code) => void handleHardwareBarcodeScan(code)}
        statusFilter={invStatusFilter as StockFilter}
        onStatusFilterChange={setInvStatusFilter}
        onExport={() => handleExportInventory(filteredInventory)}
        onOpenBatch={() => openBatchModal()}
        onCreateProduct={() => openCreateProduct()}
        tr={tr}
      />

      <InventoryCategoryFilter
        categories={categories}
        activeCategory={invCat}
        onSelect={setInvCat}
      />

      <InventoryTableHeader />

      {filteredInventory.map((p) => (
        <InventoryRow
          key={p.id}
          product={p}
          rate={rate}
          onRestock={(product, delta) => void quickRestock(product, delta)}
          onEdit={openEditProduct}
          onArchive={(product) => void archiveProduct(product)}
        />
      ))}
    </View>
  );
}
