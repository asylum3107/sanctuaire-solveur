// Logique pure des solveurs du Sanctuaire des Jardins éternels.
// Utilisable dans le navigateur (window.Solveurs) et dans Node (module.exports).
(function (root) {
  "use strict";

  // ---------- Données du raid ----------

  // Objet géant -> map de l'Ouvrage Monochrome
  const OBJETS = {
    "Crayon": "[21,7]",
    "Kamas": "[22,7]",
    "Bague": "[23,7]",
    "Règle": "[21,8]",
    "Arakne": "[23,8]",
    "Bobine": "[21,9]",
    "Bougie": "[22,9]",
    "Lanterne": "[23,9]",
  };

  // Couleur de l'Ouvrage -> nom de teinte, élément (Sentinelle)
  const COULEURS = {
    orange: { teinte: "Ambré", element: "Terre" },
    bleu: { teinte: "Azuré", element: "Eau" },
    rouge: { teinte: "Écarlate", element: "Feu" },
    vert: { teinte: "Viridine", element: "Air" },
  };

  const STATUES = ["Dahliane", "Fracamélia", "Muguégide", "Tritulipe"];

  // Teinte -> statue -> map du Clos où combattre le protecteur
  const TABLE_CLOS = {
    "Ambré": { Dahliane: "[11,21]", "Fracamélia": "[11,19]", "Muguégide": "[12,20]", Tritulipe: "[10,20]" },
    "Azuré": { Dahliane: "[11,19]", "Fracamélia": "[11,21]", "Muguégide": "[10,20]", Tritulipe: "[12,20]" },
    "Écarlate": { Dahliane: "[10,20]", "Fracamélia": "[12,20]", "Muguégide": "[11,21]", Tritulipe: "[11,19]" },
    "Viridine": { Dahliane: "[12,20]", "Fracamélia": "[10,20]", "Muguégide": "[11,19]", Tritulipe: "[11,21]" },
  };

  // ---------- Ouvrage Monochrome ----------

  // piedestaux: [[objA, objB], x4] ; fleurs: index 0/1/null par piédestal (objet dont la map a la fleur)
  function solveOuvrage(piedestaux, fleurs) {
    const erreurs = [];
    const vus = {};
    piedestaux.forEach((p, i) => p.forEach((o) => {
      if (!o) return;
      if (!(o in OBJETS)) erreurs.push(`Objet inconnu : ${o}`);
      if (vus[o] !== undefined) erreurs.push(`${o} apparaît sur deux piédestaux (${romain(vus[o])} et ${romain(i)})`);
      vus[o] = i;
    }));
    const etapes = piedestaux.map((p, i) => {
      const [a, b] = p;
      const f = fleurs ? fleurs[i] : null;
      const complet = Boolean(a && b);
      const fleur = f === 0 || f === 1 ? p[f] : null;
      return {
        piedestal: romain(i),
        candidats: complet ? [{ objet: a, map: OBJETS[a] }, { objet: b, map: OBJETS[b] }] : [],
        fleur,
        mapFleur: fleur ? OBJETS[fleur] : null,
      };
    });
    const objetsFleurs = etapes.map((e) => e.fleur).filter(Boolean);
    return { etapes, erreurs, objetsFleurs, complet: objetsFleurs.length === 4 };
  }

  function romain(i) { return ["I", "II", "III", "IV"][i]; }

  // ---------- Bataille navale ----------

  // carteA = map [21,17] (joue en premier), carteB = map [19,15].
  // bateauxA / bateauxB = cases ("A2"...) des bateaux posés SUR chaque map.
  // Chaque map tire sur les bateaux de l'autre map.
  function solveNavale(bateauxA, bateauxB) {
    const norm = (l) => l.map((c) => (c || "").trim().toUpperCase()).filter(Boolean);
    const A = norm(bateauxA), B = norm(bateauxB);
    const alertes = [];
    const tirsA = B.slice(); // [21,17] vise les bateaux de [19,15]
    const tirsB = A.slice();
    tirsA.forEach((c) => { if (A.includes(c)) alertes.push(`${c} : bateau sur les deux maps, la map [21,17] viserait aussi son propre bateau.`); });
    tirsB.forEach((c) => { if (B.includes(c)) alertes.push(`${c} : bateau sur les deux maps, la map [19,15] viserait aussi son propre bateau.`); });
    const tours = [];
    const n = Math.max(tirsA.length, tirsB.length);
    for (let i = 0; i < n; i++) {
      if (tirsA[i]) tours.push({ map: "[21,17]", cible: tirsA[i], lettre: tirsA[i][0], chiffre: tirsA[i].slice(1) });
      if (tirsB[i]) tours.push({ map: "[19,15]", cible: tirsB[i], lettre: tirsB[i][0], chiffre: tirsB[i].slice(1) });
    }
    return { tours, alertes };
  }

  // ---------- Échecs (Belladone) ----------

  // Cases au format { x, y } (x colonne 0.., y ligne 0..).
  function cheminTour(dep, arr) {
    if (dep.x === arr.x && dep.y === arr.y) return [];
    if (dep.x === arr.x || dep.y === arr.y) return [arr];
    return [{ x: arr.x, y: dep.y }, arr]; // via le coin (ou l'autre coin {x:dep.x,y:arr.y})
  }

  function cheminFou(dep, arr, taille) {
    if (dep.x === arr.x && dep.y === arr.y) return [];
    const dx = arr.x - dep.x, dy = arr.y - dep.y;
    if (Math.abs(dx) === Math.abs(dy)) return [arr];
    if ((dep.x + dep.y) % 2 !== (arr.x + arr.y) % 2) return null; // couleur de case différente
    // intersections des deux diagonales passant par dep et par arr
    const candidats = [];
    // dep sur x-y = cst1, arr sur x+y = cst2
    const c1 = dep.x - dep.y, s2 = arr.x + arr.y;
    candidats.push({ x: (c1 + s2) / 2, y: (s2 - c1) / 2 });
    const s1 = dep.x + dep.y, c2 = arr.x - arr.y;
    candidats.push({ x: (s1 + c2) / 2, y: (s1 - c2) / 2 });
    const ok = candidats.find((p) => p.x >= 0 && p.y >= 0 && p.x < taille && p.y < taille);
    return ok ? [ok, arr] : null;
  }

  function nomCase(p) { return String.fromCharCode(65 + p.x) + (p.y + 1); }

  function parseCase(s) {
    const m = /^\s*([A-Za-z])\s*(\d{1,2})\s*$/.exec(s || "");
    if (!m) return null;
    return { x: m[1].toUpperCase().charCodeAt(0) - 65, y: parseInt(m[2], 10) - 1 };
  }

  // pieces: [{ nom, type: "tour"|"fou", cible:"C4", depart:"A1" }]
  function solveEchecs(pieces, taille) {
    return pieces.map((p) => {
      const cible = parseCase(p.cible), depart = parseCase(p.depart);
      if (!cible) return { ...p, statut: "cible manquante" };
      if (cible.x >= taille || cible.y >= taille) return { ...p, statut: "cible hors plateau" };
      if (!depart) return { ...p, statut: "départ inconnu" };
      const ch = p.type === "tour" ? cheminTour(depart, cible) : cheminFou(depart, cible, taille);
      if (ch === null) return { ...p, statut: "impossible : le fou ne change jamais de couleur de case", coups: null };
      return { ...p, statut: "ok", coups: ch.length, chemin: ch.map(nomCase) };
    });
  }

  // Cherche la meilleure répartition joueurs -> pièces (tours / fous) en minimisant le max de coups.
  function meilleureRepartition(departs, pieces, taille) {
    const idx = [0, 1, 2, 3];
    let best = null;
    const perms = permutations(idx);
    for (const perm of perms) {
      const essai = pieces.map((p, i) => ({ ...p, depart: departs[perm[i]], joueur: perm[i] + 1 }));
      const res = solveEchecs(essai, taille);
      if (res.some((r) => r.statut !== "ok")) continue;
      const max = Math.max(...res.map((r) => r.coups));
      const tot = res.reduce((s, r) => s + r.coups, 0);
      if (!best || max < best.max || (max === best.max && tot < best.tot)) best = { max, tot, res };
    }
    return best;
  }

  function permutations(a) {
    if (a.length <= 1) return [a];
    const out = [];
    a.forEach((v, i) => permutations(a.slice(0, i).concat(a.slice(i + 1))).forEach((p) => out.push([v].concat(p))));
    return out;
  }

  // ---------- Clos des Protecteurs ----------

  function solveClos(statue, couleur) {
    const c = COULEURS[couleur];
    if (!c || !STATUES.includes(statue)) return null;
    return { teinte: c.teinte, statue, map: TABLE_CLOS[c.teinte][statue], monstre: `${statue} ${c.teinte.toLowerCase()}` };
  }

  // ---------- Gardiens ----------

  function solveGardiens(etat) {
    const out = {};
    const clos = etat.statue && etat.couleur ? solveClos(etat.statue, etat.couleur) : null;
    out.veilleur = clos ? `Tuer en premier : ${clos.statue} (la statue apparue au centre du Clos).` : null;
    out.gardienClos = etat.objetsFleurs && etat.objetsFleurs.length === 4
      ? `Marcher sur les glyphes des objets : ${etat.objetsFleurs.join(", ")}.` : null;
    const c = COULEURS[etat.couleur];
    out.sentinelle = c ? `Frapper l'obélisque ${c.teinte.toLowerCase()} (${c.element.toLowerCase()}) jusqu'à 1 PV, puis attirer la Sentinelle dans son glyphe.` : null;
    return out;
  }

  const api = {
    OBJETS, COULEURS, STATUES, TABLE_CLOS,
    solveOuvrage, solveNavale, solveEchecs, meilleureRepartition, cheminTour, cheminFou,
    parseCase, nomCase, solveClos, solveGardiens,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Solveurs = api;
})(typeof window !== "undefined" ? window : globalThis);
