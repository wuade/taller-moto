import { HELVETICA, HELVETICA_BOLD } from './helvetica';

// PDF hecho a mano, como el Excel: texto, líneas y rectángulos en páginas A4, sin dependencias.
// Usa Helvetica, una de las fuentes que trae cualquier lector de PDF, así que no hay que incrustar ninguna.
// El texto va en WinAnsi: letras latinas con tildes, ñ, €, « » y ·. Lo demás sale como «?».

export type FontName = 'regular' | 'bold';
/** Color con cada componente de 0 a 1. */
export type Rgb = readonly [number, number, number];

export type Op =
  | { kind: 'text'; x: number; y: number; size: number; font: FontName; text: string; color: Rgb }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: Rgb }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: Rgb };

/** A4 en puntos. El origen (0, 0) es la esquina de abajo a la izquierda. */
export const A4 = { width: 595.28, height: 841.89 } as const;

const WIN_ANSI_EXTRA: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a,
  '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
};
const QUESTION = 0x3f;

/** Código WinAnsi de un carácter; «?» si la fuente no lo tiene. */
function winAnsi(ch: string): number {
  const code = ch.codePointAt(0) ?? QUESTION;
  if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return code;
  return WIN_ANSI_EXTRA[ch] ?? QUESTION;
}

/** Ancho del texto en puntos. */
export function textWidth(text: string, font: FontName, size: number): number {
  const widths = font === 'bold' ? HELVETICA_BOLD : HELVETICA;
  let units = 0;
  for (const ch of text) units += widths[winAnsi(ch) - 32];
  return (units * size) / 1000;
}

/** Corta un texto en líneas que caben en el ancho dado. Una palabra que no cabe sola se parte. */
export function wrapText(text: string, font: FontName, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, font, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      // Palabra más larga que la línea: se parte por caracteres.
      let rest = word;
      while (textWidth(rest, font, size) > maxWidth) {
        let cut = 1;
        while (cut < rest.length && textWidth(rest.slice(0, cut + 1), font, size) <= maxWidth) cut++;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

const num = (n: number) => String(Math.round(n * 100) / 100);
const color = (c: Rgb) => c.map(num).join(' ');

/** Bytes de un texto como cadena literal de PDF: (texto) con \ ( ) escapados. */
function literal(text: string): number[] {
  const bytes = [0x28];
  for (const ch of text) {
    const b = winAnsi(ch);
    if (b === 0x28 || b === 0x29 || b === 0x5c) bytes.push(0x5c);
    bytes.push(b);
  }
  bytes.push(0x29);
  return bytes;
}

const ascii = (s: string) => Array.from(s, (ch) => ch.charCodeAt(0));

/** Añade bytes sin «...», que en el iPhone falla con listas muy largas. */
function append(target: number[], bytes: number[]): void {
  for (const b of bytes) target.push(b);
}

function contentStream(ops: Op[]): number[] {
  const out: number[] = [];
  for (const op of ops) {
    if (op.kind === 'rect') {
      append(out, ascii(`${color(op.fill)} rg ${num(op.x)} ${num(op.y)} ${num(op.w)} ${num(op.h)} re f\n`));
    } else if (op.kind === 'line') {
      append(out, ascii(`${num(op.width)} w ${color(op.color)} RG ${num(op.x1)} ${num(op.y1)} m ${num(op.x2)} ${num(op.y2)} l S\n`));
    } else {
      const font = op.font === 'bold' ? 'F2' : 'F1';
      append(out, ascii(`BT /${font} ${num(op.size)} Tf ${color(op.color)} rg ${num(op.x)} ${num(op.y)} Td `));
      append(out, literal(op.text));
      append(out, ascii(' Tj ET\n'));
    }
  }
  return out;
}

/** Título del documento en UTF-16, que es como lo leen bien todos los lectores. */
function utf16Hex(text: string): string {
  let hex = 'FEFF';
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
  return `<${hex}>`;
}

/** Crea el PDF con una lista de operaciones por página. */
export function buildPdf(pages: Op[][], title: string): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  const offsets: number[] = [];
  // Los bytes > 127 de la segunda línea avisan de que el archivo es binario.
  append(out, [...ascii('%PDF-1.4\n%'), 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
  const object = (id: number, ...body: number[][]) => {
    offsets[id] = out.length;
    append(out, ascii(`${id} 0 obj\n`));
    for (const part of body) append(out, part);
    append(out, ascii('\nendobj\n'));
  };

  // 1 catálogo, 2 páginas, 3 y 4 fuentes, 5 información; luego cada página y su contenido.
  const pageIds = pages.map((_, i) => 6 + i * 2);
  object(1, ascii('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2, ascii(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`));
  object(3, ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  object(4, ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
  object(5, ascii(`<< /Title ${utf16Hex(title)} /Producer (Taller Moto) >>`));
  pages.forEach((ops, i) => {
    const pageId = pageIds[i];
    object(
      pageId,
      ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(A4.width)} ${num(A4.height)}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
      ),
    );
    const stream = contentStream(ops);
    object(pageId + 1, ascii(`<< /Length ${stream.length} >>\nstream\n`), stream, ascii('\nendstream'));
  });

  const size = 6 + pages.length * 2;
  const xref = out.length;
  append(out, ascii(`xref\n0 ${size}\n0000000000 65535 f \n`));
  for (let id = 1; id < size; id++) append(out, ascii(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`));
  append(out, ascii(`trailer\n<< /Size ${size} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return Uint8Array.from(out);
}
