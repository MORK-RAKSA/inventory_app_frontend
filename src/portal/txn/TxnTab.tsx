import { AppText as Text } from '../../components/AppText';
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
        onRangeChange={range=>{portal.setSalesFrom('');portal.setSalesTo('');setSalesRange(range);}}
        onExport={() => handleExportSales(filteredSales)}
      />

      <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center',marginBottom:18}}>
        <label style={{color:P.muted,fontSize:13}}>From <input aria-label="Sales start date" type="date" value={portal.salesFrom} onChange={e=>portal.setSalesFrom(e.target.value)} style={{padding:10,borderRadius:8,border:'1px solid #DDD6EE',background:'white'}} /></label>
        <label style={{color:P.muted,fontSize:13}}>To <input aria-label="Sales end date" type="date" value={portal.salesTo} min={portal.salesFrom} onChange={e=>portal.setSalesTo(e.target.value)} style={{padding:10,borderRadius:8,border:'1px solid #DDD6EE',background:'white'}} /></label>
        <button onClick={()=>{portal.setSalesFrom('');portal.setSalesTo('');}} style={{padding:10,borderRadius:8,border:'1px solid #DDD6EE',background:'white',cursor:'pointer'}}>Clear dates</button>
        <Text style={{fontSize:11,color:P.muted}}>Phnom Penh time · inclusive dates</Text>
      </View>
      {!!portal.salesDateError && <Text style={{color:P.rose,marginBottom:12}}>{portal.salesDateError}</Text>}
      <TxnLedgerHeader />

      {filteredSales.map((s) => (
        <TxnLedgerRow key={s.id} sale={s} onPress={() => setActiveReceipt(s)} />
      ))}
    </View>
  );
}
