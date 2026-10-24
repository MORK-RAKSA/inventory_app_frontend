import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export async function exportExcel(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  try {
    const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const sheet = XLSX.utils.aoa_to_sheet([
      headers,
      ...rows.map((row) => row.map((value) => value ?? '')),
    ]);
    sheet['!cols'] = headers.map((header, i) => {
      const maxContent = rows.reduce(
        (max, r) => Math.max(max, String(r[i] ?? '').length + 2),
        header.length + 3,
      );
      return { wch: Math.min(42, maxContent) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'RetailFlow');

    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, safeName);
      return;
    }

    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }) as string;
    const file = new File(Paths.cache, safeName);
    file.create({ overwrite: true });
    file.write(base64, { encoding: 'base64' });

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Excel file saved', file.uri);
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Export Excel',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  } catch (e) {
    Alert.alert('Excel export failed', String(e instanceof Error ? e.message : e));
  }
}



