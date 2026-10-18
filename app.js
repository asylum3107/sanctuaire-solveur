(function () {
  "use strict";
  const S = window.Solveurs;
  const $ = (id) => document.getElementById(id);
  const CLE = "sanctuaire-etat-v1";

  const PIECES = [
    { id: "tb", nom: "Tour blanche", type: "tour", symbole: "♖" },
    { id: "tn", nom: "Tour noire", type: "tour", symbole: "♜" },
    { id: "fb", nom: "Fou blanc", type: "fou", symbole: "♗" },
    { id: "fn", nom: "Fou noir", type: "fou", symbole: "♝" },
  ];

  function etatVide() {
    return {
      piedestaux: [["", ""], ["", ""], ["", ""], ["", ""]],
      fleurs: [null, null, null, null],
      couleur: "",
      nav: { cols: 4, rows: 3, a: [], b: [], faits: [] },
      ech: { taille: 11, cibles: {}, departs: {}, ordre: ["tn", "tb", "fn", "fb"] },
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
  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ }
    tout();
  }
  function flash(t) { $("msg").textContent = t; setTimeout(() => { $("msg").textContent = ""; }, 2500); }

  // ---------- Onglets ----------
  document.querySelectorAll("#onglets button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#onglets button").forEach((x) => x.classList.toggle("actif", x === b));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("actif", t.id === "tab-" + b.dataset.tab));
  }));

  $("partager").addEventListener("click", () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(etat))));
    const url = location.href.split("#")[0] + "#e=" + code;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(() => flash("Lien copié !"), () => { prompt("Copie ce lien :", url); });
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("Effacer toutes les données du raid ?")) return;
    etat = etatVide(); history.replaceState(null, "", location.pathname); sauver();
  });

  // ---------- Ouvrage ----------
  function rendreOuvrageForm() {
    const objets = Object.keys(S.OBJETS);
    $("ouvrage-form").innerHTML = etat.piedestaux.map((p, i) => `
      <div class="carte"><h3>Piédestal ${["I", "II", "III", "IV"][i]}</h3>
        ${[0, 1].map((j) => `<select data-p="${i}" data-o="${j}"><option value="">objet ?</option>
          ${objets.map((o) => `<option ${p[j] === o ? "selected" : ""}>${o}</option>`).join("")}</select>`).join("")}
      </div>`).join("");
    $("ouvrage-form").querySelectorAll("select").forEach((s) => s.addEventListener("change", () => {
      etat.piedestaux[s.dataset.p][s.dataset.o] = s.value;
      etat.fleurs[s.dataset.p] = null;
      sauver();
    }));
  }
  function rendreOuvrage() {
    const r = S.solveOuvrage(etat.piedestaux, etat.fleurs);
    let h = r.erreurs.map((e) => `<p class="alerte">${e}</p>`).join("");
    h += "<ol class='etapes'>" + r.etapes.map((e, i) => {
      if (!e.candidats.length) return `<li>Piédestal ${e.piedestal} : renseigne ses 2 objets.</li>`;
      const opts = e.candidats.map((c, j) => `<label class="choix ${e.fleur === c.objet ? "ok" : ""}">
        <input type="radio" name="fleur${i}" data-i="${i}" value="${j}" ${etat.fleurs[i] === j ? "checked" : ""}>
        ${c.objet} ${c.map}</label>`).join(" ou ");
      return `<li><b>Piédestal ${e.piedestal}</b> : va voir ${opts}${e.fleur ? ` → <b>active la fleur en ${e.mapFleur}</b>` : ""}</li>`;
    }).join("") + "</ol>";
    if (r.complet) h += `<p class="ok">Ordre : ${r.etapes.map((e) => `${e.fleur} ${e.mapFleur}`).join(" → ")}</p>`;
    $("ouvrage-res").innerHTML = h;
    $("ouvrage-res").querySelectorAll("input[type=radio]").forEach((x) => x.addEventListener("change", () => {
      etat.fleurs[x.dataset.i] = parseInt(x.value, 10); sauver();
    }));
    $("couleur").value = etat.couleur;
  }
  $("couleur").addEventListener("change", (e) => { etat.couleur = e.target.value; sauver(); });

  // ---------- Bataille navale ----------
  function caseNav(x, y) { return String.fromCharCode(65 + x) + (y + 1); }
  function grilleNav(el, cle) {
    const { cols, rows } = etat.nav;
    let h = `<table><tr><th></th>${Array.from({ length: cols }, (_, x) => `<th>${String.fromCharCode(65 + x)}</th>`).join("")}</tr>`;
    for (let y = 0; y < rows; y++) {
      h += `<tr><th>${y + 1}</th>`;
      for (let x = 0; x < cols; x++) {
        const c = caseNav(x, y);
        h += `<td class="${etat.nav[cle].includes(c) ? "bateau" : ""}" data-c="${c}">${etat.nav[cle].includes(c) ? "⛵" : ""}</td>`;
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
    grilleNav($("nav-a"), "a"); grilleNav($("nav-b"), "b");
    const r = S.solveNavale(etat.nav.a, etat.nav.b);
    let h = "";
    const na = etat.nav.a.length, nb = etat.nav.b.length;
    if (na !== 3 || nb !== 3) h += `<p class="info">Bateaux notés : ${na}/3 sur [21,17], ${nb}/3 sur [19,15].</p>`;
    h += r.alertes.map((a) => `<p class="alerte">${a}</p>`).join("");
    if (r.tours.length) {
      h += "<ol class='etapes'>" + r.tours.map((t, i) => `<li class="${etat.nav.faits.includes(i) ? "fait" : ""}">
        <label><input type="checkbox" data-i="${i}" ${etat.nav.faits.includes(i) ? "checked" : ""}>
        Map <b>${t.map}</b> tire en <b>${t.cible}</b> (boule ${t.lettre} puis boule ${t.chiffre})</label></li>`).join("") + "</ol>";
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
  if (Array.isArray(etat.ech.departs)) etat.ech.departs = {};
  const pieceParId = (id) => PIECES.find((p) => p.id === id);
  function rendreEchecsOutils() {
    const opts = PIECES.map((p) => `<option value="c-${p.id}">Cible ${p.symbole} ${p.nom}</option>`)
      .concat(PIECES.map((p) => `<option value="d-${p.id}">Départ ${p.symbole} ${p.nom}</option>`));
    $("ech-outil").innerHTML = opts.join("");
  }
  function rendreEchecs() {
    const n = etat.ech.taille;
    $("ech-taille").value = n;
    const plan = calculEchecs();
    const etapes = {};
    if (plan && plan.tours) plan.tours.flat().forEach((a) => { if (a.vers) etapes[a.vers] = true; });
    let h = `<table class="echiquier"><tr><th></th>${Array.from({ length: n }, (_, x) => `<th>${String.fromCharCode(65 + x)}</th>`).join("")}</tr>`;
    for (let y = 0; y < n; y++) {
      h += `<tr><th>${y + 1}</th>`;
      for (let x = 0; x < n; x++) {
        const c = S.nomCase({ x, y });
        let txt = "";
        PIECES.forEach((p) => { if ((etat.ech.cibles[p.id] || "").toUpperCase() === c) txt += p.symbole; });
        PIECES.forEach((p) => { if ((etat.ech.departs[p.id] || "").toUpperCase() === c) txt += `<sub>${p.symbole}D</sub>`; });
        h += `<td class="${(x + y) % 2 ? "sombre" : ""} ${etapes[c] ? "etape" : ""}" data-c="${c}">${txt}</td>`;
      }
      h += "</tr>";
    }
    $("ech-plateau").innerHTML = h + "</table>";
    $("ech-plateau").querySelectorAll("td").forEach((td) => td.addEventListener("click", () => {
      const [k, v] = $("ech-outil").value.split("-");
      const c = td.dataset.c;
      const cible = k === "c" ? etat.ech.cibles : etat.ech.departs;
      cible[v] = cible[v] === c ? "" : c;
      sauver();
    }));

    $("ech-form").querySelectorAll("input").forEach((inp) => {
      if (inp === document.activeElement) return;
      inp.value = (inp.dataset.c ? etat.ech.cibles[inp.dataset.c] : etat.ech.departs[inp.dataset.d]) || "";
    });
    $("ech-form").querySelectorAll("select").forEach((sel) => { sel.value = etat.ech.ordre[sel.dataset.o]; });

    let r = "";
    const cibles = PIECES.filter((p) => S.parseCase(etat.ech.cibles[p.id]));
    const nbDeparts = PIECES.filter((p) => S.parseCase(etat.ech.departs[p.id])).length;
    if (cibles.length < 4) r += `<p class="info">Cases cibles trouvées : ${cibles.length}/4.</p>`;
    else if (nbDeparts < 4) r += `<p class="info">Au début du combat, renseigne la case de départ de chaque pièce (${nbDeparts}/4) pour obtenir les déplacements tour par tour.</p>`;
    else if (plan.erreur) r += `<p class="alerte">Impossible : ${plan.erreur}.</p>`;
    else {
      r += `<p class="ok">Placement en ${plan.tours.length} tour(s), dans l'ordre de jeu :</p>`;
      plan.tours.forEach((t, k) => {
        r += `<p><b>Tour ${k + 1}</b></p><ul class="etapes">` + t.map((a) => {
          const p = pieceParId(a.id);
          if (a.attend) return `<li>${p.symbole} ${a.nom} : ${a.enPlace ? "déjà en place, ne bouge pas (peut donner des PA)" : "attend (passe son tour)"}</li>`;
          return `<li>${p.symbole} <b>${a.nom}</b> : ${a.de} → <b>${a.vers}</b></li>`;
        }).join("") + "</ul>";
      });
      r += "<p class='petit'>Un coup = un déplacement en ligne droite (tour) ou en diagonale (fou), sans traverser une autre pièce. Le plan n'utilise pas le don de PA.</p>";
    }
    $("echecs-res").innerHTML = r;
  }
  function rendreEchecsForm() {
    const optsOrdre = PIECES.map((p) => `<option value="${p.id}">${p.symbole} ${p.nom}</option>`).join("");
    $("ech-form").innerHTML = "<table class='form'><tr><th>Pièce</th><th>Cible</th><th>Départ</th></tr>" +
      PIECES.map((p) => `<tr><td>${p.symbole} ${p.nom}</td><td><input data-c="${p.id}" placeholder="ex. C4" size="4"></td><td><input data-d="${p.id}" placeholder="ex. A1" size="4"></td></tr>`).join("") +
      "</table><p class='petit'>Ordre de jeu dans le combat :</p><div class='ligne'>" +
      [0, 1, 2, 3].map((i) => `${i + 1}. <select data-o="${i}">${optsOrdre}</select>`).join(" ") + "</div>";
    $("ech-form").querySelectorAll("input").forEach((inp) => inp.addEventListener("change", () => {
      const v = inp.value.trim().toUpperCase();
      if (inp.dataset.c) etat.ech.cibles[inp.dataset.c] = v; else etat.ech.departs[inp.dataset.d] = v;
      sauver();
    }));
    $("ech-form").querySelectorAll("select").forEach((sel) => sel.addEventListener("change", () => {
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
      let h = `<div class="carte"><h3>Jardin ${NOMS_JARDINS[i]} <span class="petit">(${j.length}/3)</span></h3><table class="jardin">`;
      for (let y = 0; y < n; y++) {
        h += "<tr>";
        for (let x = 0; x < n; x++) {
          const c = `${x},${y}`;
          h += `<td data-j="${i}" data-c="${c}" class="${j.includes(c) ? "statue" : ""}">${j.includes(c) ? "🗿" : ""}</td>`;
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
    $("statue").value = etat.statue;
    const coul = S.COULEURS[etat.couleur];
    $("clos-couleur").textContent = coul ? `${etat.couleur} (${coul.teinte})` : "? (à obtenir dans l'Ouvrage)";
    const r = etat.statue && etat.couleur ? S.solveClos(etat.statue, etat.couleur) : null;
    $("clos-res").innerHTML = r
      ? `<p class="ok">Combattre <b>${r.statue}</b> en <b>${r.map}</b> (statue ${r.statue}, couleur ${r.teinte}).</p>`
      : `<p class="info">Choisis la statue apparue et la couleur de l'Ouvrage.</p>`;
  }
  $("statue").innerHTML += S.STATUES.map((s) => `<option>${s}</option>`).join("");
  $("statue").addEventListener("change", (e) => { etat.statue = e.target.value; sauver(); });
  $("clos-taille").addEventListener("change", (e) => {
    etat.clos.taille = Math.max(3, Math.min(10, parseInt(e.target.value, 10) || 8)); sauver();
  });

  // ---------- Gardiens ----------
  function rendreGardiens() {
    const ouv = S.solveOuvrage(etat.piedestaux, etat.fleurs);
    const g = S.solveGardiens({ statue: etat.statue, couleur: etat.couleur, objetsFleurs: ouv.objetsFleurs });
    const ligne = (titre, txt, manque) => `<div class="carte"><h3>${titre}</h3><p class="${txt ? "ok" : "info"}">${txt || manque}</p></div>`;
    $("gardiens-res").innerHTML =
      ligne("Veilleur de l'Ouvrage", g.veilleur, "Il faut la statue du Clos (énigme 4).") +
      ligne("Gardien du Clos", g.gardienClos, "Il faut les 4 fleurs de l'Ouvrage (énigme 1).") +
      ligne("Défenseur de la Réserve", "Pas d'énigme : il joue 2 fois par tour une fois ses monstres morts. Prévoir soin et protection.", "") +
      ligne("Sentinelle de la Cour", g.sentinelle, "Il faut la couleur de l'Ouvrage. Sinon, l'élément de Chromage et Kaléidos l'indique (feu = écarlate, eau = azuré, air = viridine, terre = ambré).");
  }
  function rendreTableClos() {
    const teintes = Object.keys(S.TABLE_CLOS);
    $("table-clos").innerHTML = "<table class='form'><tr><th></th>" + S.STATUES.map((s) => `<th>${s}</th>`).join("") + "</tr>" +
      teintes.map((t) => `<tr><th>${t}</th>${S.STATUES.map((s) => `<td>${S.TABLE_CLOS[t][s]}</td>`).join("")}</tr>`).join("") + "</table>";
  }

  function tout() {
    rendreOuvrage(); rendreNavale(); rendreEchecs(); rendreClos(); rendreGardiens();
  }
  rendreOuvrageForm(); rendreEchecsOutils(); rendreEchecsForm(); rendreTableClos(); tout();
  // Le formulaire des piédestaux n'est reconstruit qu'au reset (garde le focus pendant la saisie)
  $("reset").addEventListener("click", rendreOuvrageForm);
})();
