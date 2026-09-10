/* Minimale ZIP-lezer. Genoeg voor de ene bijlage die AERIUS meelevert:
   loop de central directory af, pak het gevraagde lid en pak het uit met
   DecompressionStream. Geen bibliotheek nodig. */

function leesUint(dv, pos, bytes) {
  let n = 0;
  for (let i = bytes - 1; i >= 0; i--) n = n * 256 + dv.getUint8(pos + i);
  return n;
}

export function zipLeden(buffer) {
  const dv = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // End of central directory: 0x06054b50, achteraan, mogelijk met commentaar.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 65558; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Geen ZIP-structuur gevonden in de bijlage.');

  const aantal = leesUint(dv, eocd + 10, 2);
  let pos = leesUint(dv, eocd + 16, 4);

  const leden = [];
  for (let i = 0; i < aantal; i++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) break;
    const methode = leesUint(dv, pos + 10, 2);
    const gecomprimeerd = leesUint(dv, pos + 20, 4);
    const naamLengte = leesUint(dv, pos + 28, 2);
    const extraLengte = leesUint(dv, pos + 30, 2);
    const commentLengte = leesUint(dv, pos + 32, 2);
    const lokaal = leesUint(dv, pos + 42, 4);
    const naam = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + naamLengte));
    leden.push({ naam, methode, gecomprimeerd, lokaal });
    pos += 46 + naamLengte + extraLengte + commentLengte;
  }
  return { leden, dv, bytes };
}

export async function zipLees(buffer, lid) {
  const { dv, bytes } = zipLeden(buffer);
  // Het lokale header herhaalt naam- en extralengte; die kunnen afwijken.
  const naamLengte = leesUint(dv, lid.lokaal + 26, 2);
  const extraLengte = leesUint(dv, lid.lokaal + 28, 2);
  const start = lid.lokaal + 30 + naamLengte + extraLengte;
  const rauw = bytes.subarray(start, start + lid.gecomprimeerd);

  if (lid.methode === 0) return rauw;
  if (lid.methode !== 8) throw new Error('Onbekende compressie in de bijlage: ' + lid.methode);

  const stroom = new Blob([rauw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stroom).arrayBuffer());
}
