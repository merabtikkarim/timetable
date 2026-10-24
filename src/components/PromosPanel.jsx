import { useState } from 'react';
import { makePromo, nodeList } from '../model';

const sum = L => L.reduce((t, g) => t + (+g.size || 0), 0);

export default function PromosPanel({ promos, setPromos, acts, setActs, modules, setModules, rooms }) {
  const [f, setF] = useState({ name: '', total: 60, ns: 1, ng: 2 });
  const [open, setOpen] = useState('');
  const up = fn => { const c = structuredClone(promos); fn(c); setPromos(c); };
  const taken = new Set(nodeList(promos).map(n => n.name));
  const uniq = prefix => { let i = 1; while (taken.has(prefix + i)) i++; return prefix + i; };

  // retire des modules et des activités les promos/sections/groupes supprimés
  function purge(names) {
    const s = new Set(names);
    const strip = x => ({ ...x, groups: x.groups.filter(g => !s.has(g)) });
    const ms = modules.map(strip).filter(m => m.groups.length);
    const ids = new Set(ms.map(m => m.id));
    setModules(ms);
    setActs(acts.map(strip).filter(a => a.groups.length && (!a.mod || ids.has(a.mod))));
  }
  function add() {
    const name = f.name.trim();
    if (!name || taken.has(name)) return alert('Nom vide ou déjà utilisé');
    const p = makePromo(name, +f.total || 0, Math.max(1, +f.ns), Math.max(1, +f.ng));
    if (p.sections.some(s => taken.has(s.name) || s.groups.some(g => taken.has(g.name)))) return alert('Un nom de section ou de groupe existe déjà');
    setPromos([...promos, p]); setF({ ...f, name: '' });
  }
  const addSection = pi => up(c => {
    const p = c[pi], sn = uniq(p.name + ' S');
    p.sections.push({ name: sn, rooms: [], groups: [{ name: sn + ' G1', size: 0, rooms: [] }] });
  });
  const addGroup = (pi, si) => up(c => { const s = c[pi].sections[si]; s.groups.push({ name: uniq(s.name + ' G'), size: 0, rooms: [] }); });
  const delPromo = pi => {
    const p = promos[pi];
    purge([p.name, ...p.sections.flatMap(s => [s.name, ...s.groups.map(g => g.name)])]);
    setPromos(promos.filter((_, i) => i !== pi));
  };
  const delSection = (pi, si) => {
    const s = promos[pi].sections[si];
    purge([s.name, ...s.groups.map(g => g.name)]);
    up(c => c[pi].sections.splice(si, 1));
  };
  const delGroup = (pi, si, gi) => {
    purge([promos[pi].sections[si].groups[gi].name]);
    up(c => c[pi].sections[si].groups.splice(gi, 1));
  };
  const setSize = (pi, si, gi, v) => up(c => { c[pi].sections[si].groups[gi].size = Math.max(0, +v || 0); });

  // assimilation des salles à une promo, une section ou un groupe
  const nodeAt = (c, pi, si, gi) => (gi != null ? c[pi].sections[si].groups[gi] : si != null ? c[pi].sections[si] : c[pi]);
  const toggleRoom = (pi, si, gi, room) => up(c => {
    const n = nodeAt(c, pi, si, gi);
    n.rooms = n.rooms || [];
    const i = n.rooms.indexOf(room);
    if (i < 0) n.rooms.push(room); else n.rooms.splice(i, 1);
  });
  const roomCell = n => (
    <td>
      <button onClick={() => setOpen(open === n.name ? '' : n.name)} dir="auto">
        {(n.rooms || []).length ? n.rooms.join(', ') : 'toutes les salles'} ✎
      </button>
    </td>
  );
  const roomRow = (n, pi, si, gi) => open === n.name && (
    <tr key={n.name + '#r'}>
      <td colSpan={4}>
        {rooms.length ? rooms.map(r => (
          <label key={r.name} dir="auto" style={{ display: 'inline-flex', gap: 4, marginInlineEnd: 14, color: 'var(--fg)' }}>
            <input type="checkbox" checked={(n.rooms || []).includes(r.name)} onChange={() => toggleRoom(pi, si, gi, r.name)} />
            {r.name} ({r.capacity || '?'}{r.type ? ', ' + r.type : ''})
          </label>
        )) : "Crée d'abord des salles."}
        <p className="msg">Aucune case cochée = toutes les salles. Une section ou un groupe utilise les salles de sa promo, sauf s'il a les siennes.</p>
      </td>
    </tr>
  );

  return (
    <section>
      <h2>Promotions, sections et groupes</h2>
      <div className="row">
        <div><label>Nom de la promo</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div style={{ flex: '0 0 110px' }}><label>Étudiants</label><input type="number" min="0" value={f.total} onChange={e => setF({ ...f, total: e.target.value })} /></div>
        <div style={{ flex: '0 0 110px' }}><label>Sections</label><input type="number" min="1" value={f.ns} onChange={e => setF({ ...f, ns: e.target.value })} /></div>
        <div style={{ flex: '0 0 140px' }}><label>Groupes / section</label><input type="number" min="1" value={f.ng} onChange={e => setF({ ...f, ng: e.target.value })} /></div>
        <button className="p" onClick={add}>Créer la promo</button>
      </div>
      <p className="msg">Les étudiants sont répartis à parts égales entre les groupes. Clique sur « ✎ » pour assimiler des salles à une promo, une section ou un groupe.</p>
      {promos.length > 0 && (
        <div className="sc">
          <table>
            <thead><tr><th>Nom</th><th>Effectif</th><th>Salles assimilées</th><th /></tr></thead>
            <tbody>
              {promos.flatMap((p, pi) => [
                <tr key={p.name}>
                  <td dir="auto"><b>{p.name}</b> (promo)</td>
                  <td>{sum(p.sections.flatMap(s => s.groups))}</td>
                  {roomCell(p)}
                  <td><button onClick={() => addSection(pi)}>+ section</button> <button onClick={() => delPromo(pi)}>✕</button></td>
                </tr>,
                roomRow(p, pi, null, null),
                ...p.sections.flatMap((s, si) => [
                  <tr key={s.name}>
                    <td dir="auto" style={{ paddingInlineStart: 24 }}>{s.name} (section)</td>
                    <td>{sum(s.groups)}</td>
                    {roomCell(s)}
                    <td><button onClick={() => addGroup(pi, si)}>+ groupe</button> <button onClick={() => delSection(pi, si)}>✕</button></td>
                  </tr>,
                  roomRow(s, pi, si, null),
                  ...s.groups.flatMap((g, gi) => [
                    <tr key={g.name}>
                      <td dir="auto" style={{ paddingInlineStart: 48 }}>{g.name}</td>
                      <td><input type="number" min="0" style={{ width: 90 }} value={g.size} onChange={e => setSize(pi, si, gi, e.target.value)} /></td>
                      {roomCell(g)}
                      <td><button onClick={() => delGroup(pi, si, gi)}>✕</button></td>
                    </tr>,
                    roomRow(g, pi, si, gi),
                  ]),
                ]),
              ])}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}