import { addExpense, type ExpenseInput } from '../expenses';
import { addEntry, seedState } from '../state';
import { buildWorkbook, workbookFileName } from '../workbook';
import { buildXlsx, columnName, crc32, excelDate, zipStored } from '../xlsx';

const NOW = new Date('2026-10-12T10:00:00.000Z');

/** Lee un .zip sin comprimir a partir del directorio central, comprobando el CRC de cada archivo. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50);
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const offset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    const data = bytes.subarray(start, start + size);
    expect(crc32(data)).toBe(crc);
    files.set(name, decoder.decode(data));
    pos += 46 + nameLength;
  }
  return files;
}

describe('zip y Excel', () => {
  it('crc32 da el valor estándar', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('el zip se puede volver a leer', () => {
    const files = unzip(zipStored([{ name: 'a.txt', data: new TextEncoder().encode('hola ñ') }], NOW));
    expect(files.get('a.txt')).toBe('hola ñ');
  });

  it('columnas y fechas como las cuenta Excel', () => {
    expect([0, 25, 26, 27, 701].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ']);
    expect(excelDate('2025-01-01')).toBe(45658);
    expect(excelDate('1900-03-01')).toBe(61);
  });
});

describe('Excel de Taller Moto', () => {
  const expense = (input: ExpenseInput) => (s: ReturnType<typeof seedState>) => addExpense(s, input, NOW);
  let state = seedState();
  state = addEntry(state, 'aceite', { km: 15500, date: '2027-03-01' }, NOW);
  state = expense({ date: '2027-03-01', amount: 40.5, concept: 'Aceite', taskId: 'aceite', km: 15500 })(state);
  state = expense({ date: '2026-09-27', amount: 100, concept: 'Kit <A&B> "C"', place: 'Tienda' })(state);
  const files = unzip(buildXlsx(buildWorkbook(state, NOW), NOW));

  it('lleva todas las piezas de un .xlsx y las cinco hojas', () => {
    for (const name of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml']) {
      expect(files.has(name)).toBe(true);
    }
    const names = [...(files.get('xl/workbook.xml') ?? '').matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toEqual(['Resumen', 'Gastos', 'Trabajos hechos', 'Qué toca', 'Pares de apriete']);
    for (let i = 1; i <= 5; i++) expect(files.has(`xl/worksheets/sheet${i}.xml`)).toBe(true);
  });

  it('gastos: fechas de Excel, texto escapado y fila de total', () => {
    const sheet = files.get('xl/worksheets/sheet2.xml') ?? '';
    expect(sheet).toContain('Kit &lt;A&amp;B&gt; &quot;C&quot;');
    expect(sheet).toContain(`<v>${excelDate('2026-09-27')}</v>`);
    expect(sheet).toContain('<f>SUM(E2:E3)</f><v>140.5</v>');
  });

  it('trabajos hechos: el coste aparece junto al trabajo', () => {
    const sheet = files.get('xl/worksheets/sheet3.xml') ?? '';
    expect(sheet).toMatch(/Aceite.*<v>15500<\/v>.*<v>40.5<\/v>/);
    expect(sheet).toContain('Punto de partida (de fábrica)');
  });

  it('pares: los que no tienen dato salen como «Sin dato», nunca con un número', () => {
    const sheet = files.get('xl/worksheets/sheet5.xml') ?? '';
    expect(sheet).toMatch(/Tornillos de discos de freno.*?Sin dato/);
  });

  it('nombre del archivo con la fecha', () => {
    expect(workbookFileName(new Date(2026, 9, 12))).toBe('taller-moto-2026-10-12.xlsx');
  });
});
