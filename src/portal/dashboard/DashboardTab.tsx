import { Text, View } from 'react-native';
import { AlertTriangle, ArrowUpRight, Layers, TrendingUp } from 'lucide-react-native';
import { khr, money } from '../../theme';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { KpiCard } from './KpiCard';
import { LiveAlertsPanel } from './LiveAlertsPanel';
import { RecentTransactionsTable } from './RecentTransactionsTable';
import { RevenueBarChart } from './RevenueBarChart';

export function DashboardTab({ portal }: { portal: PortalController }) {
  const {
    activeSales,
    chartDays,
    handleExportSales,
    inventoryValueKhr,
    inventoryValueUsd,
    isCompact,
    liveFeed,
    lowStockProducts,
    maxDayKhr,
    products,
    quickRestock,
    rate,
    setActiveReceipt,
    setTab,
    todayKhr,
    todaySales,
    todayUsd,
    totalUnits,
    tr,
    user,
    weekKhr,
    weekSales,
    weekUsd,
  } = portal;

  const hasLowStock = lowStockProducts.length > 0;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={{ gap: 18 }}>
      {/* Greeting */}
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          alignItems: isCompact ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 2,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: P.muted,
              fontSize: 9.5,
              fontWeight: '800',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {tr("Today's overview", 'ផ្ទាំងគ្រប់គ្រងថ្ងៃនេះ')}
          </Text>
          <Text
            style={{
              color: P.text,
              fontSize: isCompact ? 22 : 27,
              fontWeight: '800',
              letterSpacing: -1,
              marginTop: 3,
            }}
          >
            {tr(`Hi ${user} , Welcome back !`, `សួស្តី ${user} , សូមស្វាគមន៍!`)}
          </Text>
          <Text style={{ color: P.muted, fontSize: 12, marginTop: 4 }}>
            {today} ·{' '}
            {tr(
              `${todaySales.length} orders today · ${activeSales.length} receipts`,
              `${todaySales.length} វិក្កយបត្រថ្ងៃនេះ · ${activeSales.length} ក្នុងបញ្ជី`
            )}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 14,
            backgroundColor: P.surface,
            borderWidth: 1,
            borderColor: P.glassBorder,
          }}
        >
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: P.emerald }} />
          <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '800' }}>
            1$ = {khr(rate)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <KpiCard
          label={tr("Today's Revenue", 'ចំណូលថ្ងៃនេះ')}
          value={khr(todayKhr)}
          detail={`${money(todayUsd)} · ${todaySales.length} ${tr('orders today', 'វិក្កយបត្រថ្ងៃនេះ')}`}
          icon={<TrendingUp size={17} color={P.primary} />}
          iconBg={P.primaryLight}
        />
        <KpiCard
          label={tr('7-Day Revenue', 'ចំណូល ៧ ថ្ងៃ')}
          value={khr(weekKhr)}
          detail={`${money(weekUsd)} · ${weekSales.length} ${tr('completed sales', 'ការលក់សរុប')}`}
          icon={<ArrowUpRight size={17} color={P.emerald} />}
          iconBg={P.emeraldLight}
          detailColor={P.emerald}
        />
        <KpiCard
          label={tr('Stock Valuation', 'តម្លៃស្តុកសរុប')}
          value={khr(inventoryValueKhr)}
          detail={`${money(inventoryValueUsd)} · ${totalUnits.toLocaleString()} ${tr('units', 'ឯកតា')}`}
          icon={<Layers size={17} color={P.teal} />}
          iconBg={P.tealLight}
        />
        <KpiCard
          label={tr('Low Stock Alerts', 'ទំនិញជិតអស់ស្តុក')}
          value={`${lowStockProducts.length} SKUs`}
          detail={`${products.length} ${tr('total catalog items', 'មុខទំនិញសរុប')}`}
          icon={<AlertTriangle size={17} color={hasLowStock ? P.amber : P.emerald} />}
          iconBg={hasLowStock ? P.amberLight : P.emeraldLight}
          valueColor={hasLowStock ? P.amber : P.emerald}
        />
      </View>

      <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 16 }}>
        <RevenueBarChart
          days={chartDays}
          maxTotal={maxDayKhr}
          onViewAll={() => setTab('sales')}
          tr={tr}
        />
        <LiveAlertsPanel
          liveFeed={liveFeed}
          lowStockProducts={lowStockProducts}
          rate={rate}
          onManage={() => setTab('inventory')}
          onRestock={(p, delta) => void quickRestock(p, delta)}
          tr={tr}
        />
      </View>

      <RecentTransactionsTable
        sales={activeSales}
        onOpen={setActiveReceipt}
        onExport={() => handleExportSales(activeSales)}
        tr={tr}
      />
    </View>
  );
}
