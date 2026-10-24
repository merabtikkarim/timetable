import { useState } from 'react';

const TYPES = [['', 'Tous usages'], ['Cours', 'Cours (amphi)'], ['TD', 'TD'], ['TP', 'TP (labo)']];

export default function RoomsPanel({ rooms, setRooms, promos, setPromos }) {
  const [f, setF] = useState({ name: '', capacity: 30, type: '' });
  const nodes = promos.flatMap(p => [p, ...p.sections, ...p.sections.flatMap(s => s.groups)]);
  const users = name => nodes.filter(n => (n.rooms || []).includes(name)).map(n => n.name);

  function add() {
    const name = f.name.trim();
    if (!name) return;
    if (rooms.some(r => r.name === name)) return alert('Cette salle existe déjà');
    setRooms([...rooms, { name, capacity: Math.max(0, +f.capacity || 0), type: f.type }]);
    setF({ ...f, name: '' });
  }
  const patch = (i, p) => setRooms(rooms.map((r, k) => (k === i ? { ...r, ...p } : r)));
  function del(i) {
    const name = rooms[i].name;
    setRooms(rooms.filter((_, k) => k !== i));
    const c = structuredClone(promos); // retire aussi la salle des promos
    c.forEach(p => [p, ...p.sections, ...p.sections.flatMap(s => s.groups)].forEach(n => {
      if (n.rooms) n.rooms = n.rooms.filter(r => r !== name);
    }));
    setPromos(c);
  }

  return (
    <section>
      <h2>Salles</h2>
      <div className="row">
        <div><label>Nom de la salle</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div style={{ flex: '0 0 130px' }}><label>Nombre de places</label>
          <input type="number" min="0" value={f.capacity} onChange={e => setF({ ...f, capacity: e.target.value })} /></div>
        <div style={{ flex: '0 0 170px' }}><label>Usage</label>
          <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <button className="p" onClick={add}>Ajouter</button>
      </div>
      <p className="msg">{rooms.length} salle(s). Capacité 0 = non précisée. « Usage » : une salle TP n'accueille que des séances TP, etc.</p>
      {rooms.length > 0 && (
        <div className="sc">
          <table>
            <thead><tr><th>Salle</th><th>Places</th><th>Usage</th><th>Assimilée à</th><th /></tr></thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={r.name}>
                  <td dir="auto">{r.name}</td>
                  <td><input type="number" min="0" style={{ width: 90 }} value={r.capacity}
                    onChange={e => patch(i, { capacity: Math.max(0, +e.target.value || 0) })} /></td>
                  <td><select value={r.type || ''} onChange={e => patch(i, { type: e.target.value })}>
                    {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                  <td dir="auto">{users(r.name).join(' ; ') || <small>aucune (libre pour tous)</small>}</td>
                  <td><button onClick={() => del(i)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}