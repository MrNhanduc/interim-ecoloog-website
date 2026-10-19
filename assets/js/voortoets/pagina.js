/* Voortoetsteller — de pagina.

   Bindt het sleepvak aan de rekenkern in kern.js en tekent de uitkomst.
   Alles gebeurt in de browser van de bezoeker: de PDF wordt hier geopend,
   niet verstuurd. De enige verbinding naar buiten is die met de AERIUS open
   data, en daar gaan alleen hexagoonnummers naartoe.
*/

import { zipLeden, zipLees } from './zip.js';
import {
  ONDERSTEUNDE_VERSIE, beschikbareJaren, depositiesVoor, euro, groepeer,
  habitatsVoor, hoofdversie, isMaatwerk, leesGml, levertijd, metToename, prijs, tel,
  verwerkZoekgebieden,
} from './kern.js';

const vak = document.getElementById('vt-vak');
const kiezer = document.getElementById('vt-kiezer');
const uitkomst = document.getElementById('vt-uitkomst');
const details = document.getElementById('vt-details');
const formulier = document.getElementById('vt-formulier');
if (!vak) throw new Error('Voortoetsteller: het sleepvak ontbreekt op deze pagina.');

const PDFJS_SRC = vak.dataset.pdfjs;
const WORKER_SRC = vak.dataset.worker;

// --- pdf.js pas ophalen als er echt een bestand komt ---------------------

let pdfjsBelofte = null;
function pdfjs() {
  if (!pdfjsBelofte) {
    pdfjsBelofte = new Promise((klaar, mis) => {
      const s = document.createElement('script');
      s.src = PDFJS_SRC;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        klaar(window.pdfjsLib);
      };
      s.onerror = () => mis(new Error('De PDF-lezer kon niet geladen worden.'));
      document.head.appendChild(s);
    });
  }
  return pdfjsBelofte;
}

// --- de PDF openen en het GML eruit halen --------------------------------

async function gmlUitPdf(bestand) {
  const lib = await pdfjs();
  const data = new Uint8Array(await bestand.arrayBuffer());
  let doc;
  try {
    doc = await lib.getDocument({ data, password: '' }).promise;
  } catch (e) {
    throw new Error('Dit bestand kan niet als PDF gelezen worden.');
  }
  const bijlagen = await doc.getAttachments();
  const namen = Object.keys(bijlagen || {});
  if (!namen.length) {
    throw new Error(
      'Deze PDF bevat geen AERIUS-rekentaak. Is het wel de export uit ' +
      'Calculator, of is de PDF opnieuw opgeslagen of geprint via een ander ' +
      'programma? Daarbij gaat de bijlage verloren.');
  }

  for (const naam of namen) {
    const inhoud = bijlagen[naam].content;
    const buf = inhoud.buffer.slice(inhoud.byteOffset, inhoud.byteOffset + inhoud.byteLength);
    if (naam.toLowerCase().endsWith('.gml')) {
      return { naam, tekst: new TextDecoder('utf-8').decode(inhoud) };
    }
    if (naam.toLowerCase().endsWith('.zip')) {
      const { leden } = zipLeden(buf);
      for (const lid of leden) {
        if (lid.naam.toLowerCase().endsWith('.gml')) {
          const uit = await zipLees(buf, lid);
          return { naam: lid.naam, tekst: new TextDecoder('utf-8').decode(uit) };
        }
      }
    }
  }
  throw new Error('In de bijlage van deze PDF zit geen rekentaak (GML-bestand).');
}

// --- de hele keten -------------------------------------------------------

async function verwerk(bestand) {
  const meldingen = [];
  bezig('De PDF wordt geopend…');

  const gml = await gmlUitPdf(bestand);
  const taak = leesGml(gml.tekst);

  // Een berekening uit een oudere versie rekent de teller gewoon door: de
  // verschillen zijn klein en de uitkomst geeft een goede indruk. Wel moet de
  // klant weten dat de berekening voor de aanvraag geactualiseerd moet worden.
  const versie = hoofdversie(taak.aeriusVersie);
  const huidig = parseInt(ONDERSTEUNDE_VERSIE, 10);
  let verouderd = false;
  if (versie !== null && versie < huidig) {
    verouderd = true;
    meldingen.push(
      'Deze berekening is gemaakt met AERIUS ' + taak.aeriusVersie.split('_')[0] +
      '. Sinds 6 oktober 2026 ' +
      'is voor een vergunningaanvraag een berekening met AERIUS ' + huidig + ' verplicht, ' +
      'dus de berekening moet nog geactualiseerd worden. De teller rekent al met de ' +
      'habitatkaarten en depositiecijfers van AERIUS ' + huidig + '. De verschillen zijn ' +
      'meestal klein, dus deze uitkomst geeft al een goede indruk.');
  } else if (versie !== null && versie > huidig) {
    meldingen.push(
      'Deze berekening is gemaakt met AERIUS ' + taak.aeriusVersie.split('_')[0] +
      ', een nieuwere ' +
      'versie dan ' + huidig + ' waarop de teller is ingesteld. De uitkomst kan daardoor ' +
      'iets afwijken.');
  }

  const toename = metToename(taak);
  if (!toename.length) {
    // Geen toename is geen storing maar het beste antwoord dat de teller kan
    // geven: dan is er niets te toetsen. Daarom een eigen uitkomst en geen
    // foutmelding.
    return {
      geenToename: true,
      project: taak.project,
      opdrachtgever: taak.opdrachtgever,
      rekenjaar: taak.rekenjaar,
      aerius: taak.aeriusVersie,
      meldingen,
    };
  }

  const toenamePer = new Map(toename.map((r) => [r.id, r.depositie]));
  const ids = Array.from(toenamePer.keys()).sort((a, b) => a - b);

  bezig('Habitattypen opzoeken bij ' + ids.length + ' hexagonen…');
  const habitats = await habitatsVoor(ids, (gedaan, totaal) => {
    bezig('Habitattypen opzoeken… ' + gedaan + ' van ' + totaal + ' hexagonen');
  });

  const jaren = await beschikbareJaren(ids[0]);
  const jaar = Math.max.apply(null, jaren);

  const habIds = Array.from(new Set(habitats.map((r) => parseInt(r.receptor_id, 10))))
    .sort((a, b) => a - b);
  bezig('Actuele depositie ' + jaar + ' ophalen…');
  const achtergrond = await depositiesVoor(habIds, jaar, (gedaan, totaal) => {
    bezig('Actuele depositie ophalen… ' + gedaan + ' van ' + totaal);
  });

  const regels = [];
  for (const r of habitats) {
    const rid = parseInt(r.receptor_id, 10);
    if (!achtergrond.has(rid)) continue;
    regels.push({
      receptorId: rid,
      gebiedCode: String(r.natura2000_area_id),
      gebiedNaam: r.natura2000_area_name,
      habitatCode: r.habitat_type_name,
      habitatNaam: r.habitat_type_description || '',
      kdw: parseFloat(r.critical_deposition),
      achtergrond: achtergrond.get(rid),
    });
  }

  const alle = groepeer(toenamePer, regels);
  const over = verwerkZoekgebieden(alle);
  const vervallen = alle.filter((g) => over.indexOf(g) === -1).map((g) => g.habitatCode);
  const aantal = tel(over);

  return {
    project: taak.project,
    opdrachtgever: taak.opdrachtgever,
    rekenjaar: taak.rekenjaar,
    aerius: taak.aeriusVersie,
    verouderd,
    jaar,
    aantal,
    prijs: prijs(aantal),
    maatwerk: isMaatwerk(aantal),
    gebieden: Array.from(new Set(over.filter((g) => g.teltMee).map((g) => g.gebiedNaam))).sort(),
    groepen: over,
    hexagonen: ids.length,
    meldingen,
    vervallen,
  };
}

// --- tekenen -------------------------------------------------------------

function ontsnap(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function bezig(tekst) {
  uitkomst.innerHTML = '<p class="vt-bezig" role="status">' + ontsnap(tekst) + '</p>';
  if (details) details.innerHTML = '';
}

function fout(tekst) {
  uitkomst.innerHTML = '<div class="vt-fout" role="alert"><strong>Dat lukte niet.</strong> ' +
    ontsnap(tekst) + '</div>';
  if (details) details.innerHTML = '';
  if (formulier) formulier.hidden = true;
}

function metaRegel(d) {
  return '<p class="vt-meta">' + ontsnap(d.project) +
    (d.opdrachtgever ? ' &middot; ' + ontsnap(d.opdrachtgever) : '') +
    '<br>rekenjaar ' + ontsnap(d.rekenjaar) + ' &middot; AERIUS ' + ontsnap(d.aerius) +
    '</p>';
}

function toonGeenToename(d) {
  let h = '<div class="vt-goed" role="status">' +
    '<p><strong>Goed nieuws!</strong> Er zijn geen rekenpunten met een toename. ' +
    'Een ecologische voortoets stikstof is in dit geval niet nodig. Andersoortige ' +
    'toestemmingen kunnen nog wel noodzakelijk zijn voor uw project.</p></div>';
  h += metaRegel(d);
  for (const m of d.meldingen) {
    h += '<div class="vt-melding">' + ontsnap(m) + '</div>';
  }
  uitkomst.innerHTML = h;
  if (details) details.innerHTML = '';
  if (formulier) formulier.hidden = true;
}

function toon(d) {
  if (d.geenToename) return toonGeenToename(d);

  const bedrag = (d.maatwerk ? 'vanaf ' : '') + '&euro; ' + euro(d.prijs);
  const termijn = levertijd(d.aantal);
  const voorbehoud = (d.maatwerk
    ? 'Bij een project van deze omvang stel ik een maatwerkofferte op; het genoemde ' +
      'bedrag is de ondergrens. Aan deze indicatie kunnen geen rechten worden ontleend.'
    : 'Berekend op het aantal te behandelen habitattypen en leefgebieden in deze ' +
      'berekening. Aan deze indicatie kunnen geen rechten worden ontleend.') +
    ' De levertijd geldt vanaf opdrachtverstrekking.';

  uitkomst.innerHTML = '<div class="vt-uitslag">' +
    '<div class="vt-cijfer"><span class="vt-cijfer__label">Te behandelen habitattypen en leefgebieden</span>' +
    '<span class="vt-cijfer__getal">' + d.aantal + '</span></div>' +
    '<div class="vt-cijfer"><span class="vt-cijfer__label">Indicatie voortoets</span>' +
    '<span class="vt-cijfer__getal">' + bedrag + '</span></div>' +
    '<div class="vt-cijfer vt-cijfer--klein"><span class="vt-cijfer__label">Verwachte levertijd</span>' +
    '<span class="vt-cijfer__getal">' + termijn + '</span></div>' +
    '<p class="vt-voorbehoud">' + voorbehoud + '</p></div>';

  // Meldingen (zoals een berekening uit een oudere AERIUS-versie) staan boven
  // het offerteformulier, waar de klant ze ziet voordat hij iets aanvraagt.
  for (const m of d.meldingen) {
    uitkomst.innerHTML += '<div class="vt-melding">' + ontsnap(m) + '</div>';
  }

  // Alles hieronder is de onderbouwing; die staat onder het offerteformulier.
  let h = '<h2 class="vt-details__kop">Waar dat aantal vandaan komt</h2>';
  h += '<p class="vt-meta">' + ontsnap(d.project) +
    (d.opdrachtgever ? ' &middot; ' + ontsnap(d.opdrachtgever) : '') +
    '<br>rekenjaar ' + ontsnap(d.rekenjaar) + ' &middot; AERIUS ' + ontsnap(d.aerius) +
    ' &middot; actuele depositie ' + d.jaar +
    '<br>' + d.hexagonen + ' hexagonen met een berekende toename' +
    (d.gebieden.length ? '<br>' + ontsnap(d.gebieden.join(', ')) : '') + '</p>';

  h += '<div class="vt-tabelhouder"><table class="vt-tabel">' +
    '<thead><tr><th>gebied</th><th>code</th><th>omschrijving</th>' +
    '<th class="vt-num">KDW</th><th class="vt-num">actueel</th>' +
    '<th class="vt-num">verschil</th><th>status</th></tr></thead><tbody>';
  for (const g of d.groepen) {
    h += '<tr' + (g.teltMee ? '' : ' class="vt-uit"') + '>' +
      '<td>' + ontsnap(g.gebiedNaam) + '</td>' +
      '<td>' + ontsnap(g.habitatCode) + '</td>' +
      '<td>' + ontsnap(g.habitatNaam) + '</td>' +
      '<td class="vt-num">' + Math.round(g.kdw) + '</td>' +
      '<td class="vt-num">' + Math.round(g.hoogsteAchtergrond) + '</td>' +
      '<td class="vt-num">' + (g.overschrijding > 0 ? '+' : '') + Math.round(g.overschrijding) + '</td>' +
      '<td>' + g.status + '</td></tr>';
  }
  h += '</tbody></table></div>';
  h += '<p class="vt-legenda">Waarden in mol N/ha/j. Grijze regels tellen niet mee: daar ligt ' +
    'de actuele depositie ruim onder de kritische depositiewaarde. Kolom actueel: ' +
    'de hoogste actuele depositie (voorheen achtergronddepositie) op een hexagoon ' +
    'met toename.</p>';

  if (d.vervallen.length) {
    h += '<div class="vt-melding">Zoekgebied samengevoegd met het hoofdtype: ' +
      ontsnap(d.vervallen.join(', ')) + '</div>';
  }

  if (details) details.innerHTML = h;
  vulFormulier(d);
}

function vulFormulier(d) {
  if (!formulier) return;
  const zet = (naam, waarde) => {
    const veld = formulier.querySelector('[name="' + naam + '"]');
    if (veld) veld.value = waarde;
  };
  zet('project', d.project);
  zet('opdrachtgever', d.opdrachtgever);
  zet('rekenjaar', d.rekenjaar);
  zet('aerius', d.aerius + (d.verouderd ? ' (oudere versie, actualisatie nodig)' : ''));
  zet('eenheden', d.aantal);
  zet('indicatie', (d.maatwerk ? 'vanaf ' : '') + 'EUR ' + euro(d.prijs));
  zet('levertijd', levertijd(d.aantal));
  zet('gebieden', d.gebieden.join(', '));
  zet('overzicht', d.groepen.map((g) =>
    (g.teltMee ? '' : '(telt niet mee) ') + g.gebiedNaam + ' | ' + g.habitatCode + ' ' +
    g.habitatNaam + ' | actueel ' + Math.round(g.hoogsteAchtergrond) +
    ' vs KDW ' + Math.round(g.kdw)).join('\n'));
  formulier.hidden = false;
}

// --- offerteformulier op de achtergrond versturen -------------------------
// Net als het contactformulier: de bezoeker blijft op deze site en belandt
// niet op de pagina van Formspree (die eigen cookies en reCAPTCHA kan
// gebruiken). Werkt fetch niet, dan verstuurt het formulier zichzelf op de
// klassieke manier; een aanvraag mag nooit verloren gaan.

const TELEFOON = '06 26 810 089';
let formStatus = null;

function statusVak() {
  if (!formStatus && formulier) {
    formStatus = document.createElement('div');
    formStatus.id = 'vt-formulier-status';
    formStatus.setAttribute('role', 'status');
    formStatus.setAttribute('aria-live', 'polite');
    formStatus.tabIndex = -1;
    formStatus.hidden = true;
    formulier.parentNode.insertBefore(formStatus, formulier);
  }
  return formStatus;
}

function toonFormMelding(soort, kop, tekst) {
  const vakje = statusVak();
  vakje.className = 'form-melding form-melding--' + soort;
  vakje.innerHTML = '<strong>' + kop + '</strong><br>' + tekst;
  vakje.hidden = false;
  vakje.focus();
}

if (formulier && window.fetch && window.FormData) {
  const knop = formulier.querySelector('button[type="submit"]');
  const knopTekst = knop ? knop.textContent : '';
  const knopHerstellen = () => {
    if (!knop) return;
    knop.disabled = false;
    knop.textContent = knopTekst;
  };

  formulier.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusVak().hidden = true;
    if (knop) { knop.disabled = true; knop.textContent = 'Bezig met versturen…'; }
    try {
      const antwoord = await fetch(formulier.action, {
        method: 'POST',
        body: new FormData(formulier),
        headers: { Accept: 'application/json' },
      });
      const gegevens = await antwoord.json().catch(() => ({}));
      if (antwoord.ok) {
        formulier.hidden = true;
        knopHerstellen();
        toonFormMelding('goed', 'Bedankt voor uw aanvraag.',
          'Ik neem zo snel mogelijk contact met u op.');
        return;
      }
      const fouten = (gegevens.errors || []).map((f) => f.message).join(' ');
      knopHerstellen();
      toonFormMelding('fout', 'Het versturen is niet gelukt.',
        ontsnap(fouten ? fouten + ' ' : '') + 'Probeert u het nog eens, of bel / app ' +
        TELEFOON + '. Uw gegevens staan nog in het formulier.');
    } catch (err) {
      knopHerstellen();
      toonFormMelding('fout', 'Het versturen is niet gelukt.',
        'Controleer uw internetverbinding en probeer het nog eens, of bel / app ' +
        TELEFOON + '. Uw gegevens staan nog in het formulier.');
    }
  });
}

// --- sleepvak ------------------------------------------------------------

async function behandel(bestand) {
  if (!bestand) return;
  if (formulier) formulier.hidden = true;
  if (formStatus) formStatus.hidden = true;
  try {
    toon(await verwerk(bestand));
  } catch (e) {
    fout(e && e.message ? e.message : String(e));
  }
}

// Een gesleept bestand opent de browser standaard in een nieuw venster.
// Dat moet op de hele pagina tegengehouden worden, niet alleen boven het vak.
for (const naam of ['dragenter', 'dragover', 'drop']) {
  window.addEventListener(naam, (e) => e.preventDefault());
}
for (const naam of ['dragenter', 'dragover']) {
  vak.addEventListener(naam, (e) => { e.preventDefault(); vak.classList.add('vt-over'); });
}
for (const naam of ['dragleave', 'drop']) {
  vak.addEventListener(naam, () => vak.classList.remove('vt-over'));
}
vak.addEventListener('drop', (e) => {
  e.preventDefault();
  behandel(e.dataTransfer.files && e.dataTransfer.files[0]);
});
vak.addEventListener('click', () => kiezer.click());
vak.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kiezer.click(); }
});
kiezer.addEventListener('change', () => behandel(kiezer.files[0]));

vak.hidden = false;
const zonderJs = document.getElementById('vt-zonder-js');
if (zonderJs) zonderJs.hidden = true;
