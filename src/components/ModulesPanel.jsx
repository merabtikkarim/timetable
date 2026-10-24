import { useState } from 'react';
import { nodeList, moduleActs, uid } from '../model';

const TYPES = ['Cours', 'TD', 'TP'];

export default function ModulesPanel({ modules, setModules, acts, setActs, promos, rooms, teachers }) {
  const [f, setF] = useState({ name: '', type: 'Cours', teacher: '', groups: [], room: '', sessions: 2 });
  const [g, setG] = useState({ name: '', promo: '', cours: 2, td: 1, tp: 1, tdBy: 'S' });
  const nodes = nodeList(promos);
  const count = id => acts.filter(a => a.mod === id).length;
  const set = k => e => setF({ ...f, [k]: e.target.value });

  function add() {
    if (!f.name.trim() || !f.groups.length) return alert('Indique le nom du module et au moins une promo, section ou groupe.');
    const m = { id: uid(), name: f.name.trim(), type: f.type, teacher: f.teacher, groups: f.groups, room: f.room };
    setModules([...modules, m]);
    setActs([...acts, ...moduleActs(m, Math.max(1, Math.floor(+f.sessions || 1)))]);
    setF({ ...f, name: '' });
  }
  // Cours (promo) + TD (par section ou par groupe) + TP (par groupe) en une fois
  function generateAll() {
    const p = promos.find(x => x.name === g.promo || (!g.promo && promos.length === 1));
    if (!g.name.trim() || !p) return alert('Indique le nom du module et choisis la promo.');
    const list = [];
    const mk = (type, target, n) => {
      n = Math.max(0, Math.floor(+n || 0));
      if (n > 0) list.push({ m: { id: uid(), name: g.name.trim(), type, teacher: '', groups: [target], room: '' }, n });
    };
    mk('Cours', p.name, g.cours);
    p.sections.forEach(s => {
      if (g.tdBy === 'S') mk('TD', s.name, g.td); else s.groups.forEach(gr => mk('TD', gr.name, g.td));
      s.groups.forEach(gr => mk('TP', gr.name, g.tp));
    });
    setModules([...modules, ...list.map(x => x.m)]);
    setActs([...acts, ...list.flatMap(x => moduleActs(x.m, x.n))]);
    setG({ ...g, name: '' });
  }
  // volume horaire : nombre de séances par semaine (une séance = un créneau)
  function setSessions(m, v) {
    const n = Math.max(0, Math.floor(+v || 0)), cur = count(m.id);
    if (n > cur) setActs([...acts, ...moduleActs(m, n - cur)]);
    else if (n < cur) {
      const gone = new Set(acts.map((a, i) => [a, i]).filter(([a]) => a.mod === m.id)
        .sort((x, y) => (y[0].fix == null) - (x[0].fix == null)).slice(0, cur - n).map(x => x[1]));
      setActs(acts.filter((_, i) => !gone.has(i)));
    }
  }
  function patch(m, p) {
    setModules(modules.map(x => (x.id === m.id ? { ...x, ...p } : x)));
    setActs(acts.map(a => (a.mod === m.id ? { ...a, ...p } : a)));
  }
  function del(m) {
    setModules(modules.filter(x => x.id !== m.id));
    setActs(acts.filter(a => a.mod !== m.id));
  }
  const tNames = m => [...new Set([...teachers.map(t => t.name), m.teacher].filter(Boolean))];
  const rNames = m => [...new Set([...rooms.map(r => r.name), m.room].filter(Boolean))];

  return (
    <section>
      <h2>Modules : cours, TD et TP</h2>
      <p className="msg"><b>Création rapide</b> : cours pour la promo, TD pour chaque section (ou groupe) et TP pour chaque groupe.</p>
      <div className="row">
        <div><label>Module</label><input value={g.name} onChange={e => setG({ ...g, name: e.target.value })} /></div>
        <div><label>Promo</label>
          <select value={g.promo} onChange={e => setG({ ...g, promo: e.target.value })}>
            <option value="">{promos.length === 1 ? promos[0].name : '(choisir)'}</option>
            {promos.map(p => <option key={p.name}>{p.name}</option>)}
          </select></div>
        <div style={{ flex: '0 0 100px' }}><label>Cours / sem.</label><input type="number" min="0" value={g.cours} onChange={e => setG({ ...g, cours: e.target.value })} /></div>
        <div style={{ flex: '0 0 100px' }}><label>TD / sem.</label><input type="number" min="0" value={g.td} onChange={e => setG({ ...g, td: e.target.value })} /></div>
        <div style={{ flex: '0 0 130px' }}><label>TD par</label>
          <select value={g.tdBy} onChange={e => setG({ ...g, tdBy: e.target.value })}><option value="S">section</option><option value="G">groupe</option></select></div>
        <div style={{ flex: '0 0 100px' }}><label>TP / sem. (groupe)</label><input type="number" min="0" value={g.tp} onChange={e => setG({ ...g, tp: e.target.value })} /></div>
        <button className="p" onClick={generateAll}>Créer cours + TD + TP</button>
      </div>

      <p className="msg" style={{ marginTop: 14 }}><b>Création manuelle</b> d'un module :</p>
      <div className="row">
        <div><label>Module</label><input value={f.name} onChange={set('name')} /></div>
        <div style={{ flex: '0 0 110px' }}><label>Type</label>
          <select value={f.type} onChange={set('type')}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
        <div><label>Enseignant (optionnel)</label>
          <select value={f.teacher} onChange={set('teacher')}>
            <option value="">(aucun)</option>
            {teachers.map(t => <option key={t.name}>{t.name}</option>)}
          </select></div>
        <div><label>Public (Ctrl+clic pour plusieurs)</label>
          <select multiple size={4} value={f.groups} onChange={e => setF({ ...f, groups: [...e.target.selectedOptions].map(o => o.value) })}>
            {nodes.map(n => <option key={n.name} value={n.name}>{n.label}</option>)}
          </select></div>
        <div><label>Salle</label>
          <select value={f.room} onChange={set('room')}>
            <option value="">Automatique (salles de la promo)</option>
            {rooms.map(r => <option key={r.name} value={r.name}>{r.name} ({r.capacity || '?'} places)</option>)}
          </select></div>
        <div style={{ flex: '0 0 110px' }}><label>Séances / semaine</label>
          <input type="number" min="1" value={f.sessions} onChange={set('sessions')} /></div>
        <button className="p" onClick={add}>Ajouter</button>
      </div>
      <p className="msg">{modules.length} module(s), {acts.length} séance(s) par semaine au total.</p>
      {modules.length > 0 && (
        <div className="sc">
          <table>
            <thead><tr><th>Module</th><th>Type</th><th>Enseignant</th><th>Public</th><th>Salle</th><th>Séances</th><th /></tr></thead>
            <tbody>
              {modules.slice(0, 200).map(m => (
                <tr key={m.id}>
                  <td dir="auto">{m.name}</td><td>{m.type}</td>
                  <td><select value={m.teacher} onChange={e => patch(m, { teacher: e.target.value })}>
                    <option value="">(aucun)</option>{tNames(m).map(t => <option key={t}>{t}</option>)}</select></td>
                  <td dir="auto">{m.groups.join(' + ')}</td>
                  <td><select value={m.room} onChange={e => patch(m, { room: e.target.value })}>
                    <option value="">auto</option>{rNames(m).map(r => <option key={r}>{r}</option>)}</select></td>
                  <td><input type="number" min="0" style={{ width: 70 }} value={count(m.id)} onChange={e => setSessions(m, e.target.value)} /></td>
                  <td><button onClick={() => del(m)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {modules.length > 200 && <p className="msg">… {modules.length - 200} autres modules non affichés</p>}
        </div>
      )}
    </section>
  );
}