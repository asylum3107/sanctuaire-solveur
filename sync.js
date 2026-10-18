// Sessions de raid partagées : plusieurs joueurs remplissent le même solveur en direct.
// Stockage : Firebase Realtime Database via son API REST (PATCH pour écrire, flux EventSource pour lire).
// Chaque section de l'état (nav, ech, clos...) est stockée en texte JSON sous sessions/<ID>/<section>,
// ce qui évite les conversions de tableaux de Firebase et limite les conflits entre joueurs.
(function () {
  "use strict";
  const A = window.AppRaid;
  const $ = (id) => document.getElementById(id);
  const BASE = (window.SANCTUAIRE_DB || "").trim().replace(/\/+$/, "");
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let id = null;        // ID de la session en cours
  let flux = null;      // EventSource
  let pret = false;     // état distant reçu au moins une fois
  let etatCo = "";      // "connexion" | "ok" | "erreur"
  let synchro = {};     // dernière valeur connue côté serveur, par section

  const url = () => `${BASE}/sessions/${id}.json`;

  function nouvelId() {
    const t = new Uint32Array(6);
    crypto.getRandomValues(t);
    return Array.from(t, (v) => ALPHABET[v % ALPHABET.length]).join("");
  }

  function majUrl() {
    const u = new URL(location.href);
    if (id) u.searchParams.set("raid", id); else u.searchParams.delete("raid");
    u.hash = "";
    history.replaceState(null, "", u.pathname + u.search);
  }

  function envoyer() {
    if (!id || !pret) return;
    const e = A.etat();
    const maj = {};
    A.cles.forEach((k) => {
      const s = JSON.stringify(e[k]);
      if (synchro[k] !== s) { maj[k] = s; synchro[k] = s; }
    });
    if (!Object.keys(maj).length) return;
    fetch(url(), { method: "PATCH", body: JSON.stringify(maj) })
      .then((r) => { if (!r.ok) throw new Error(r.status); })
      .catch(() => {
        Object.keys(maj).forEach((k) => { delete synchro[k]; }); // sera renvoyé au prochain changement
        etatCo = "erreur"; rendre();
      });
  }

  function appliquer(k, s) {
    if (!A.cles.includes(k)) return;
    if (s === null || s === undefined) { delete synchro[k]; return; }
    if (typeof s !== "string") return;
    synchro[k] = s;
    if (JSON.stringify(A.etat()[k]) === s) return;
    try { A.appliquer(k, JSON.parse(s)); } catch (e) { /* donnée illisible : ignorée */ }
  }

  function recevoir(type, msg) {
    const { path, data } = msg;
    if (path === "/") {
      if (type === "put") {
        // État complet : on prend ce qui existe sur le serveur, puis on complète ce qui manque avec nos données.
        A.cles.forEach((k) => appliquer(k, data ? data[k] : null));
        if (!pret) { pret = true; }
        envoyer();
      } else if (data) {
        Object.keys(data).forEach((k) => appliquer(k, data[k]));
      }
    } else {
      appliquer(path.slice(1).split("/")[0], data);
    }
    etatCo = "ok"; rendre();
  }

  function connecter(nouvel) {
    deconnecter(false);
    id = nouvel; pret = false; synchro = {}; etatCo = "connexion";
    majUrl(); rendre();
    flux = new EventSource(url());
    ["put", "patch"].forEach((type) => flux.addEventListener(type, (ev) => {
      try { recevoir(type, JSON.parse(ev.data)); } catch (e) { /* message illisible */ }
    }));
    flux.addEventListener("cancel", () => { etatCo = "erreur"; rendre(); });
    flux.onerror = () => { etatCo = flux && flux.readyState === 2 ? "erreur" : "connexion"; rendre(); };
  }

  function deconnecter(maj = true) {
    if (flux) flux.close();
    flux = null; pret = false;
    if (maj) { id = null; majUrl(); rendre(); }
  }

  function copierLien() {
    const lien = `${location.origin}${location.pathname}?raid=${id}`;
    (navigator.clipboard ? navigator.clipboard.writeText(lien) : Promise.reject())
      .then(() => flash("Lien de session copié !"), () => { prompt("Copie ce lien :", lien); });
  }
  function flash(t) { $("msg").textContent = t; setTimeout(() => { $("msg").textContent = ""; }, 2500); }

  function rendre() {
    const el = $("session");
    if (!BASE) {
      el.innerHTML = `<span class="session-titre">👥 Session de raid</span><span class="session-info">Pas encore configurée : il faut une base Firebase.</span>`;
      return;
    }
    if (!id) {
      el.innerHTML = `<span class="session-titre">👥 Session de raid</span>
        <button id="s-creer">➕ Créer une session</button>
        <span class="session-ou">ou</span>
        <input id="s-id" placeholder="ID (ex. K7QH2M)" maxlength="12" size="12" autocomplete="off">
        <button id="s-rejoindre">Rejoindre</button>`;
      $("s-creer").addEventListener("click", () => {
        if (!confirm("Créer une nouvelle session de raid ? Le solveur repart de zéro pour ce nouveau raid.")) return;
        A.vider();
        connecter(nouvelId());
      });
      const rejoindre = () => {
        const v = $("s-id").value.trim().toUpperCase();
        if (!/^[A-Z0-9]{4,12}$/.test(v)) { flash("ID invalide"); return; }
        connecter(v);
      };
      $("s-rejoindre").addEventListener("click", rejoindre);
      $("s-id").addEventListener("keydown", (e) => { if (e.key === "Enter") rejoindre(); });
      return;
    }
    const pastille = { ok: "🟢 En direct", connexion: "🟡 Connexion…", erreur: "🔴 Hors ligne" }[etatCo] || "";
    el.innerHTML = `<span class="session-titre">👥 Session</span><b class="session-id">${id}</b>
      <span class="session-info">${pastille}</span>
      <button id="s-lien">🔗 Copier le lien de la session</button>
      <button id="s-quitter">Quitter</button>`;
    $("s-lien").addEventListener("click", copierLien);
    $("s-quitter").addEventListener("click", () => deconnecter());
  }

  window.SyncRaid = { envoyer };
  const depuisUrl = new URL(location.href).searchParams.get("raid");
  if (BASE && depuisUrl && /^[A-Z0-9]{4,12}$/i.test(depuisUrl)) connecter(depuisUrl.toUpperCase());
  else rendre();
})();
