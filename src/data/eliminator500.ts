// Datos de la Kawasaki Eliminator 500 SE (EL450) de Alex.
//
// Origen: carpeta E:\Vehiculos\Kawasaki Eliminator 500 SE
//  - Excel "Control mantenimiento Eliminator 500.xlsx" (pestañas Pares de Apriete,
//    Plan Mantenimiento Oficial, Historial y Hoja de Trabajo).
//  - "Manual propietario 2024 - Mantenimiento (EN, oficial).pdf": comprobadas a mano
//    las págs. 101-103 (plan periódico), 108 (aceite), 117-118 (cadena) y 120 (eje).
//
// Regla: ningún par de apriete se inventa. Un valor sin documento va con nm: null
// y la app lo muestra como "Sin dato: no apretar a ojo".

export type Confidence = 'doc' | 'foto' | 'cita' | 'probable' | 'nodata';

export type Torque = {
  part: string;
  nm: number | null;
  conf: Confidence;
  src: string;
};

export type Step = {
  text: string;
  torque?: TorqueKey;
};

export type Task = {
  id: string;
  name: string;
  everyKm: number | null;
  everyMonths: number | null;
  /** Km antes del vencimiento a partir de los que avisa (columna "Avisar a" del Excel). */
  warnKm?: number;
  /** De dónde sale el intervalo. */
  intervalSource: string;
  /** Piezas compradas y sin montar. */
  pending?: string;
  note?: string;
  tools: string;
  steps: Step[];
};

export type LogEntry = { km: number; date: string };

export const CONFIDENCE: Record<Confidence, { tag: string; note: string }> = {
  doc: { tag: 'Oficial', note: 'Comprobado en tu manual de propietario.' },
  foto: {
    tag: 'Oficial',
    note: 'Manual de servicio, por foto en eliminatorforum.com. No está en tu carpeta.',
  },
  cita: {
    tag: 'Cita del manual',
    note: 'Un usuario del foro con el manual de servicio lo copió en texto. Contrástalo si puedes.',
  },
  probable: {
    tag: 'Probable',
    note: 'Dato oficial de la Ninja 400, que usa las mismas piezas. Verifícalo.',
  },
  nodata: { tag: 'Sin dato', note: 'No hay documento fiable. No apretar a ojo.' },
};

const OM = 'Manual de propietario Eliminator 2024';
const SM_QUOTE = 'Manual de servicio, cita en eliminatorforum.com';
const SM_PHOTO = 'Manual de servicio, foto en eliminatorforum.com';
const NINJA = 'Ninja 400 Assembly & Prep. Manual 99931-1586';

export const TORQUES = {
  ejeDel: { part: 'Tuerca eje delantero (M16)', nm: 98, conf: 'cita', src: `${SM_QUOTE} (02/01/2026)` },
  ejeTras: { part: 'Tuerca eje trasero (M16)', nm: 98, conf: 'doc', src: `${OM}, p. 120` },
  pinzaTras: {
    part: 'Tornillos pinza trasera (M8)',
    nm: 30,
    conf: 'cita',
    src: `${SM_QUOTE} (10/04/2026). Ojo: 30, no 25`,
  },
  pasadores: { part: 'Pasadores de pastillas', nm: 17.2, conf: 'cita', src: `${SM_QUOTE} (10/04/2026)` },
  pinzaDel: { part: 'Tornillos pinza delantera (M8)', nm: 25, conf: 'probable', src: NINJA },
  purgador: { part: 'Purgadores de pinzas', nm: 5.4, conf: 'probable', src: `${NINJA}. Par muy bajo: se parten` },
  bombaDel: { part: 'Abrazadera bomba de freno delantera (M6)', nm: 8.8, conf: 'probable', src: NINJA },
  bombaTras: { part: 'Fijación bomba de freno trasera (M8)', nm: 25, conf: 'probable', src: NINJA },
  discos: {
    part: 'Tornillos de discos de freno',
    nm: null,
    conf: 'nodata',
    src: 'Tu Excel tiene 27 N·m, pero sin documento (ADIVINANDO)',
  },
  pinonTuerca: { part: 'Tuerca piñón de ataque (M20)', nm: 127, conf: 'foto', src: `${SM_PHOTO} (26/03/2025)` },
  pinonTapa: { part: 'Tornillos tapa del piñón (M6)', nm: 9.8, conf: 'foto', src: `${SM_PHOTO} (26/03/2025)` },
  corona: { part: 'Tuercas de la corona (M10 ×6)', nm: 59, conf: 'foto', src: `${SM_PHOTO} (26/03/2025)` },
  filtroAceite: { part: 'Filtro de aceite', nm: 17.5, conf: 'doc', src: `${OM}, p. 108` },
  tapon: { part: 'Tapón de vaciado del cárter (M12)', nm: 30, conf: 'doc', src: `${OM}, p. 108` },
  bujias: {
    part: 'Bujías NGK LMAR9G',
    nm: 13,
    conf: 'probable',
    src: 'Foro ninja400riders.com (usuario con el manual de la Ninja 400)',
  },
  levas: { part: 'Tapas de árbol de levas', nm: 12, conf: 'cita', src: `${SM_QUOTE} (22/07/2026). Secuencia 1-12` },
  tapasMotor: { part: 'Tapas de embrague y alternador (M6)', nm: 9.8, conf: 'cita', src: `${SM_QUOTE} (28/06/2026)` },
  soporteMotor: { part: 'Pernos soporte del motor (M10)', nm: 44, conf: 'cita', src: `${SM_QUOTE} (12/04/2025)` },
  manillar: { part: 'Abrazaderas del manillar (M8 ×4)', nm: 25, conf: 'foto', src: `${SM_PHOTO}, Steering 14-3` },
  soporteManillar: {
    part: 'Tuercas inferiores soporte manillar (M10)',
    nm: 34,
    conf: 'foto',
    src: `${SM_PHOTO}, Steering 14-3. Tuercas nuevas`,
  },
  cabezaDir: { part: 'Tuerca de cabeza de dirección', nm: 49, conf: 'foto', src: `${SM_PHOTO}, Steering 14-3` },
  tuercaDir: {
    part: 'Tuerca de dirección (precarga)',
    nm: 4.9,
    conf: 'foto',
    src: `${SM_PHOTO}, Steering 14-3. Par muy bajo`,
  },
  pinas: { part: 'Tornillos piñas de interruptores', nm: 2.4, conf: 'foto', src: `${SM_PHOTO}, Steering 14-3` },
  tija: { part: 'Tornillos tija superior horquilla (M8)', nm: 20, conf: 'cita', src: `${SM_QUOTE} (05/07/2025)` },
  amortSup: { part: 'Amortiguador trasero, tuerca superior (M12)', nm: 59, conf: 'cita', src: `${SM_QUOTE} (02/03/2025)` },
  amortInf: { part: 'Amortiguador trasero, perno inferior (M10)', nm: 34, conf: 'cita', src: `${SM_QUOTE} (02/03/2025)` },
  pataCabra: { part: 'Perno de la pata de cabra', nm: 44, conf: 'cita', src: `${SM_QUOTE} (22/07/2025)` },
  pataSoporte: {
    part: 'Perno soporte pata de cabra',
    nm: 50,
    conf: 'cita',
    src: `${SM_QUOTE} (22/07/2025). Fijador rojo`,
  },
  reposapies: { part: 'Soportes de reposapiés (M8)', nm: 25, conf: 'probable', src: NINJA },
  basculante: { part: 'Tuerca eje del basculante (M16)', nm: null, conf: 'nodata', src: 'No encontrado' },
  tapaCulata: { part: 'Tornillos tapa de culata', nm: null, conf: 'nodata', src: 'No encontrado' },
  cajaAire: {
    part: 'Tornillos caja de filtro (M5/M6)',
    nm: null,
    conf: 'nodata',
    src: 'Sin par publicado. Tabla estándar Kawasaki: M5 3,4-4,9 · M6 5,9-7,8 N·m (rosca en plástico: lo bajo)',
  },
} satisfies Record<string, Torque>;

export type TorqueKey = keyof typeof TORQUES;

export const TORQUE_GROUPS: { title: string; keys: TorqueKey[] }[] = [
  { title: 'Motor', keys: ['tapon', 'filtroAceite', 'bujias', 'levas', 'tapasMotor', 'tapaCulata', 'cajaAire'] },
  {
    title: 'Ruedas y frenos',
    keys: ['ejeDel', 'ejeTras', 'pinzaDel', 'pinzaTras', 'pasadores', 'purgador', 'bombaDel', 'bombaTras', 'discos'],
  },
  { title: 'Transmisión', keys: ['pinonTuerca', 'pinonTapa', 'corona'] },
  {
    title: 'Dirección y chasis',
    keys: [
      'manillar',
      'soporteManillar',
      'cabezaDir',
      'tuercaDir',
      'pinas',
      'tija',
      'amortSup',
      'amortInf',
      'soporteMotor',
      'pataCabra',
      'pataSoporte',
      'reposapies',
      'basculante',
    ],
  },
];

export const BIKE = {
  name: 'Kawasaki Eliminator 500 SE',
  detail: '451 cc · matriculada el 08/04/2025',
};

export const TASKS: Task[] = [
  {
    id: 'bujias',
    name: 'Bujías',
    everyKm: 12000,
    everyMonths: null,
    warnKm: 1000,
    intervalSource: `${OM}, p. 103`,
    tools: 'Llave de bujías, galga. 2 × NGK LMAR9G (ref. OEM 92070-0047)',
    steps: [
      { text: 'Motor FRÍO. Sopla la zona antes de sacar cada bujía.' },
      { text: 'Comprueba el huelgo: 0,7-0,8 mm.' },
      { text: 'Rosca a mano hasta el tope antes de usar la llave.', torque: 'bujias' },
    ],
  },
  {
    id: 'neumaticos',
    name: 'Montar neumáticos nuevos',
    pending: 'Metzeler Cruisetec comprados el 27/09/2026, sin montar',
    everyKm: 15000,
    everyMonths: 60,
    warnKm: 2000,
    intervalSource: 'Tu Excel (criterio propio)',
    tools: 'Caballete, llaves de eje, dinamométrica, 2 pasadores de aleta nuevos (550AA4035, 4,0×35)',
    steps: [
      {
        text: 'Antes de desmontar, haz una FOTO de la posición de cada separador de ambas ruedas. Uno mal puesto destroza el sensor ABS y el disco.',
      },
      { text: 'Quita la pinza delantera antes de sacar la rueda. No toques la maneta sin disco.', torque: 'pinzaDel' },
      { text: 'Monta la rueda delantera. Pasador de aleta NUEVO.', torque: 'ejeDel' },
      { text: 'Pinza trasera, si la has soltado.', torque: 'pinzaTras' },
      {
        text: 'Ajusta la cadena a 20-30 mm ANTES de apretar el eje trasero. Pasador nuevo; si no alinea, gira hasta 30° más.',
        torque: 'ejeTras',
      },
      {
        text: 'Comprobación final: presiones según la etiqueta del basculante, sensor ABS sin roce y rueda que gira libre. Rodaje suave unos 150 km.',
      },
    ],
  },
  {
    id: 'arrastre',
    name: 'Montar kit de arrastre',
    pending: 'DID 520VX3 + JT 14T/43T comprado el 06/08/2026, sin montar',
    everyKm: 20000,
    everyMonths: null,
    warnKm: 2000,
    intervalSource: 'Tu Excel (criterio propio)',
    tools: 'Remachadora de cadena (la DID 520VX3 es de remache, no uses clip), dinamométrica, arandela de seguridad del piñón',
    steps: [
      { text: 'Quita la tapa del piñón.', torque: 'pinonTapa' },
      { text: 'Bloquea la rueda con el freno trasero y una marcha metida. Dobla la arandela de seguridad.', torque: 'pinonTuerca' },
      { text: 'Corona: aprieta en cruz, mejor con tuercas autoblocantes nuevas (92210-1139).', torque: 'corona' },
      { text: 'Cierra la cadena con remache. Mide la cabeza del remache según DID.' },
      { text: `Holgura de 20-30 mm en el punto más tenso (${OM}, p. 118).` },
      { text: 'Aprieta el eje trasero. Pasador nuevo.', torque: 'ejeTras' },
    ],
  },
  {
    id: 'aceite',
    name: 'Aceite y filtro',
    everyKm: 6000,
    everyMonths: 12,
    warnKm: 1000,
    intervalSource: 'Tu Excel: 6.000 km. El manual pide 12.000 km o 1 año (p. 102)',
    tools: '2,0 L de 10W-40 JASO MA2 (con filtro), filtro 16097-0008 / HF303RC, arandela nueva del tapón',
    steps: [
      { text: 'Motor templado y moto vertical. Vacía el aceite y pon arandela nueva.', torque: 'tapon' },
      { text: 'Aceita la junta del filtro nuevo antes de roscarlo.', torque: 'filtroAceite' },
      { text: 'Rellena 2,0 L (1,6 L si no cambias el filtro). Arranca, para y comprueba el nivel.' },
    ],
  },
  {
    id: 'cadena',
    name: 'Cadena: engrasar y revisar holgura',
    everyKm: 1000,
    everyMonths: null,
    warnKm: 200,
    intervalSource: 'Tu Excel: holgura cada 1.000 km, engrase cada 600 km',
    note: 'El manual pide engrasar también después de lluvia o si la ves seca (p. 117).',
    tools: 'Caballete, limpiador, grasa de cadena, llaves de eje',
    steps: [
      { text: 'Limpia y engrasa con la rueda girando a mano.' },
      { text: `Mide la holgura en el punto más tenso: 20-30 mm (${OM}, p. 118).` },
      { text: 'Si hay que ajustar, afloja las contratuercas y el eje y gira los dos tensores por igual.' },
      { text: 'Aprieta el eje trasero. Pasador nuevo.', torque: 'ejeTras' },
    ],
  },
  {
    id: 'pastillas',
    name: 'Revisar pastillas y discos',
    everyKm: 12000,
    everyMonths: 12,
    warnKm: 1000,
    intervalSource: `${OM}, p. 102`,
    tools: 'Linterna. Pastillas: delanteras 43082-0192 · traseras 43082-0181',
    steps: [
      { text: 'Grosor mínimo del material: 1 mm.' },
      { text: 'Si cambias pastillas: pasadores.', torque: 'pasadores' },
      { text: 'Pinza delantera.', torque: 'pinzaDel' },
      { text: 'Pinza trasera.', torque: 'pinzaTras' },
      { text: 'Bombea la maneta y el pedal hasta notar tacto ANTES de mover la moto.' },
    ],
  },
  {
    id: 'liquido',
    name: 'Líquido de frenos DOT 4',
    everyKm: 24000,
    everyMonths: 24,
    warnKm: 1000,
    intervalSource: `${OM}, p. 102`,
    tools: 'DOT 4, tubo transparente, llave del purgador. Protege la pintura',
    steps: [{ text: 'Purga hasta que salga líquido limpio y sin burbujas.', torque: 'purgador' }],
  },
  {
    id: 'aire',
    name: 'Filtro de aire',
    everyKm: 24000,
    everyMonths: null,
    warnKm: 2000,
    intervalSource: `${OM}, p. 101`,
    note: 'Ya tienes uno nuevo (HiFlo HFA2406, comprado el 15/09/2026).',
    tools: 'Destornillador. Filtro 11013-0808 / HFA2406',
    steps: [{ text: 'Abre la caja y sustituye el filtro.', torque: 'cajaAire' }],
  },
  {
    id: 'refrigerante',
    name: 'Refrigerante 50/50',
    everyKm: 36000,
    everyMonths: 36,
    warnKm: 3000,
    intervalSource: `${OM}, p. 101`,
    tools: '1,3 L de refrigerante 50/50',
    steps: [{ text: 'Cambio completo con el motor frío.' }],
  },
  {
    id: 'latiguillos',
    name: 'Latiguillos de freno',
    everyKm: null,
    everyMonths: 48,
    intervalSource: `${OM}, p. 103`,
    tools: 'Mejor en taller',
    steps: [{ text: 'Sustituir los latiguillos cada 4 años.' }],
  },
  {
    id: 'combustible',
    name: 'Filtro de combustible',
    everyKm: 24000,
    everyMonths: null,
    warnKm: 2000,
    intervalSource: `${OM}, p. 101`,
    tools: 'Mejor en taller',
    steps: [{ text: 'Sustituir a los 24.000 km.' }],
  },
  {
    id: 'valvulas',
    name: 'Holgura de válvulas',
    everyKm: 24000,
    everyMonths: null,
    warnKm: 2000,
    intervalSource: `${OM}, p. 102`,
    tools: 'Taller',
    steps: [{ text: 'Inspección a los 24.000 km. Requiere el manual de servicio.' }],
  },
];

/** Estado de partida, sacado del historial del Excel a 09/10/2026. */
export const SEED = {
  km: 11818,
  log: {
    bujias: [{ km: 0, date: '2025-04-08' }],
    neumaticos: [{ km: 0, date: '2025-04-08' }],
    arrastre: [{ km: 0, date: '2025-04-08' }],
    aceite: [{ km: 9531, date: '2026-05-26' }],
    cadena: [{ km: 9531, date: '2026-05-26' }],
    pastillas: [{ km: 9531, date: '2026-05-26' }],
    liquido: [{ km: 0, date: '2025-04-08' }],
    aire: [{ km: 0, date: '2025-04-08' }],
    refrigerante: [{ km: 0, date: '2025-04-08' }],
    latiguillos: [{ km: 0, date: '2025-04-08' }],
    combustible: [{ km: 0, date: '2025-04-08' }],
    valvulas: [{ km: 0, date: '2025-04-08' }],
  } as Record<string, LogEntry[]>,
};
