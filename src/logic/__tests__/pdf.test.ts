import { A4, type Op, buildPdf, textWidth, wrapText } from '../pdf';

const INK = [0, 0, 0] as const;
const latin1 = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');
const text = (t: string, y = 700): Op => ({ kind: 'text', x: 40, y, size: 10, font: 'regular', text: t, color: INK });

describe('medidas del texto', () => {
  it('suma los anchos de Helvetica', () => {
    // H 722 + o 556 + l 222 + a 556, a 10 puntos.
    expect(textWidth('Hola', 'regular', 10)).toBeCloseTo(20.56);
    expect(textWidth('Hola', 'bold', 10)).toBeGreaterThan(textWidth('Hola', 'regular', 10));
  });

  it('corta en líneas que caben, y parte una palabra que no cabe sola', () => {
    const lines = wrapText('Cadena: engrasar y revisar holgura, Revisar pastillas y discos', 'regular', 9, 120);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(textWidth(line, 'regular', 9)).toBeLessThanOrEqual(120);
    expect(lines.join(' ')).toBe('Cadena: engrasar y revisar holgura, Revisar pastillas y discos');
    const long = wrapText('Supercalifragilísticoespialidoso', 'regular', 10, 40);
    for (const line of long) expect(textWidth(line, 'regular', 10)).toBeLessThanOrEqual(40);
    expect(long.join('')).toBe('Supercalifragilísticoespialidoso');
  });
});

describe('archivo PDF', () => {
  const pdf = buildPdf([[text('Revisión (taller) a 9.531 km · 21,50 € «ok» ≈')], [text('Página 2')]], 'Historial de prueba');
  const raw = latin1(pdf);

  it('tiene cabecera, final y una entrada de la tabla xref por objeto en su sitio', () => {
    expect(raw.startsWith('%PDF-1.4\n')).toBe(true);
    expect(raw.endsWith('%%EOF\n')).toBe(true);
    const xrefAt = Number(/startxref\n(\d+)\n/.exec(raw)?.[1]);
    expect(raw.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const entries = raw.slice(xrefAt).match(/^\d{10} 00000 n $/gm) ?? [];
    // 5 objetos fijos y 2 por página.
    expect(entries).toHaveLength(9);
    entries.forEach((entry, i) => {
      const offset = Number(entry.slice(0, 10));
      expect(raw.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
    expect(raw).toContain('/Count 2');
  });

  it('escribe el texto en WinAnsi y escapa los paréntesis', () => {
    expect(raw).toContain('(Revisi\xf3n \\(taller\\) a 9.531 km \xb7 21,50 \x80 \xabok\xbb ?) Tj');
  });

  it('la longitud de cada contenido coincide con sus bytes', () => {
    for (const match of raw.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const start = (match.index ?? 0) + match[0].length;
      expect(raw.slice(start + Number(match[1]), start + Number(match[1]) + 10)).toBe('\nendstream');
    }
  });

  it('las páginas son A4', () => {
    expect(raw).toContain(`/MediaBox [0 0 ${A4.width} ${A4.height}]`);
  });
});
