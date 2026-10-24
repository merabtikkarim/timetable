import { useState } from 'react';

const KINDS = { T: 'Enseignant', G: 'Groupe', R: 'Salle' };

export default function ConstraintsPanel({ acts, promos, rooms, days, hours, unav, setUnav, maxG, setMaxG, maxT, setMaxT }) {
  const [kind, setKind] = useState('T');
  const [sel, setSel] = useState('');
    const leafNames = promos.flatMap(p => p.sections.flatMap(s => s.groups.map(g => g.name)));
  const list = [...new Set(
    kind === 'T' ? acts.map(a => a.teacher) : kind === 'G' ? leafNames : rooms.map(r => r.name)
  )].filter(Boolean).sort();
  const name = list.includes(sel) ? sel : list[0];
  const key = name ? kind + ':' + name : null;
  const H = hours.length, u = (key && unav[key]) || [];

  const save = arr => {
    const n = { ...unav };
    if (arr.length) n[key] = arr; else delete n[key];
    setUnav(n);
  };
  const toggle = s => save(u.includes(s) ? u.filter(x => x !== s) : [...u, s]);
  const toggleMany = slots => {
    const all = slots.every(s => u.includes(s));
    save(all ? u.filter(s => !slots.includes(s)) : [...new Set([...u, ...slots])]);
  };
  const toggleDay = d => toggleMany(hours.map((_, j) => d * H + j));
  const toggleHour = j => toggleMany(days.map((_, d) => d * H + j));
  const entries = Object.entries(unav);

  return (
    <section>
      <h2>Contraintes</h2>
      <p className="msg">Toujours imposé : pas de chevauchement pour un enseignant, un groupe ou une salle.</p>
      <div className="row">
        <div><label>Max d'heures/jour par groupe (0 = illimité)</label>
          <input type="number" min="0" value={maxG} onChange={e => setMaxG(+e.target.value)} /></div>
        <div><label>Max d'heures/jour par enseignant (0 = illimité)</label>
          <input type="number" min="0" value={maxT} onChange={e => setMaxT(+e.target.value)} /></div>
      </div>

      <h2 style={{ marginTop: 14 }}>Indisponibilités</h2>
      <div className="row">
        <div><label>Type</label>
          <select value={kind} onChange={e => { setKind(e.target.value); setSel(''); }}>
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label>{KINDS[kind]}</label>
          <select value={name || ''} onChange={e => setSel(e.target.value)}>
            {list.map(x => <option key={x}>{x}</option>)}
          </select></div>
        {key && u.length > 0 && <button onClick={() => save([])}>Tout débloquer</button>}
      </div>
      <p className="msg">Clique sur une case pour la bloquer, ou sur un jour / une heure pour bloquer toute la colonne / ligne.</p>
      {key && (
        <div className="sc">
          <table>
            <thead><tr><th />
              {days.map((d, i) => <th key={d}><button style={{ width: '100%' }} onClick={() => toggleDay(i)}>{d}</button></th>)}
            </tr></thead>
            <tbody>
              {hours.map((h, j) => (
                <tr key={h}>
                  <th><button style={{ width: '100%' }} onClick={() => toggleHour(j)}>{h}</button></th>
                  {days.map((_, d) => {
                    const s = d * H + j, x = u.includes(s);
                    return <td key={d}><button style={{ width: '100%' }} className={x ? 'x' : ''} onClick={() => toggle(s)}>{x ? '✕' : '·'}</button></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {entries.length > 0 && (
        <p className="msg">
          <b>Définies :</b>{' '}
          {entries.map(([k, v]) => (
            <span key={k} dir="auto" style={{ marginInlineEnd: 12, display: 'inline-block' }}>
              {KINDS[k[0]]} {k.slice(2)} ({v.length} créneaux){' '}
              <button onClick={() => { const n = { ...unav }; delete n[k]; setUnav(n); }}>✕</button>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}