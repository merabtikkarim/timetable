// Hiérarchie : promo -> sections -> groupes. Seuls les groupes ont un effectif.
export function makePromo(name, total, nSec, nGrp) {
  const nG = nSec * nGrp, base = Math.floor(total / nG), extra = total % nG;
  let k = 0;
  const sections = [];
  for (let s = 1; s <= nSec; s++) {
    const groups = [];
        for (let g = 1; g <= nGrp; g++) groups.push({ name: `${name} S${s} G${g}`, size: base + (k++ < extra ? 1 : 0), rooms: [] });
    sections.push({ name: `${name} S${s}`, rooms: [], groups });
  }
  return { name, rooms: [], sections };
}

// nom d'un nœud (promo, section ou groupe) -> liste des groupes (feuilles)
export function leavesMap(promos) {
  const m = {};
  promos.forEach(p => {
    const all = [];
    p.sections.forEach(s => {
      m[s.name] = s.groups.map(g => g.name);
      s.groups.forEach(g => { m[g.name] = [g.name]; all.push(g.name); });
    });
    m[p.name] = all;
  });
  return m;
}

export function leafSizes(promos) {
  const m = {};
  promos.forEach(p => p.sections.forEach(s => s.groups.forEach(g => { m[g.name] = +g.size || 0; })));
  return m;
}

export function nodeList(promos) {
  const o = [];
  promos.forEach(p => {
    o.push({ name: p.name, label: `${p.name} (promo)`, level: 'P' });
    p.sections.forEach(s => {
      o.push({ name: s.name, label: `— ${s.name} (section)`, level: 'S' });
      s.groups.forEach(g => o.push({ name: g.name, label: `—— ${g.name} (groupe)`, level: 'G' }));
    });
  });
  return o;
}
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// libellé d'un module : « Maths (TD) »
export const subjOf = m => (m.type ? `${m.name} (${m.type})` : m.name);

// activités (séances) d'un module : une activité par séance hebdomadaire
export const moduleActs = (m, n) =>
  Array.from({ length: n }, () => ({ subj: subjOf(m), teacher: m.teacher, groups: m.groups, room: m.room, fix: null, mod: m.id, type: m.type }));
// groupe -> salles assimilées (celles du groupe, sinon de sa section, sinon de sa promo) ; absent = toutes les salles
export function leafRooms(promos) {
  const m = {};
  promos.forEach(p => p.sections.forEach(s => s.groups.forEach(g => {
    const r = [g.rooms, s.rooms, p.rooms].find(x => x && x.length);
    if (r) m[g.name] = r;
  })));
  return m;
}

// nœud (promo, section ou groupe) -> nom de sa promo
export function promoOf(promos) {
  const m = {};
  promos.forEach(p => {
    m[p.name] = p.name;
    p.sections.forEach(s => { m[s.name] = p.name; s.groups.forEach(g => { m[g.name] = p.name; }); });
  });
  return m;
}