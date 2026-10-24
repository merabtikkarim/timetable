import { uid } from './model.js';

export function parseCSV(t) {
  const r = []; let row = [], c = '', q = false;
  t = t.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const h = t[i];
    if (q) { if (h === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += h; }
    else if (h === '"') q = true;
    else if (h === ',') { row.push(c); c = ''; }
    else if (h === '\n' || h === '\r') {
      if (h === '\r' && t[i + 1] === '\n') i++;
      row.push(c); c = ''; if (row.some(x => x)) r.push(row); row = [];
    } else c += h;
  }
  if (c || row.length) { row.push(c); r.push(row); }
  return r;
}

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Retourne { acts, promos, rooms }
export function importCSV(text, days, hours, keep) {
  const R = parseCSV(text);
  if (R.length < 2) throw new Error('CSV vide');
  const h = R[0].map(norm), ix = (...k) => h.findIndex(x => k.includes(x));
  const c = { s: ix('matiere', 'subject'), t: ix('enseignant', 'teacher'), g: ix('groupe', 'group'),
    r: ix('salle', 'room'), y: ix('annee'), n: ix('niveau'), p: ix('specialite'),
    d: ix('jour'), b: ix('debut'), k: ix('remarque') };
  if (c.s < 0) throw new Error('Colonne « Matière » introuvable');
  const get = (r, i) => (i >= 0 ? (r[i] || '').trim() : '');
  const H = hours.length, bg = {};

  const rows = R.slice(1).map(r => {
    const base = [get(r, c.y), get(r, c.n).replace(/أستاذ التعليم/g, '').replace(/\s+/g, ' ').trim(), get(r, c.p)].filter(Boolean).join(' ') || 'Tous';
    let room = get(r, c.r); const rm = get(r, c.k);
    if (rm.includes('المدرج')) room = 'المدرج';
    else if (rm.includes('القاعة الكبرى') && !room.includes('القاعة الكبرى')) room = 'القاعة الكبرى';
    const gt = get(r, c.g).split(/\s+و\s+|\s*\+\s*/).map(x => x.trim().replace(/^0+(?=\d)/, '')).filter(Boolean);
    (bg[base] = bg[base] || new Set()); gt.forEach(x => bg[base].add(x));
    const d = days.indexOf(get(r, c.d)), b = get(r, c.b), hh = b ? hours.findIndex(x => x.startsWith(b)) : -1;
    return { base, gt, subj: get(r, c.s), teacher: get(r, c.t).replace(/^أستاذ[ة]?\s+/, ''), room, d, dk: d + ':' + b,
      fix: keep && d >= 0 && hh >= 0 ? d * H + hh : null };
  });

  const gname = (base, g) => `${base} G${g}`;
  const seen = new Set(), mg = new Map(), out = [];
  rows.forEach(a => {
    // cible : les groupes cités, ou toute la promo si aucun groupe n'est précisé
    a.groups = a.gt.length ? a.gt.map(g => gname(a.base, g)) : [a.base];
    const k = [a.base, a.groups.join(), a.dk, a.subj, a.teacher, a.room].join('|');
    if (seen.has(k)) return; seen.add(k);
    const mk = a.teacher && a.d >= 0 ? [a.teacher, a.room, a.dk].join('|') : null;
    if (mk && mg.has(mk)) { const o = mg.get(mk); o.groups = [...new Set([...o.groups, ...a.groups])]; return; }
    if (mk) mg.set(mk, a);
    out.push(a);
  });

  const promos = Object.entries(bg).map(([base, set]) => {
    const toks = [...set];
    const names = toks.length ? toks.map(g => gname(base, g)) : [gname(base, 1)];
    return { name: base, sections: [{ name: `${base} S1`, groups: names.map(name => ({ name, size: 0 })) }] };
  });
  const rooms = [...new Set(rows.map(r => r.room).filter(Boolean))].map(name => ({ name, capacity: 0 }));
    // un module par (matière, enseignant, public, salle) ; le nombre de séances = nombre d'activités
  const mods = new Map();
  out.forEach(a => {
    const k = [a.subj, a.teacher, a.groups.join(), a.room].join('|');
    if (!mods.has(k)) mods.set(k, { id: uid(), name: a.subj, type: '', teacher: a.teacher, groups: a.groups, room: a.room });
    a.mod = mods.get(k).id;
  });
  const teachers = [...new Set(out.map(a => a.teacher).filter(Boolean))].sort().map(name => ({ name }));
  return {
    acts: out.map(a => ({ subj: a.subj, teacher: a.teacher, groups: a.groups, room: a.room, fix: a.fix, mod: a.mod })),
    promos, rooms, teachers, modules: [...mods.values()],
  };
}

const EN = { 'الأحد': 'Sunday', 'الاثنين': 'Monday', 'الثلاثاء': 'Tuesday', 'الأربعاء': 'Wednesday', 'الخميس': 'Thursday', 'الجمعة': 'Friday', 'السبت': 'Saturday',
  dimanche: 'Sunday', lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday' };
const dayName = d => EN[d.trim()] || EN[d.trim().toLowerCase()] || d;
// « 08:00-09:30 » devient « 08:00 – 09:30 » (format du modèle officiel)
const hourName = h => { const m = h.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/); return m ? `${m[1]} – ${m[2]}` : h; };

// Format du modèle officiel : Day, Hour, Students Sets, Subject, Teachers, Room
// une ligne par ensemble d'étudiants (promo, section ou groupe visé), triée par jour puis heure
export function toCSV(acts, time, roomNames, days, hours, english = true) {
  const H = hours.length, q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const rows = [];
  acts.forEach((a, i) => {
    if (time[i] < 0) return;
    (a.groups.length ? a.groups : ['']).forEach(g => rows.push({ d: Math.floor(time[i] / H), h: time[i] % H, g, a, room: roomNames[i] }));
  });
  rows.sort((x, y) => x.d - y.d || x.h - y.h || x.g.localeCompare(y.g));
  const lines = [['Day', 'Hour', 'Students Sets', 'Subject', 'Teachers', 'Room'].map(q).join(',')];
  rows.forEach(r => lines.push([english ? dayName(days[r.d]) : days[r.d], hourName(hours[r.h]), r.g, r.a.subj, r.a.teacher, r.room].map(q).join(',')));
  return lines.join('\r\n') + '\r\n';
}