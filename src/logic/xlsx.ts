// Excel (.xlsx) sin librerías: un .zip sin comprimir con las hojas en XML (SpreadsheetML).
// Basta para que lo abran Excel, Numbers, LibreOffice y la vista previa del iPhone.

export type Cell =
  | string
  | number
  | null
  /** "AAAA-MM-DD"; se ve como fecha y se puede ordenar. */
  | { date: string }
  /** Número entero con separador de miles (km). */
  | { int: number }
  | { euros: number }
  /** Suma de un rango ("E2:E9") en euros y negrita; value es el resultado, para quien no recalcula. */
  | { sum: string; value: number };

export type Sheet = { name: string; widths: number[]; header: string[]; rows: Cell[][] };

// Posición de cada formato en cellXfs de styles.xml.
const Style = { Header: 1, Date: 2, Int: 3, Euros: 4, Total: 5 } as const;

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function escapeXml(text: string): string {
  // XML no admite caracteres de control salvo tabulador y saltos de línea.
  const allowed = [...text].filter((ch) => ch >= ' ' || ch === '\t' || ch === '\n' || ch === '\r').join('');
  return allowed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

/** Días desde el 30/12/1899, como guarda Excel las fechas. */
export function excelDate(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

function cellXml(ref: string, cell: Cell, header: boolean): string {
  if (cell === null) return '';
  if (typeof cell === 'string') {
    const s = header ? ` s="${Style.Header}"` : '';
    return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
  }
  if (typeof cell === 'number') return Number.isFinite(cell) ? `<c r="${ref}"><v>${cell}</v></c>` : '';
  if ('date' in cell) return `<c r="${ref}" s="${Style.Date}"><v>${excelDate(cell.date)}</v></c>`;
  if ('int' in cell) return `<c r="${ref}" s="${Style.Int}"><v>${Math.round(cell.int)}</v></c>`;
  if ('euros' in cell) return `<c r="${ref}" s="${Style.Euros}"><v>${cell.euros}</v></c>`;
  return `<c r="${ref}" s="${Style.Total}"><f>SUM(${cell.sum})</f><v>${cell.value}</v></c>`;
}

function sheetXml(sheet: Sheet): string {
  const rows = [sheet.header, ...sheet.rows].map((cells, r) => {
    const xml = cells.map((cell, c) => cellXml(`${columnName(c)}${r + 1}`, cell, r === 0)).join('');
    return `<row r="${r + 1}">${xml}</row>`;
  });
  const cols = sheet.widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');
  return (
    `${XML}<worksheet xmlns="${MAIN}">` +
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '</sheetView></sheetViews>' +
    `<cols>${cols}</cols><sheetData>${rows.join('')}</sheetData></worksheet>`
  );
}

const STYLES =
  `${XML}<styleSheet xmlns="${MAIN}">` +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** Nombre de hoja válido en Excel: sin []:*?/\ y como mucho 31 caracteres. */
function sheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);
}

export function buildXlsx(sheets: Sheet[], now: Date): Uint8Array<ArrayBuffer> {
  const n = sheets.length;
  const sheetList = sheets
    .map((s, i) => `<sheet name="${escapeXml(sheetName(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  const sheetRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('');
  const sheetTypes = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('');

  const files: [string, string][] = [
    [
      '[Content_Types].xml',
      `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        `${sheetTypes}</Types>`,
    ],
    [
      '_rels/.rels',
      `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      `${XML}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>${sheetList}</sheets>` +
        '<calcPr fullCalcOnLoad="1"/></workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}` +
        `<Relationship Id="rId${n + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    ],
    ['xl/styles.xml', STYLES],
    ...sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
  const encoder = new TextEncoder();
  return zipStored(
    files.map(([name, xml]) => ({ name, data: encoder.encode(xml) })),
    now,
  );
}

// --- .zip sin compresión (método "stored") ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipStored(files: { name: string; data: Uint8Array }[], now: Date): Uint8Array<ArrayBuffer> {
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = (Math.max(now.getFullYear() - 1980, 0) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const encoder = new TextEncoder();
  const entries = files.map((f) => ({ ...f, nameBytes: encoder.encode(f.name), crc: crc32(f.data) }));
  const localSize = entries.reduce((n, e) => n + 30 + e.nameBytes.length + e.data.length, 0);
  const centralSize = entries.reduce((n, e) => n + 46 + e.nameBytes.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let pos = 0;
  const u16 = (v: number) => {
    view.setUint16(pos, v, true);
    pos += 2;
  };
  const u32 = (v: number) => {
    view.setUint32(pos, v >>> 0, true);
    pos += 4;
  };
  const bytes = (b: Uint8Array) => {
    out.set(b, pos);
    pos += b.length;
  };

  const offsets: number[] = [];
  for (const e of entries) {
    offsets.push(pos);
    u32(0x04034b50);
    u16(20); // versión necesaria
    u16(0x0800); // nombres en UTF-8
    u16(0); // sin compresión
    u16(time);
    u16(date);
    u32(e.crc);
    u32(e.data.length);
    u32(e.data.length);
    u16(e.nameBytes.length);
    u16(0);
    bytes(e.nameBytes);
    bytes(e.data);
  }
  const centralStart = pos;
  entries.forEach((e, i) => {
    u32(0x02014b50);
    u16(20); // hecho por
    u16(20); // versión necesaria
    u16(0x0800);
    u16(0);
    u16(time);
    u16(date);
    u32(e.crc);
    u32(e.data.length);
    u32(e.data.length);
    u16(e.nameBytes.length);
    u16(0); // extra
    u16(0); // comentario
    u16(0); // disco
    u16(0); // atributos internos
    u32(0); // atributos externos
    u32(offsets[i]);
    bytes(e.nameBytes);
  });
  const centralEnd = pos;
  u32(0x06054b50);
  u16(0);
  u16(0);
  u16(entries.length);
  u16(entries.length);
  u32(centralEnd - centralStart);
  u32(centralStart);
  u16(0);
  return out;
}
