import { formatDate, formatInt } from './format';
import type { History } from './history';
import { A4, type FontName, type Op, type Rgb, buildPdf, textWidth, wrapText } from './pdf';

// Maqueta del historial en PDF: cabecera, tres tablas y un pie con el número de página.

const INK: Rgb = [0.11, 0.13, 0.16];
const MUTED: Rgb = [0.36, 0.4, 0.44];
const RULE: Rgb = [0.82, 0.84, 0.86];
const HEAD_BG: Rgb = [0.94, 0.95, 0.96];

const MARGIN = 42;
const TOP = A4.height - 48;
/** Por debajo de aquí solo va el pie. */
const BOTTOM = 60;
const WIDTH = A4.width - MARGIN * 2;

const CELL = { size: 9, pad: 5, line: 11.5 };

type Column = { title: string; width: number; align?: 'right' };

class Pages {
  pages: Op[][] = [[]];
  /** Línea de arriba de lo siguiente que se escribe. */
  y = TOP;

  private get ops(): Op[] {
    return this.pages[this.pages.length - 1];
  }

  private newPage(): void {
    this.pages.push([]);
    this.y = TOP;
  }

  /** Pasa de página si no caben `height` puntos. */
  fit(height: number): boolean {
    if (this.y - height >= BOTTOM) return false;
    this.newPage();
    return true;
  }

  text(x: number, baseline: number, text: string, size: number, font: FontName, color: Rgb): void {
    this.ops.push({ kind: 'text', x, y: baseline, size, font, text, color });
  }

  paragraph(text: string, size: number, font: FontName, color: Rgb, after = 4): void {
    const height = size * 1.3;
    for (const line of wrapText(text, font, size, WIDTH)) {
      this.fit(height);
      this.text(MARGIN, this.y - size, line, size, font, color);
      this.y -= height;
    }
    this.y -= after;
  }

  heading(text: string): void {
    // El título no se queda solo al final de una página: va con al menos una fila debajo.
    this.fit(18 + 2 * (CELL.pad * 2 + CELL.line));
    this.y -= 14;
    this.text(MARGIN, this.y - 13, text, 13, 'bold', INK);
    this.y -= 13 + 8;
  }

  private row(columns: Column[], cells: string[], font: FontName, color: Rgb, fill?: Rgb): void {
    const lines = cells.map((cell, i) => wrapText(cell, font, CELL.size, columns[i].width - CELL.pad * 2));
    const height = CELL.pad * 2 + CELL.size + (Math.max(...lines.map((l) => l.length)) - 1) * CELL.line;
    if (fill) this.ops.push({ kind: 'rect', x: MARGIN, y: this.y - height, w: WIDTH, h: height, fill });
    let x = MARGIN;
    columns.forEach((column, i) => {
      lines[i].forEach((line, n) => {
        const baseline = this.y - CELL.pad - CELL.size * 0.8 - n * CELL.line;
        const left =
          column.align === 'right' ? x + column.width - CELL.pad - textWidth(line, font, CELL.size) : x + CELL.pad;
        this.text(left, baseline, line, CELL.size, font, color);
      });
      x += column.width;
    });
    this.y -= height;
    this.ops.push({ kind: 'line', x1: MARGIN, y1: this.y, x2: MARGIN + WIDTH, y2: this.y, width: 0.5, color: RULE });
  }

  /** Tabla que sigue en la página siguiente si no cabe, repitiendo la cabecera. */
  table(columns: Column[], rows: string[][]): void {
    const header = () => this.row(columns, columns.map((c) => c.title), 'bold', MUTED, HEAD_BG);
    header();
    for (const cells of rows) {
      const lines = cells.map((cell, i) => wrapText(cell, 'regular', CELL.size, columns[i].width - CELL.pad * 2));
      const height = CELL.pad * 2 + CELL.size + (Math.max(...lines.map((l) => l.length)) - 1) * CELL.line;
      if (this.fit(height)) header();
      this.row(columns, cells, 'regular', INK);
    }
  }
}

/** Columnas con anchos fijos; la marcada con 0 se queda con lo que sobra. */
function columns(list: Column[]): Column[] {
  const fixed = list.reduce((sum, c) => sum + c.width, 0);
  return list.map((c) => (c.width === 0 ? { ...c, width: WIDTH - fixed } : c));
}

export function buildHistoryPdf(history: History): Uint8Array<ArrayBuffer> {
  const doc = new Pages();
  doc.paragraph('HISTORIAL DE MANTENIMIENTO', 9, 'bold', MUTED, 2);
  doc.paragraph(history.bike, 20, 'bold', INK, 0);
  doc.paragraph(history.detail, 11, 'regular', MUTED, 6);
  doc.paragraph(
    `${formatInt(history.km)} km${history.kmDate ? `, apuntados el ${formatDate(history.kmDate)}` : ''}. ` +
      `Generado el ${formatDate(history.generated)} con la app Taller Moto, con los datos que ha apuntado el propietario.`,
    10,
    'regular',
    INK,
  );

  doc.heading('Trabajos hechos');
  if (history.visits.length === 0) doc.paragraph('Aún no hay trabajos apuntados.', 10, 'regular', MUTED);
  else
    doc.table(
      columns([
        { title: 'Fecha', width: 64 },
        { title: 'Km', width: 56, align: 'right' },
        { title: 'Trabajos', width: 0 },
        { title: 'Dónde', width: 128 },
      ]),
      history.visits.map((v) => [formatDate(v.date), formatInt(v.km), v.jobs.join(', '), v.place ?? '']),
    );

  doc.heading('Recambios comprados');
  if (history.parts.length === 0) doc.paragraph('Aún no hay recambios apuntados.', 10, 'regular', MUTED);
  else
    doc.table(
      columns([
        { title: 'Comprado', width: 64 },
        { title: 'Recambio', width: 0 },
        { title: 'Dónde', width: 120 },
        { title: 'Montado', width: 74 },
      ]),
      history.parts.map((p) => [
        formatDate(p.date),
        p.concept,
        p.place ?? '',
        p.mountedOn ? formatDate(p.mountedOn) : p.hasJob ? 'Sin montar' : '',
      ]),
    );

  doc.heading('Próximos mantenimientos');
  doc.table(
    columns([
      { title: 'Trabajo', width: 150 },
      { title: 'Estado', width: 64 },
      { title: 'Detalle', width: 0 },
    ]),
    history.plan.map((p) => [p.name, p.status, p.detail]),
  );

  // Pie con el número de página, cuando ya se sabe cuántas hay.
  const total = doc.pages.length;
  doc.pages.forEach((ops, i) => {
    const page = `Página ${i + 1} de ${total}`;
    ops.push(
      { kind: 'line', x1: MARGIN, y1: 44, x2: MARGIN + WIDTH, y2: 44, width: 0.5, color: RULE },
      { kind: 'text', x: MARGIN, y: 32, size: 8, font: 'regular', text: `Historial de mantenimiento · ${history.bike}`, color: MUTED },
      { kind: 'text', x: MARGIN + WIDTH - textWidth(page, 'regular', 8), y: 32, size: 8, font: 'regular', text: page, color: MUTED },
    );
  });
  return buildPdf(doc.pages, `Historial de mantenimiento · ${history.bike}`);
}
