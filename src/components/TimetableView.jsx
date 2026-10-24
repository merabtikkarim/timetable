import { useMemo, useState } from 'react';
import { leavesMap, nodeList } from '../model';
import { toCSV } from '../csv';

const VIEWS = { P: 'Promo', S: 'Section', G: 'Groupe', T: 'Enseignant', R: 'Salle' };

export default function TimetableView({ result }) {
  const { acts, days, hours, promos } = result.data;
  const { time, room, leaves } = result;
  const H = hours.length;
  const lv = useMemo(() => leavesMap(promos), [result]);
  const nodes = useMemo(() => nodeList(promos), [result]);
  const [view, setView] = useState('G');
  const [ent, setEnt] = useState('');
  const [en, setEn] = useState(true);

  const keys = view === 'T' ? [...new Set(acts.map(a => a.teacher).filter(Boolean))].sort()
    : view === 'R' ? [...new Set(room.filter(Boolean))].sort()
    : nodes.filter(n => n.level === view).map(n => n.name);
  const cur = keys.includes(ent) ? ent : keys[0];
  const match = i => view === 'T' ? acts[i].teacher === cur
    : view === 'R' ? room[i] === cur
    : leaves[i].some(g => (lv[cur] || []).includes(g));

    const csv = useMemo(() => toCSV(acts, time, room, days, hours, en), [result, en]);
  const download = () => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM comme le modèle
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'timetable.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const unplaced = time.map((v, i) => (v < 0 ? i : -1)).filter(i => i >= 0);

  const bad = useMemo(() => {
    const m = {};
    acts.forEach((a, i) => {
      if (time[i] < 0) return;
      const es = [...(a.teacher ? ['Enseignant ' + a.teacher] : []), ...leaves[i].map(g => 'Groupe ' + g), ...(room[i] ? ['Salle ' + room[i]] : [])];
      es.forEach(e => { const k = e + '@' + time[i]; (m[k] = m[k] || []).push(a.subj); });
    });
    return Object.entries(m).filter(([, v]) => v.length > 1).map(([k, v]) => {
      const [e, s] = k.split('@');
      return `${e} — ${days[Math.floor(s / H)]} ${hours[s % H]} : ${v.join(' / ')}`;
    });
  }, [result]);

  const info = i => {
    const a = acts[i], g = a.groups.join('+');
    return (view === 'G' ? [a.teacher, room[i]] : view === 'T' ? [g, room[i]] : view === 'R' ? [a.teacher, g] : [g, a.teacher, room[i]]).filter(Boolean).join(' · ');
  };

  return (
    <section>
      <h2>Résultat</h2>
      <p className="msg">{result.placed} / {result.n} placées en {(result.ms / 1000).toFixed(1)} s ({result.it} itérations)</p>
      {result.warnings.length > 0 && <p className="msg er">Avertissements :<br />{result.warnings.slice(0, 15).map((w, i) => <span key={i} dir="auto">{w}<br /></span>)}</p>}
      {unplaced.length > 0 && <p className="msg er" dir="auto">Non placées : {unplaced.slice(0, 20).map(i => `${acts[i].subj} (${acts[i].groups.join('+')})`).join(' ; ')}</p>}
      {bad.length > 0 && <p className="msg er" dir="auto">Conflits ({bad.length}) :<br />{bad.slice(0, 25).map((b, i) => <span key={i}>{b}<br /></span>)}</p>}
      <div className="row">
        <div><label>Vue</label>
          <select value={view} onChange={e => setView(e.target.value)}>
            {Object.entries(VIEWS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label>Élément</label>
          <select value={cur || ''} onChange={e => setEnt(e.target.value)}>
            {keys.map(k => <option key={k} value={k}>{k}</option>)}
          </select></div>
      </div>
      {cur && (
        <div className="sc">
          <table>
            <thead><tr><th />{days.map(d => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>
              {hours.map((h, j) => (
                <tr key={h}><th>{h}</th>
                  {days.map((_, d) => {
                    const L = acts.map((_, i) => i).filter(i => time[i] === d * H + j && match(i));
                    const clash = L.length > 1 && (view === 'G' || view === 'T' || view === 'R');
                    return (
                      <td key={d} dir="auto" className={clash ? 'bad' : ''}>
                        {L.map(i => <div key={i}><b>{acts[i].subj}</b><br /><small>{info(i)}</small></div>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
            <label>Export CSV (format du modèle officiel)</label>
      <label style={{ color: 'var(--fg)' }}>
        <input type="checkbox" checked={en} onChange={e => setEn(e.target.checked)} /> Jours en anglais (Monday, Tuesday…)
      </label>
      <textarea readOnly value={csv} />
      <button className="p" onClick={download}>Télécharger timetable.csv</button>{' '}
      <button onClick={() => navigator.clipboard?.writeText(csv)}>Copier</button>
    </section>
  );
}