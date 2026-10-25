import { View } from 'react-native';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { SalesRange } from './columns';
import { TxnFilterBar } from './TxnFilterBar';
import { TxnLedgerHeader } from './TxnLedgerHeader';
import { TxnLedgerRow } from './TxnLedgerRow';

export function TxnTab({ portal }: { portal: PortalController }) {
  const {
    filteredSales,
    handleExportSales,
    salesRange,
    salesSearch,
    setActiveReceipt,
    setSalesRange,
    setSalesSearch,
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
      <TxnFilterBar
        search={salesSearch}
        onSearchChange={setSalesSearch}
        range={salesRange as SalesRange}
        onRangeChange={setSalesRange}
        onExport={() => handleExportSales(filteredSales)}
      />

      <TxnLedgerHeader />

      {filteredSales.map((s) => (
        <TxnLedgerRow key={s.id} sale={s} onPress={() => setActiveReceipt(s)} />
      ))}
    </View>
  );
}
