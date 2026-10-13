// es-baseline: es2020 — UUIDv1 exige BigInt (litteraux 10000n). Isole dans son propre
// fichier : un echec de parsing sur un moteur ancien n'emporte pas uuid-generator.js,
// qui desactive le bouton v1 quand __uuidV1Factory est absent.

window.__uuidV1Factory = function (randomBytes, bytesToHex) {
  // L'horloge donne la milliseconde, le champ compte par 100 ns : les UUID d'une
  // meme milliseconde sont numerotes dans les bits bas (RFC 4122 §4.2.1.2),
  // sinon un lot entier porte le meme horodatage.
  var lastMs = -1;
  var tick = 0;
  return function uuidv1() {
    var now = Date.now();
    if (now > lastMs) {
      lastMs = now;
      tick = 0;
    } else if (++tick > 9999) {
      lastMs++;
      tick = 0;
    }
    var gregorianOffset = 122192928000000000;
    var ts = BigInt(lastMs) * 10000n + BigInt(tick) + BigInt(gregorianOffset);
    var timeLow = Number(ts & 0xFFFFFFFFn);
    var timeMid = Number((ts >> 32n) & 0xFFFFn);
    var timeHi = Number((ts >> 48n) & 0x0FFFn) | 0x1000;
    var clockSeq = (randomBytes(2)[0] << 8 | randomBytes(2)[1]) & 0x3FFF | 0x8000;
    var node = randomBytes(6);
    // Noeud aleatoire : bit multicast a 1, jamais pose sur une adresse de carte
    // reseau, donc aucune collision possible avec une vraie MAC (RFC 9562 §6.10).
    node[0] |= 0x01;
    return timeLow.toString(16).padStart(8, '0') +
      '-' + timeMid.toString(16).padStart(4, '0') +
      '-' + timeHi.toString(16).padStart(4, '0') +
      '-' + clockSeq.toString(16).padStart(4, '0') +
      '-' + bytesToHex(node);
  };
};
