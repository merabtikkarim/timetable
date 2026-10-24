import { useMemo, useState } from 'react';
import { leafRooms, promoOf } from '../model';

export default function OccupancyPanel({ acts, promos, rooms, days, hours, result }) {
  const H = hours.length, T = days.length * H;
  const [promoSel, setPromoSel] = useState('');
  const [fd, setFd] = useState(0), [fh, setFh] = useState(0), [fn, setFn] = useState(0);
  const po = useMemo(() => promoOf(promos), [promos]);
  const lr = useMemo(() => leafRooms(promos), [promos]);

  // charge estimée par promo : séances à placer / créneaux de ses salles assimilées
  const load = promos.map(p => {
    const leaves = p.sections.flatMap(s => s.groups.map(g => g.name));
    const names = new Set(); let all = false;
    leaves.forEach(g => (lr[g] ? lr[g].forEach(r => names.add(r)) : (all = true)));
    const rs = all ? rooms.map(r => r.name) : [...names].filter(r => rooms.some(x => x.name === r));
    const sessions = acts.filter(a => po[a.groups[0]] === p.name).length;
    const slots = rs.length * T;
    const students = p.sections.reduce((t, s) => t + s.groups.reduce((u, g) => u + (+g.size || 0), 0), 0);
    return { name: p.name, students, sessions, rs: all ? 'toutes' : rs.join(', ') || '—', pct: slots ? Math.round(100 * sessions / slots) : null };
  });

  // occupation réelle après génération
  const data = result?.data;
  const names = result ? [...new Set([...data.rooms.map(r => r.name), ...result.room.filter(Boolean)])] : [];
  const cap = n => data.rooms.find(r => r.name === n)?.capacity || 0;
  const occ = {};
  if (result) result.time.forEach((t, i) => {
    const r = result.room[i];
    if (t < 0 || !r) return;
    occ[r] = occ[r] || {};
    (occ[r][t] = occ[r][t] || []).push(i);
  });
  const shown = !result ? [] : names.filter(n => {
    if (!promoSel) return true;
    const p = promos.find(x => x.name === promoSel);
    const assigned = p && [p, ...p.sections, ...p.sections.flatMap(s => s.groups)].some(x => (x.rooms || []).includes(n));
    const used = Object.values(occ[n] || {}).some(L => L.some(i => po[acts[i].groups[0]] === promoSel));
    return assigned || used;
  });
  const free = result ? names.filter(n => !occ[n]?.[fd * H + fh] && cap(n) >= fn).sort((x, y) => cap(x) - cap(y)) : [];

  return (
    <section>
      <h2>Occupation des salles</h2>
      {promos.length > 0 && (
        <div className="sc">
          <table>
            <thead><tr><th>Promo</th><th>Étudiants</th><th>Séances / semaine</th><th>Salles assimilées</th><th>Charge estimée</th></tr></thead>
            <tbody>
              {load.map(l => (
                <tr key={l.name}><td dir="auto">{l.name}</td><td>{l.students}</td><td>{l.sessions}</td><td dir="auto">{l.rs}</td>
                  <td className={l.pct > 100 ? 'bad' : ''}>{l.pct == null ? '—' : l.pct + ' %'}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="msg">Charge estimée = séances de la promo ÷ créneaux disponibles dans ses salles assimilées. Plus de 100 % : il manque des salles.</p>
        </div>
      )}
      {!result && <p className="msg">Lance « Générer » pour voir l'occupation réelle de chaque salle.</p>}
      {result && (
        <>
          <div className="row">
            <div><label>Voir les salles de la promo</label>
              <select value={promoSel} onChange={e => setPromoSel(e.target.value)}>
                <option value="">Toutes les salles</option>
                {promos.map(p => <option key={p.name}>{p.name}</option>)}
              </select></div>
          </div>
          <div className="sc">
            <table className="mx">
              <thead>
                <tr><th rowSpan={2}>Salle</th><th rowSpan={2}>Taux</th>
                  {days.map(d => <th key={d} colSpan={H}>{d}</th>)}</tr>
                <tr>{days.flatMap((d, k) => hours.map((h, j) => <th key={k + '-' + j} title={h}>{j + 1}</th>))}</tr>
              </thead>
              <tbody>
                {shown.map(n => {
                  const used = Object.keys(occ[n] || {}).length;
                  return (
                    <tr key={n}>
                      <th dir="auto" style={{ whiteSpace: 'nowrap' }}>{n} <small>({cap(n) || '?'})</small></th>
                      <td>{Math.round(100 * used / T)} %</td>
                      {Array.from({ length: T }, (_, s) => {
                        const L = occ[n]?.[s] || [];
                        return (
                          <td key={s} dir="auto" className={L.length > 1 ? 'bad' : L.length ? 'occ' : ''}
                            title={L.map(i => `${acts[i].subj} — ${acts[i].groups.join('+')}`).join('\n')}>
                            {L.length ? acts[L[0]].subj.slice(0, 6) : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="msg">Cellule colorée = salle occupée (survole-la pour voir la séance). Les chiffres 1 à {H} sont les créneaux de chaque jour.</p>

          <h2 style={{ fontSize: 15, marginTop: 14 }}>Trouver une salle libre</h2>
          <div className="row">
            <div><label>Jour</label><select value={fd} onChange={e => setFd(+e.target.value)}>{days.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
            <div><label>Créneau</label><select value={fh} onChange={e => setFh(+e.target.value)}>{hours.map((h, i) => <option key={h} value={i}>{h}</option>)}</select></div>
            <div><label>Places minimum</label><input type="number" min="0" value={fn} onChange={e => setFn(Math.max(0, +e.target.value || 0))} /></div>
          </div>
          <p className="msg" dir="auto">{free.length ? 'Libres : ' + free.map(n => `${n} (${cap(n) || '?'})`).join(' ; ') : 'Aucune salle libre à ce créneau.'}</p>
        </>
      )}
    </section>
  );
}