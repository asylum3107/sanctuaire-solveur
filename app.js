(function () {
  "use strict";
  const S = window.Solveurs;
  const $ = (id) => document.getElementById(id);
  const CLE = "sanctuaire-etat-v1";

  const PIECES = [
    { id: "tb", nom: "Tour blanche", type: "tour", symbole: "♖", camp: "blanc" },
    { id: "tn", nom: "Tour noire", type: "tour", symbole: "♜", camp: "noir" },
    { id: "fb", nom: "Fou blanc", type: "fou", symbole: "♗", camp: "blanc" },
    { id: "fn", nom: "Fou noir", type: "fou", symbole: "♝", camp: "noir" },
  ];
  const ICONES = { Crayon: "✏️", Kamas: "💰", Bague: "💍", "Règle": "📏", Arakne: "🕷️", Bobine: "🧵", Bougie: "🕯️", Lanterne: "🏮" };
  const FLEURS = { Dahliane: "🌺", "Fracamélia": "🌹", "Muguégide": "🌼", Tritulipe: "🌷" };
  const TEINTES = {
    orange: { hex: "#e8902a", nom: "Orange", teinte: "Ambré" },
    bleu: { hex: "#2f80ed", nom: "Bleu", teinte: "Azuré" },
    rouge: { hex: "#d64545", nom: "Rouge", teinte: "Écarlate" },
    vert: { hex: "#2e9e5b", nom: "Vert", teinte: "Viridine" },
  };
  const hexTeinte = (t) => Object.values(TEINTES).find((v) => v.teinte === t).hex;
  const ROMAINS = ["I", "II", "III", "IV"];
  const COUL_PIED = ["#8a5cf6", "#e8902a", "#2f80ed", "#d6458f"];

  // Les personnages commencent toujours le combat d'échecs sur ces 4 cases.
  const CASES_DEPART = ["J3", "J5", "J7", "J9"];
  const DEPARTS_DEFAUT = { tn: "J3", tb: "J5", fn: "J7", fb: "J9" };

  function etatVide() {
    return {
      piedestaux: [["", ""], ["", ""], ["", ""], ["", ""]],
      fleurs: [null, null, null, null],
      couleur: "",
      nav: { cols: 4, rows: 3, a: [], b: [], faits: [] },
      ech: { taille: 11, cibles: {}, departs: { ...DEPARTS_DEFAUT }, ordre: ["tn", "tb", "fn", "fb"] },
      clos: { taille: 8, jardins: [[], [], [], []] },
      statue: "",
    };
  }

  let etat = charger();

  function charger() {
    const base = etatVide();
    try {
      const h = location.hash.startsWith("#e=") ? location.hash.slice(3) : null;
      const brut = h ? decodeURIComponent(escape(atob(h))) : localStorage.getItem(CLE);
      if (brut) return fusion(base, JSON.parse(brut));
    } catch (e) { /* état illisible : on repart de zéro */ }
    return base;
  }
  function fusion(a, b) {
    for (const k in b) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k]) a[k] = fusion(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }
  function enregistrer() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ }
  }
  function sauver() {
    enregistrer();
    tout();
    if (window.SyncRaid) window.SyncRaid.envoyer();
  }
  function flash(t) { $("msg").textContent = t; setTimeout(() => { $("msg").textContent = ""; }, 2500); }

  // ---------- Onglets ----------
  function ouvrirOnglet(nom) {
    document.querySelectorAll("#onglets button").forEach((x) => x.classList.toggle("actif", x.dataset.tab === nom));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("actif", t.id === "tab-" + nom));
  }
  document.querySelectorAll("#onglets button").forEach((b) => b.addEventListener("click", () => ouvrirOnglet(b.dataset.tab)));

  $("partager").addEventListener("click", () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(etat))));
    const url = location.href.split("#")[0] + "#e=" + code;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(() => flash("Lien copié !"), () => { prompt("Copie ce lien :", url); });
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("Effacer toutes les données du raid ?")) return;
    viderEtat();
    sauver();
  });
  function viderEtat() {
    etat = etatVide();
    history.replaceState(null, "", location.pathname + location.search);
    rendreOuvrageForm();
  }

  // ---------- Progression ----------
  function rendreProgression() {
    const ouv = S.solveOuvrage(etat.piedestaux, etat.fleurs);
    const items = [
      ["ouvrage", "🌸", "Ouvrage", ouv.complet && etat.couleur],
      ["navale", "⛵", "Navale", etat.nav.faits.length === 6],
      ["echecs", "♜", "Échecs", PIECES.every((p) => S.parseCase(etat.ech.cibles[p.id]))],
      ["clos", "🗿", "Clos", Boolean(etat.statue && etat.couleur)],
    ];
    $("progression").innerHTML = items.map(([id, ico, nom, ok]) =>
      `<button class="etape-prog ${ok ? "fini" : ""}" data-go="${id}">${ico} ${nom} ${ok ? "✔" : "…"}</button>`).join("");
    $("progression").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => ouvrirOnglet(b.dataset.go)));
  }

  // ---------- Ouvrage ----------
  function rendreOuvrageForm() {
    const objets = Object.keys(S.OBJETS);
    $("ouvrage-form").innerHTML = etat.piedestaux.map((p, i) => `
      <div class="carte piedestal" style="--pc:${COUL_PIED[i]}"><h3><span class="num">${ROMAINS[i]}</span> Piédestal ${ROMAINS[i]}</h3>
        ${[0, 1].map((j) => `<select data-p="${i}" data-o="${j}"><option value="">objet ?</option>
          ${objets.map((o) => `<option value="${o}" ${p[j] === o ? "selected" : ""}>${ICONES[o]} ${o}</option>`).join("")}</select>`).join("")}
      </div>`).join("");
    $("ouvrage-form").querySelectorAll("select").forEach((s) => s.addEventListener("change", () => {
      etat.piedestaux[s.dataset.p][s.dataset.o] = s.value;
      etat.fleurs[s.dataset.p] = null;
      sauver();
    }));
  }
  function rendreOuvrage() {
    const r = S.solveOuvrage(etat.piedestaux, etat.fleurs);
    let h = r.erreurs.map((e) => `<p class="alerte">⚠️ ${e}</p>`).join("");
    h += "<div class='liste-etapes'>" + r.etapes.map((e, i) => {
      if (!e.candidats.length) return `<div class="etape-carte vide" style="--pc:${COUL_PIED[i]}"><span class="num">${i + 1}</span> Piédestal ${e.piedestal} : renseigne ses 2 objets.</div>`;
      const opts = e.candidats.map((c, j) => `<label class="choix ${e.fleur === c.objet ? "ok" : ""}">
        <input type="radio" name="fleur${i}" data-i="${i}" value="${j}" ${etat.fleurs[i] === j ? "checked" : ""}>
        ${ICONES[c.objet]} ${c.objet} <span class="coord">${c.map}</span></label>`).join("<span class='ou'>ou</span>");
      return `<div class="etape-carte ${e.fleur ? "faite" : ""}" style="--pc:${COUL_PIED[i]}"><span class="num">${i + 1}</span>
        <div>Va voir ${opts}${e.fleur ? `<div class="action">🌸 Active la fleur en <b>${e.mapFleur}</b></div>` : ""}</div></div>`;
    }).join("") + "</div>";
    if (r.complet) h += `<p class="ok gros-ok">✔ Ordre : ${r.etapes.map((e) => `${ICONES[e.fleur]} ${e.mapFleur}`).join(" → ")}</p>`;
    $("ouvrage-res").innerHTML = h;
    $("ouvrage-res").querySelectorAll("input[type=radio]").forEach((x) => x.addEventListener("change", () => {
      etat.fleurs[x.dataset.i] = parseInt(x.value, 10); sauver();
    }));

    $("couleurs").innerHTML = Object.entries(TEINTES).map(([k, v]) =>
      `<button class="pastille-couleur ${etat.couleur === k ? "choisie" : ""}" data-c="${k}" style="--cc:${v.hex}"><span></span>${v.nom}<small>${v.teinte}</small></button>`).join("");
    $("couleurs").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      etat.couleur = etat.couleur === b.dataset.c ? "" : b.dataset.c; sauver();
    }));

    // Plan 3x3 des maps de l'Ouvrage ([21..23],[7..9]) ; le centre [22,8] n'a pas d'objet.
    const parMap = {};
    Object.entries(S.OBJETS).forEach(([o, m]) => { parMap[m] = o; });
    const candidats = {}, trouves = {};
    r.etapes.forEach((e, i) => {
      e.candidats.forEach((c) => { candidats[c.map] = i; });
      if (e.fleur) trouves[e.mapFleur] = i;
    });
    let plan = "<div class='plan3'>";
    for (let y = 7; y <= 9; y++) {
      for (let x = 21; x <= 23; x++) {
        const m = `[${x},${y}]`, o = parMap[m];
        if (!o) { plan += `<div class="map centre">🌀<small>Entrée</small><span class="coord">${m}</span></div>`; continue; }
        const t = trouves[m], c = candidats[m];
        const cls = t !== undefined ? "trouve" : c !== undefined ? "candidat" : "";
        const pc = COUL_PIED[t !== undefined ? t : c] || "transparent";
        plan += `<div class="map ${cls}" style="--pc:${pc}">${t !== undefined ? `<span class="ordre">${t + 1}</span>` : ""}
          <span class="ico">${ICONES[o]}</span>${o}<span class="coord">${m}</span>${t !== undefined ? "<span class='fleur'>🌸</span>" : ""}</div>`;
      }
    }
    $("plan-ouvrage").innerHTML = plan + "</div>";
  }

  // ---------- Bataille navale ----------
  function caseNav(x, y) { return String.fromCharCode(65 + x) + (y + 1); }
  function grilleNav(el, cle, tirsRecus) {
    const { cols, rows } = etat.nav;
    let h = `<table><tr><th></th>${Array.from({ length: cols }, (_, x) => `<th>${String.fromCharCode(65 + x)}</th>`).join("")}</tr>`;
    for (let y = 0; y < rows; y++) {
      h += `<tr><th>${y + 1}</th>`;
      for (let x = 0; x < cols; x++) {
        const c = caseNav(x, y);
        const bateau = etat.nav[cle].includes(c);
        const tir = tirsRecus[c];
        const coule = tir && tir.fait;
        h += `<td class="${bateau ? "bateau" : ""} ${coule ? "coule" : ""}" data-c="${c}">${coule ? "💥" : bateau ? "⛵" : ""}${tir && !coule ? `<span class="n-tir">${tir.n}</span>` : ""}</td>`;
      }
      h += "</tr>";
    }
    el.innerHTML = h + "</table>";
    el.querySelectorAll("td").forEach((td) => td.addEventListener("click", () => {
      const l = etat.nav[cle], c = td.dataset.c;
      etat.nav[cle] = l.includes(c) ? l.filter((v) => v !== c) : l.concat(c);
      etat.nav.faits = [];
      sauver();
    }));
  }
  function rendreNavale() {
    $("nav-cols").value = etat.nav.cols; $("nav-rows").value = etat.nav.rows;
    const r = S.solveNavale(etat.nav.a, etat.nav.b);
    // tirs reçus par chaque map : A tire sur les bateaux de B et inversement
    const recusA = {}, recusB = {};
    r.tours.forEach((t, i) => {
      const info = { n: i + 1, fait: etat.nav.faits.includes(i) };
      if (t.map === "[21,17]") recusB[t.cible] = info; else recusA[t.cible] = info;
    });
    grilleNav($("nav-a"), "a", recusA); grilleNav($("nav-b"), "b", recusB);
    let h = "";
    const na = etat.nav.a.length, nb = etat.nav.b.length;
    if (na !== 3 || nb !== 3) h += `<p class="info">Bateaux notés : ${na}/3 sur la map A, ${nb}/3 sur la map B.</p>`;
    h += r.alertes.map((a) => `<p class="alerte">⚠️ ${a}</p>`).join("");
    if (r.tours.length) {
      h += "<div class='tirs'>" + r.tours.map((t, i) => {
        const a = t.map === "[21,17]";
        const fait = etat.nav.faits.includes(i);
        return `<label class="tir ${a ? "tir-a" : "tir-b"} ${fait ? "fait" : ""}">
          <input type="checkbox" data-i="${i}" ${fait ? "checked" : ""}>
          <span class="num">${i + 1}</span>
          <span><span class="badge ${a ? "badge-a" : "badge-b"}">${a ? "A" : "B"}</span> Map ${t.map} tire</span>
          <span class="boules"><span class="boule">${t.lettre}</span><span class="boule">${t.chiffre}</span></span>
          <span>${fait ? "💥 coulé" : "🎯"}</span></label>`;
      }).join("") + "</div>";
      if (etat.nav.faits.length === r.tours.length) h += `<p class="ok gros-ok">🎉 Les 6 bateaux sont coulés !</p>`;
    }
    $("navale-res").innerHTML = h;
    $("navale-res").querySelectorAll("input[type=checkbox]").forEach((x) => x.addEventListener("change", () => {
      const i = parseInt(x.dataset.i, 10);
      etat.nav.faits = x.checked ? etat.nav.faits.concat(i) : etat.nav.faits.filter((v) => v !== i);
      sauver();
    }));
  }
  ["nav-cols", "nav-rows"].forEach((id) => $(id).addEventListener("change", (e) => {
    const v = Math.max(2, Math.min(10, parseInt(e.target.value, 10) || 3));
    etat.nav[id === "nav-cols" ? "cols" : "rows"] = v; sauver();
  }));

  // ---------- Échecs ----------
  // Les rôles sont imposés par le jeu : chaque personnage est une pièce. La tour noire joue en premier.
  // Anciennes sauvegardes : départs libres → on revient aux 4 cases fixes.
  const deps = etat.ech.departs;
  if (Array.isArray(deps) || CASES_DEPART.some((c) => !Object.values(deps).includes(c))) etat.ech.departs = { ...DEPARTS_DEFAUT };
  const pieceParId = (id) => PIECES.find((p) => p.id === id);
  function rendreEchecsOutils() {
    const opts = PIECES.map((p) => `<option value="c-${p.id}">🎯 Cible ${p.symbole} ${p.nom}</option>`);
    $("ech-outil").innerHTML = opts.join("");
  }
  function rendreEchecs() {
    const n = etat.ech.taille;
    $("ech-taille").value = n;
    const plan = calculEchecs();
    const etapes = {};
    if (plan && plan.tours) {
      let k = 0;
      plan.tours.forEach((t) => t.forEach((a) => { if (a.vers) etapes[a.vers] = (etapes[a.vers] ? etapes[a.vers] + "," : "") + (++k); }));
    }
    let h = `<table class="echiquier"><tr><th></th>${Array.from({ length: n }, (_, x) => `<th>${x + 1}</th>`).join("")}</tr>`;
    for (let y = 0; y < n; y++) {
      h += `<tr><th>${String.fromCharCode(65 + y)}</th>`;
      for (let x = 0; x < n; x++) {
        const c = S.nomCase({ x, y });
        let txt = "", cls = "";
        PIECES.forEach((p) => { if ((etat.ech.cibles[p.id] || "").toUpperCase() === c) { txt += `<span class="piece ${p.camp}">${p.symbole}</span>`; cls += " cible"; } });
        PIECES.forEach((p) => { if ((etat.ech.departs[p.id] || "").toUpperCase() === c) { txt += `<span class="depart ${p.camp}">${p.symbole}</span>`; cls += " dep"; } });
        if (etapes[c]) txt += `<span class="n-tir">${etapes[c]}</span>`;
        h += `<td class="${(x + y) % 2 ? "sombre" : ""}${etapes[c] ? " etape" : ""}${cls}" data-c="${c}">${txt}</td>`;
      }
      h += "</tr>";
    }
    $("ech-plateau").innerHTML = h + "</table>";
    $("ech-plateau").querySelectorAll("td").forEach((td) => td.addEventListener("click", () => {
      const [k, v] = $("ech-outil").value.split("-");
      const c = td.dataset.c;
      if (k !== "c") return;
      etat.ech.cibles[v] = etat.ech.cibles[v] === c ? "" : c;
      sauver();
    }));

    $("ech-form").querySelectorAll("input").forEach((inp) => {
      if (inp === document.activeElement) return;
      inp.value = etat.ech.cibles[inp.dataset.c] || "";
    });
    $("ech-form").querySelectorAll("select[data-o]").forEach((sel) => { sel.value = etat.ech.ordre[sel.dataset.o]; });
    $("ech-form").querySelectorAll("select[data-d]").forEach((sel) => { sel.value = etat.ech.departs[sel.dataset.d]; });

    let r = "";
    const cibles = PIECES.filter((p) => S.parseCase(etat.ech.cibles[p.id]));
    const nbDeparts = PIECES.filter((p) => S.parseCase(etat.ech.departs[p.id])).length;
    if (cibles.length < 4) r += `<p class="info">🎯 Cases cibles trouvées : ${cibles.length}/4.</p>`;
    else if (nbDeparts < 4) r += `<p class="info">🚩 Au début du combat, renseigne la case de départ de chaque pièce (${nbDeparts}/4) pour obtenir les déplacements.</p>`;
    else if (plan.erreur) r += `<p class="alerte">⚠️ Impossible : ${plan.erreur}.</p>`;
    else {
      r += `<p class="ok gros-ok">✔ Placement en ${plan.tours.length} tour(s) :</p>`;
      let k = 0;
      plan.tours.forEach((t, i) => {
        r += `<div class="tour-jeu"><div class="tour-titre">Tour ${i + 1}</div>` + t.map((a) => {
          const p = pieceParId(a.id);
          if (a.attend) return `<div class="mouv attend"><span class="piece ${p.camp}">${p.symbole}</span> ${a.nom} : ${a.enPlace ? "déjà en place ⚡ peut donner des PA" : "passe son tour"}</div>`;
          return `<div class="mouv"><span class="n-tir">${++k}</span><span class="piece ${p.camp}">${p.symbole}</span> <b>${a.nom}</b> : ${a.de} ➜ <b>${a.vers}</b></div>`;
        }).join("") + "</div>";
      });
      r += "<p class='petit'>Les numéros sur le plateau indiquent l'ordre des déplacements. Aucune pièce ne traverse une autre. Le plan n'utilise pas le don de PA.</p>";
    }
    $("echecs-res").innerHTML = r;
  }
  function rendreEchecsForm() {
    const optsOrdre = PIECES.map((p) => `<option value="${p.id}">${p.symbole} ${p.nom}</option>`).join("");
    $("ech-form").innerHTML = "<table class='form'><tr><th>Pièce</th><th>🎯 Cible</th><th>🚩 Départ</th></tr>" +
      PIECES.map((p) => `<tr><td><span class="piece ${p.camp}">${p.symbole}</span> ${p.nom}</td><td><input data-c="${p.id}" placeholder="ex. C4" size="4"></td><td><select data-d="${p.id}">${CASES_DEPART.map((c) => `<option>${c}</option>`).join("")}</select></td></tr>`).join("") +
      "</table><p class='petit'>Ordre de jeu dans le combat :</p><div class='ordre'>" +
      [0, 1, 2, 3].map((i) => `<span class="num">${i + 1}</span><select data-o="${i}">${optsOrdre}</select>`).join("") + "</div>";
    $("ech-form").querySelectorAll("input").forEach((inp) => inp.addEventListener("change", () => {
      const v = inp.value.trim().toUpperCase();
      etat.ech.cibles[inp.dataset.c] = v;
      sauver();
    }));
    $("ech-form").querySelectorAll("select[data-d]").forEach((sel) => sel.addEventListener("change", () => {
      // échange avec la pièce qui occupait déjà cette case de départ
      const d = etat.ech.departs, id = sel.dataset.d;
      const autre = Object.keys(d).find((k) => d[k] === sel.value);
      if (autre) d[autre] = d[id];
      d[id] = sel.value;
      sauver();
    }));
    $("ech-form").querySelectorAll("select[data-o]").forEach((sel) => sel.addEventListener("change", () => {
      // échange avec la position qui avait déjà cette pièce, pour garder un ordre valide
      const o = etat.ech.ordre, i = parseInt(sel.dataset.o, 10), j = o.indexOf(sel.value);
      [o[i], o[j]] = [o[j], o[i]];
      sauver();
    }));
  }
  function calculEchecs() {
    const pieces = etat.ech.ordre.map((id) => {
      const p = pieceParId(id);
      return { id, nom: p.nom, type: p.type, cible: etat.ech.cibles[id], depart: etat.ech.departs[id] };
    });
    if (pieces.some((p) => !S.parseCase(p.cible) || !S.parseCase(p.depart))) return null;
    return S.planifierEchecs(pieces, etat.ech.taille, 4);
  }
  $("ech-taille").addEventListener("change", (e) => {
    etat.ech.taille = Math.max(4, Math.min(16, parseInt(e.target.value, 10) || 11)); sauver();
  });

  // ---------- Clos ----------
  const NOMS_JARDINS = ["Haut", "Droite", "Bas", "Gauche"];
  function rendreClos() {
    const n = etat.clos.taille;
    $("clos-taille").value = n;
    $("jardins").innerHTML = etat.clos.jardins.map((j, i) => {
      let h = `<div class="carte jardin-carte ${j.length === 3 ? "complet" : ""}"><h3>🌳 Jardin ${NOMS_JARDINS[i]} <span class="compteur">${j.length}/3</span></h3><table class="jardin">`;
      for (let y = 0; y < n; y++) {
        h += "<tr>";
        for (let x = 0; x < n; x++) {
          const c = `${x},${y}`;
          h += `<td data-j="${i}" data-c="${c}" class="${(x + y) % 2 ? "herbe2" : ""} ${j.includes(c) ? "statue" : ""}">${j.includes(c) ? "🗿" : ""}</td>`;
        }
        h += "</tr>";
      }
      return h + "</table></div>";
    }).join("");
    $("jardins").querySelectorAll("td").forEach((td) => td.addEventListener("click", () => {
      const l = etat.clos.jardins[td.dataset.j], c = td.dataset.c;
      etat.clos.jardins[td.dataset.j] = l.includes(c) ? l.filter((v) => v !== c) : l.concat(c);
      sauver();
    }));

    $("statues").innerHTML = S.STATUES.map((s) =>
      `<button class="statue-btn ${etat.statue === s ? "choisie" : ""}" data-s="${s}"><span class="gros">${FLEURS[s]}</span>${s}</button>`).join("");
    $("statues").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      etat.statue = etat.statue === b.dataset.s ? "" : b.dataset.s; sauver();
    }));
    const coul = TEINTES[etat.couleur];
    $("clos-couleur").innerHTML = coul
      ? `<span class="puce" style="--cc:${coul.hex}"></span> <b>${coul.nom}</b> (${coul.teinte})`
      : `<button class="lien" data-go="ouvrage">? à obtenir dans l'Ouvrage</button>`;
    $("clos-couleur").querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => ouvrirOnglet("ouvrage")));
    const r = etat.statue && etat.couleur ? S.solveClos(etat.statue, etat.couleur) : null;
    $("clos-res").innerHTML = r
      ? `<p class="ok gros-ok" style="--cc:${coul.hex}">⚔️ Combattre ${FLEURS[r.statue]} <b>${r.statue} ${r.teinte.toLowerCase()}</b> en <b>${r.map}</b></p>`
      : `<p class="info">Choisis la statue apparue et la couleur de l'Ouvrage.</p>`;

    // Plan du Clos : le centre [11,20] et les 4 maps autour
    const pos = { "[11,19]": [1, 0], "[10,20]": [0, 1], "[11,20]": [1, 1], "[12,20]": [2, 1], "[11,21]": [1, 2] };
    let svg = `<svg viewBox="0 0 300 300" class="svg-clos" role="img" aria-label="Plan du Clos des Protecteurs">`;
    Object.entries(pos).forEach(([m, [cx, cy]]) => {
      const x = cx * 100 + 8, y = cy * 100 + 8, centre = m === "[11,20]", cible = r && r.map === m;
      const fill = cible ? coul.hex : centre ? "var(--case-sombre)" : "var(--herbe)";
      svg += `<rect x="${x}" y="${y}" width="84" height="84" rx="12" fill="${fill}" class="${cible ? "pulse" : ""}" stroke="var(--bord)" stroke-width="2"/>`;
      svg += `<text x="${x + 42}" y="${y + 40}" text-anchor="middle" font-size="26">${centre ? (r ? FLEURS[r.statue] : "🗿") : cible ? "⚔️" : "🌿"}</text>`;
      svg += `<text x="${x + 42}" y="${y + 68}" text-anchor="middle" class="svg-txt ${cible ? "svg-blanc" : ""}">${m}</text>`;
    });
    svg += `<text x="50" y="30" text-anchor="middle" class="svg-txt">N ↑</text></svg>`;
    $("plan-clos").innerHTML = svg + `<p class="petit">Plan du Clos : la statue apparaît au centre, le protecteur à combattre est sur la map ${r ? "colorée" : "indiquée"}.</p>`;
  }
  $("clos-taille").addEventListener("change", (e) => {
    etat.clos.taille = Math.max(3, Math.min(10, parseInt(e.target.value, 10) || 8)); sauver();
  });

  // ---------- Gardiens ----------
  function rendreGardiens() {
    const ouv = S.solveOuvrage(etat.piedestaux, etat.fleurs);
    const g = S.solveGardiens({ statue: etat.statue, couleur: etat.couleur, objetsFleurs: ouv.objetsFleurs });
    const coul = TEINTES[etat.couleur];
    const carte = (ico, titre, contenu, ok) => `<div class="carte gardien ${ok ? "pret" : ""}"><h3><span class="gros">${ico}</span> ${titre}</h3>${contenu}</div>`;

    const veilleur = g.veilleur
      ? `<p class="ok">Tuer en premier : ${FLEURS[etat.statue]} <b>${etat.statue}</b></p><p class="petit">Le Veilleur perd alors son invulnérabilité. Mauvais premier monstre = combat perdu.</p>`
      : `<p class="info">Il faut la statue du Clos (énigme 4).</p>`;

    const objs = Object.keys(S.OBJETS).map((o) =>
      `<span class="glyphe ${ouv.objetsFleurs.includes(o) ? "bon" : ""}">${ICONES[o]}<small>${o}</small></span>`).join("");
    const clos = (g.gardienClos ? `<p class="ok">Marcher sur les 4 glyphes allumés :</p>` : `<p class="info">Il faut les 4 fleurs de l'Ouvrage (énigme 1).</p>`) +
      `<div class="glyphes">${objs}</div>`;

    const obel = ["orange", "bleu", "rouge", "vert"].map((k) => {
      const t = TEINTES[k], bon = etat.couleur === k;
      return `<div class="obelisque ${bon ? "bon" : ""}"><svg viewBox="0 0 40 80"><polygon points="20,2 32,20 28,74 12,74 8,20" fill="${t.hex}" stroke="#0004" stroke-width="2"/><rect x="4" y="72" width="32" height="6" rx="2" fill="#7a6a55"/></svg><small>${t.teinte}</small></div>`;
    }).join("");
    const sentinelle = (coul
      ? `<p class="ok">Frapper l'obélisque <b style="color:${coul.hex}">${coul.teinte.toLowerCase()}</b> jusqu'à 1 PV, puis attirer la Sentinelle dans son glyphe 3×3.</p>`
      : `<p class="info">Il faut la couleur de l'Ouvrage. Sinon, l'élément de Chromage et Kaléidos l'indique : 🔥 écarlate, 💧 azuré, 🌪️ viridine, 🪨 ambré.</p>`) +
      `<div class="obelisques">${obel}</div>`;

    $("gardiens-res").innerHTML =
      carte("👁️", "Veilleur de l'Ouvrage", veilleur, Boolean(g.veilleur)) +
      carte("🛡️", "Gardien du Clos", clos, Boolean(g.gardienClos)) +
      carte("🪨", "Défenseur de la Réserve", `<p>Pas d'énigme. Une fois ses monstres morts, il joue 2 fois par tour et devient plus fort à chaque tour : prévoir soin et protection.</p>`, true) +
      carte("🗼", "Sentinelle de la Cour", sentinelle, Boolean(coul));
  }
  function rendreTableClos() {
    const teintes = Object.keys(S.TABLE_CLOS);
    $("table-clos").innerHTML = "<table class='form table-clos'><tr><th></th>" + S.STATUES.map((s) => `<th>${FLEURS[s]} ${s}</th>`).join("") + "</tr>" +
      teintes.map((t) => `<tr style="--cc:${hexTeinte(t)}"><th><span class="puce"></span> ${t}</th>${S.STATUES.map((s) => `<td>${S.TABLE_CLOS[t][s]}</td>`).join("")}</tr>`).join("") + "</table>";
  }

  function tout() {
    rendreOuvrage(); rendreNavale(); rendreEchecs(); rendreClos(); rendreGardiens(); rendreProgression();
  }
  // Les formulaires ne sont reconstruits qu'au reset (garde le focus pendant la saisie)
  rendreOuvrageForm(); rendreEchecsOutils(); rendreEchecsForm(); rendreTableClos(); tout();

  // Interface utilisée par sync.js pour les sessions de raid partagées.
  window.AppRaid = {
    cles: Object.keys(etatVide()),
    etat: () => etat,
    vider() { viderEtat(); enregistrer(); tout(); },
    // Applique une section reçue d'un autre joueur, sans la renvoyer.
    appliquer(cle, valeur) {
      const defaut = etatVide()[cle];
      etat[cle] = defaut && typeof defaut === "object" && !Array.isArray(defaut) ? fusion(defaut, valeur || {}) : valeur;
      enregistrer();
      const focus = document.activeElement;
      if (cle === "piedestaux" && !(focus && $("ouvrage-form").contains(focus))) rendreOuvrageForm();
      tout();
    },
  };
})();
