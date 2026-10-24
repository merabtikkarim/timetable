// Clés de `unav` et `maxDays` : "T:nom" (enseignant), "G:nom" (groupe), "R:nom" (salle).
import { leavesMap, leafSizes, leafRooms } from './model.js';

export function buildModel(acts, hours, days, promos = []) {
  const n = acts.length, H = hours.length, T = days.length * H;
  const lv = leavesMap(promos), sz = leafSizes(promos);
  // une activité sur une promo/section concerne tous ses groupes
  const leaves = acts.map(a => [...new Set(a.groups.flatMap(g => lv[g] || [g]))]);
  const students = leaves.map(L => L.reduce((t, g) => t + (sz[g] || 0), 0));
  const ents = acts.map((a, i) => [
    ...(a.teacher ? ['T:' + a.teacher] : []),
    ...leaves[i].map(g => 'G:' + g),
    ...(a.room ? ['R:' + a.room] : []),
  ]);
  const mem = {};
  ents.forEach((es, i) => es.forEach(e => (mem[e] = mem[e] || []).push(i)));
  const nb = ents.map((es, i) => {
    const s = new Set();
    es.forEach(e => mem[e].forEach(j => j !== i && s.add(j)));
    return [...s];
  });
  return { acts, n, H, T, ents, mem, nb, leaves, students };
}

export function generate({ acts, days, hours, promos = [], rooms = [], unav = {}, maxG = 0, maxT = 0, dayG = 0, dayT = 0, maxDays = {}, seconds = 10 }, onProgress = () => {}) {
  const M = buildModel(acts, hours, days, promos);
  const { n, H, T, ents, mem, nb, leaves, students } = M;
  const tm = new Int16Array(n).fill(-1), rm = new Int16Array(n).fill(-1);
  const rIdx = {}; rooms.forEach((r, i) => (rIdx[r.name] = i));
  const fixedR = acts.map(a => (a.room && rIdx[a.room] !== undefined ? rIdx[a.room] : -1));
  const warn = new Set();

  // salles assimilées : celles des groupes concernés (en commun, sinon l'ensemble) ; null = aucune restriction
  const lr = leafRooms(promos);
  const allowed = leaves.map(L => {
    const ls = L.map(g => lr[g]).filter(Boolean);
    if (!ls.length) return null;
    let s = ls.reduce((x, y) => x.filter(r => y.includes(r)));
    if (!s.length) s = [...new Set(ls.flat())];
    return s;
  });

  // salles candidates (attribution automatique) : assimilées, du bon type, assez grandes, la plus petite d'abord
  const cand = acts.map((a, i) => {
    if (a.room) {
      const r = fixedR[i];
      if (r >= 0 && rooms[r].capacity > 0 && students[i] > rooms[r].capacity)
        warn.add(`Salle trop petite : ${a.subj} (${students[i]} étudiants) en ${a.room} (${rooms[r].capacity} places)`);
      return null;
    }
    if (!rooms.length) return null;
    const L = rooms.map((_, k) => k).filter(k =>
      (!allowed[i] || allowed[i].includes(rooms[k].name)) && // salles assimilées à la promo
      (!rooms[k].type || !a.type || rooms[k].type === a.type) && // type de salle (Cours / TD / TP)
      (!rooms[k].capacity || rooms[k].capacity >= students[i]))
      .sort((x, y) => (rooms[x].capacity || 1e9) - (rooms[y].capacity || 1e9));
    if (!L.length) warn.add(`Aucune salle compatible (assimilation, type ou capacité) pour ${a.subj} (${a.groups.join('+')}, ${students[i]} étudiants)`);
    return L.length ? L : null;
  });
  // salle occupée par l'activité j (fixe enregistrée, ou attribuée)
  const ri = j => (fixedR[j] >= 0 ? fixedR[j] : cand[j] ? rm[j] : -1);
  let calls = 0;
  // nombre max de jours de présence par semaine (valeur propre à l'élément, sinon valeur globale)
  const dayLimit = e => maxDays[e] || (e[0] === 'T' ? dayT : e[0] === 'G' ? dayG : 0);

  // Retourne { c: activités à retirer, r: salle choisie } ou null si impossible
  function conf(ai, s, here) {
    const a = acts[ai], d = Math.floor(s / H);
    if (a.fix != null && a.fix !== s) return null;
    for (const e of ents[ai]) { const un = unav[e]; if (un && un.includes(s)) return null; }

    const c = new Set();
    for (const j of nb[ai]) if (tm[j] === s) { if (acts[j].fix != null) return null; c.add(j); }

    for (const e of ents[ai]) { // max d'heures par jour
      const L = e[0] === 'T' ? maxT : e[0] === 'G' ? maxG : 0;
      if (!L) continue;
      const l = mem[e].filter(j => j !== ai && tm[j] >= 0 && Math.floor(tm[j] / H) === d && !c.has(j));
      while (l.length + 1 > L) {
        const mv = l.filter(j => acts[j].fix == null);
        if (!mv.length) return null;
        const j = mv[Math.floor(Math.random() * mv.length)];
        c.add(j); l.splice(l.indexOf(j), 1);
      }
    }

    for (const e of ents[ai]) { // max de jours travaillés : si d est un nouveau jour, on libère d'autres jours
      const D = dayLimit(e);
      if (!D) continue;
      const byDay = {};
      for (const j of mem[e]) if (j !== ai && tm[j] >= 0 && !c.has(j)) (byDay[Math.floor(tm[j] / H)] = byDay[Math.floor(tm[j] / H)] || []).push(j);
      const used = Object.keys(byDay).length;
      if (byDay[d] || used + 1 <= D) continue;
      const need = used + 1 - D;
      const free = Object.keys(byDay).filter(x => byDay[x].every(j => acts[j].fix == null))
        .sort((x, y) => byDay[x].length - byDay[y].length || Math.random() - 0.5);
      if (free.length < need) return null;
      for (let k = 0; k < need; k++) byDay[free[k]].forEach(j => c.add(j));
    }

    let r = -1;
    if (cand[ai]) { // attribution automatique d'une salle assez grande
      const alt = [];
      for (const k of cand[ai]) {
        const un = unav['R:' + rooms[k].name];
        if (un && un.includes(s)) continue;
        const o = here.filter(j => j !== ai && !c.has(j) && ri(j) === k);
        if (!o.length) { r = k; break; }
        if (o.length === 1 && acts[o[0]].fix == null) alt.push([k, o[0]]);
      }
      if (r < 0) {
        if (!alt.length) return null;
        const [k, j] = alt[Math.floor(Math.random() * alt.length)];
        c.add(j); r = k;
      }
    }
    return { c: [...c], r };
  }

  function slotsFor(ai) {
    const at = Array.from({ length: T }, () => []);
    for (let j = 0; j < n; j++) if (tm[j] >= 0) at[tm[j]].push(j);
    const L = [];
    for (let s = 0; s < T; s++) { const x = conf(ai, s, at[s]); if (x) L.push([s, x.c, Math.random(), x.r]); }
    return L.sort((x, y) => x[1].length - y[1].length || x[2] - y[2]);
  }

  // randomSwap : niveau max 14, 2n appels, un seul créneau testé dès le niveau 5
  function rs(ai, lv) {
    if (++calls > 2 * n || lv > 14) return false;
    const L = slotsFor(ai);
    for (let k = 0; k < L.length; k++) {
      if (lv >= 5 && k > 0) break;
      const [s, c, , r] = L[k], st = tm.slice(), sr = rm.slice();
      c.forEach(j => (tm[j] = -1));
      tm[ai] = s; rm[ai] = r;
      if (c.every(j => tm[j] >= 0 || rs(j, lv + 1))) return true;
      tm.set(st); rm.set(sr);
    }
    return false;
  }

  // activités verrouillées d'avance, puis leur salle automatique
  acts.forEach((a, i) => { if (a.fix != null) tm[i] = a.fix; });
  acts.forEach((a, i) => {
    if (a.fix == null || !cand[i]) return;
    for (const k of cand[i]) {
      const un = unav['R:' + rooms[k].name];
      if (un && un.includes(tm[i])) continue;
      if (!acts.some((_, j) => j !== i && tm[j] === tm[i] && ri(j) === k)) { rm[i] = k; break; }
    }
  });

  const diff = acts.map((a, i) =>
    nb[i].length + ents[i].reduce((t, e) => t + (unav[e]?.length || 0), 0) * 2 +
    (cand[i] ? rooms.length - cand[i].length : 0) + (a.fix != null ? 1e4 : 0));
  const order = [...diff.keys()].sort((x, y) => diff[y] - diff[x]);

  const tabu = new Set(), stuck = new Set();
  const t0 = Date.now(), lim = Math.max(1, seconds) * 1000;
  let best = { tm: tm.slice(), rm: rm.slice() }, bestN = -1, it = 0, last = 0;

  while (true) {
    const ai = order.find(i => tm[i] < 0 && !stuck.has(i));
    if (ai === undefined || Date.now() - t0 > lim) break;
    calls = 0; it++;
    if (!rs(ai, 0)) {
      const L = slotsFor(ai);
      if (!L.length) { stuck.add(ai); continue; }
      let p = L.find(x => !tabu.has(ai + ':' + x[0]));
      if (!p) { tabu.clear(); p = L[0]; }
      tabu.add(ai + ':' + p[0]);
      p[1].forEach(j => (tm[j] = -1));
      tm[ai] = p[0]; rm[ai] = p[3];
    }
    let np = 0; for (const v of tm) if (v >= 0) np++;
    if (np > bestN) { bestN = np; best = { tm: tm.slice(), rm: rm.slice() }; }
    if (Date.now() - last > 200) { last = Date.now(); onProgress({ placed: bestN, n, it }); }
  }

  // jours travaillés au-delà du maximum (par exemple à cause d'activités verrouillées)
  for (const e in mem) {
    const D = dayLimit(e);
    if (!D) continue;
    const ds = new Set(mem[e].filter(j => best.tm[j] >= 0).map(j => Math.floor(best.tm[j] / H)));
    if (ds.size > D) warn.add(`Trop de jours : ${e[0] === 'T' ? 'enseignant' : 'groupe'} ${e.slice(2)} travaille ${ds.size} jours (max ${D})`);
  }
  const room = acts.map((a, i) => a.room || (best.tm[i] >= 0 && best.rm[i] >= 0 && cand[i] ? rooms[best.rm[i]].name : ''));
  const placed = best.tm.filter(v => v >= 0).length;
  return { time: Array.from(best.tm), room, leaves, placed, n, it, ms: Date.now() - t0, warnings: [...warn] };
}