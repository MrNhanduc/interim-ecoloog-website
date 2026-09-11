/* Voortoetsteller — rekenkern.

   Dit is de omzetting van de Python-versie (aerius_voortoets/) naar
   JavaScript, zodat alles in de browser van de bezoeker kan draaien en de
   PDF zijn computer niet verlaat.

   De telregels staan hieronder net zo omschreven als in telling.py. Wijzig je
   er iets, wijzig het dan op beide plekken en valideer opnieuw tegen een
   bekende berekening.
*/

// --- instellingen, gelijk aan de Python-versie ---------------------------

export const DREMPEL = 0.005;              // mol N/ha/j; AERIUS rondt af op 0,01
export const MARGE_BIJNA_OVERBELAST = 70;  // mol N/ha/j onder de KDW
export const ONDERSTEUNDE_VERSIE = '2025.3';

const WFS = 'https://connect.aerius.nl/opendata/wfs';
const KOPPELTABEL = 'base_geometries:hexagons_to_relevant_habitats';
const DEPOSITIES = 'depositions:depositions';
const ZOOM = 1;
const BATCH = 150;

// --- GML lezen ----------------------------------------------------------

function tekstTussen(bron, tag) {
  const m = bron.match(new RegExp('<imaer:' + tag + '>([^<]*)</imaer:' + tag + '>'));
  return m ? m[1].trim() : '';
}

/* Het GML is groot (tientallen megabytes). Een DOMParser trekt dat hele
   document in het geheugen; doorlopen met een reguliere expressie is een
   stuk lichter en snel genoeg, omdat de opbouw per rekenpunt vast is. */
export function leesGml(tekst) {
  const kop = tekst.slice(0, 20000);
  const taak = {
    aeriusVersie: tekstTussen(kop, 'aeriusVersion'),
    databaseVersie: tekstTussen(kop, 'databaseVersion'),
    project: tekstTussen(kop, 'name'),
    opdrachtgever: tekstTussen(kop, 'corporation'),
    rekenjaar: parseInt(tekstTussen(kop, 'year'), 10) || null,
    receptoren: [],
  };

  const reReceptor = /<imaer:ReceptorPoint receptorPointId="(\d+)"/g;
  const grenzen = [];
  let m;
  while ((m = reReceptor.exec(tekst)) !== null) {
    grenzen.push([parseInt(m[1], 10), m.index]);
  }

  const reWaarde = /<imaer:CalculationResult resultType="DEPOSITION" substance="(NH3|NOX)"><imaer:value>([^<]+)</g;
  for (let i = 0; i < grenzen.length; i++) {
    const id = grenzen[i][0];
    const start = grenzen[i][1];
    const eind = i + 1 < grenzen.length ? grenzen[i + 1][1] : tekst.length;
    const blok = tekst.slice(start, eind);

    let totaal = 0;
    reWaarde.lastIndex = 0;
    let r;
    while ((r = reWaarde.exec(blok)) !== null) totaal += parseFloat(r[2]);

    taak.receptoren.push({ id: id, depositie: totaal });
  }
  return taak;
}

export function metToename(taak, drempel) {
  const grens = drempel === undefined ? DREMPEL : drempel;
  return taak.receptoren.filter(function (r) { return r.depositie >= grens; });
}

// --- open data ----------------------------------------------------------

async function haal(typename, cql) {
  const url = WFS + '?' + new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: typename,
    outputFormat: 'application/json',
    cql_filter: cql,
  });
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('De AERIUS open data antwoordde met ' + resp.status + '.');
  const data = await resp.json();
  return (data.features || []).map(function (f) { return f.properties || {}; });
}

function inBatches(lijst) {
  const uit = [];
  for (let i = 0; i < lijst.length; i += BATCH) uit.push(lijst.slice(i, i + BATCH));
  return uit;
}

export async function habitatsVoor(ids, meld) {
  const uit = [];
  let gedaan = 0;
  for (const batch of inBatches(ids)) {
    const cql = 'zoom_level=' + ZOOM + ' AND receptor_id IN (' + batch.join(',') + ')';
    const deel = await haal(KOPPELTABEL, cql);
    for (const rij of deel) uit.push(rij);
    gedaan += batch.length;
    if (meld) meld(gedaan, ids.length);
  }
  return uit;
}

export async function beschikbareJaren(receptor) {
  const cql = 'zoom_level=' + ZOOM + ' AND receptor_id=' + receptor;
  const jaren = new Set();
  for (const rij of await haal(DEPOSITIES, cql)) {
    if (rij.year) jaren.add(parseInt(rij.year, 10));
  }
  return Array.from(jaren).sort(function (a, b) { return a - b; });
}

export async function depositiesVoor(ids, jaar, meld) {
  const uit = new Map();
  let gedaan = 0;
  for (const batch of inBatches(ids)) {
    const cql = 'zoom_level=' + ZOOM + ' AND year=' + jaar +
                ' AND receptor_id IN (' + batch.join(',') + ')';
    for (const rij of await haal(DEPOSITIES, cql)) {
      if (rij.receptor_id != null && rij.total_deposition != null) {
        uit.set(parseInt(rij.receptor_id, 10), parseFloat(rij.total_deposition));
      }
    }
    gedaan += batch.length;
    if (meld) meld(gedaan, ids.length);
  }
  return uit;
}

// --- telling ------------------------------------------------------------

export function status(achtergrond, kdw) {
  if (achtergrond > kdw) return 'overbelast';
  if (achtergrond >= kdw - MARGE_BIJNA_OVERBELAST) return 'bijna overbelast';
  return 'niet overbelast';
}

export function groepeer(toenamePerHexagon, regels) {
  const emmers = new Map();
  for (const hh of regels) {
    if (!toenamePerHexagon.has(hh.receptorId)) continue;
    const sleutel = hh.gebiedCode + ' ' + hh.habitatCode;
    if (!emmers.has(sleutel)) emmers.set(sleutel, []);
    emmers.get(sleutel).push(hh);
  }

  const groepen = [];
  for (const rijen of emmers.values()) {
    let maatgevend = rijen[0];
    for (const r of rijen) if (r.achtergrond > maatgevend.achtergrond) maatgevend = r;
    let hoogsteToename = 0;
    for (const r of rijen) {
      const t = toenamePerHexagon.get(r.receptorId);
      if (t > hoogsteToename) hoogsteToename = t;
    }
    const overschrijding = maatgevend.achtergrond - maatgevend.kdw;
    const st = status(maatgevend.achtergrond, maatgevend.kdw);
    groepen.push({
      gebiedCode: maatgevend.gebiedCode,
      gebiedNaam: maatgevend.gebiedNaam,
      habitatCode: maatgevend.habitatCode,
      habitatNaam: maatgevend.habitatNaam,
      kdw: maatgevend.kdw,
      maatgevendHexagon: maatgevend.receptorId,
      hoogsteAchtergrond: maatgevend.achtergrond,
      hoogsteToename: hoogsteToename,
      aantalHexagonen: rijen.length,
      overschrijding: overschrijding,
      status: st,
      teltMee: st !== 'niet overbelast',
    });
  }

  groepen.sort(function (a, b) {
    return (b.overschrijding - a.overschrijding) ||
           a.gebiedNaam.localeCompare(b.gebiedNaam) ||
           a.habitatCode.localeCompare(b.habitatCode);
  });
  return groepen;
}

export function basiscode(code) {
  return code.indexOf('ZG') === 0 ? code.slice(2) : code;
}

export function verwerkZoekgebieden(groepen) {
  const teltMee = new Set(
    groepen.filter(function (g) { return g.teltMee; })
           .map(function (g) { return g.gebiedCode + ' ' + g.habitatCode; }));
  return groepen.filter(function (g) {
    if (g.habitatCode.indexOf('ZG') !== 0) return true;
    return !teltMee.has(g.gebiedCode + ' ' + basiscode(g.habitatCode));
  });
}

export function tel(groepen) {
  return groepen.filter(function (g) { return g.teltMee; }).length;
}

// --- prijs --------------------------------------------------------------

export const KLASSEN = [
  { tot: 10, basis: 1500, tarief: 500 },
  { tot: 30, basis: 2000, tarief: 400 },
  { tot: 50, basis: 3000, tarief: 350 },
];
export const MAATWERK_BOVEN = 50;

export function prijs(aantal) {
  if (aantal <= 0) return KLASSEN[0].basis;
  const begrensd = Math.min(aantal, MAATWERK_BOVEN);
  let ondergrens = 0;
  let totaal = 0;
  let basis = KLASSEN[0].basis;
  for (const klasse of KLASSEN) {
    const inDezeKlasse = Math.min(begrensd, klasse.tot) - ondergrens;
    if (inDezeKlasse <= 0) break;
    totaal += inDezeKlasse * klasse.tarief;
    basis = klasse.basis;
    ondergrens = klasse.tot;
  }
  return basis + totaal;
}

export function isMaatwerk(aantal) {
  return aantal > MAATWERK_BOVEN;
}

export function euro(bedrag) {
  return bedrag.toLocaleString('nl-NL');
}

// --- levertijd ----------------------------------------------------------
// Tot en met dertig te behandelen typen is het werk te overzien en past het
// binnen vier weken. Daarboven loopt het aantal beoordelingen zo op dat een
// bandbreedte eerlijker is dan een vaste termijn.

export const LEVERTIJD_GRENS = 30;

export function levertijd(aantal) {
  return aantal > LEVERTIJD_GRENS ? '4 tot 8 weken' : '4 weken';
}
