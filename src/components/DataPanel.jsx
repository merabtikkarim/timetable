import { useState } from 'react';
import { importCSV } from '../csv';
import { makePromo, moduleActs, uid } from '../model';

export default function DataPanel({ days, hours, setDays, setHours, acts, setActs, setPromos, setRooms, setTeachers, setModules, modules, setUnav, setMaxDays }) {
  const [keep, setKeep] = useState(false);
  const split = v => v.split(',').map(x => x.trim()).filter(Boolean);

  async function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const r = importCSV(await f.text(), days, hours, keep);
      setActs(r.acts); setPromos(r.promos); setRooms(r.rooms); setTeachers(r.teachers); setModules(r.modules);
      setUnav({}); setMaxDays({});
    } catch (err) { alert(err.message); }
    e.target.value = '';
  }
  function example() {
    const P = [makePromo('L1', 60, 2, 2), makePromo('L2', 30, 1, 2)];
    const R = [{ name: 'Amphi', capacity: 80 }, { name: 'Salle A', capacity: 40 }, { name: 'Salle B', capacity: 20 }, { name: 'Salle C', capacity: 20 }];
    const T = ['Dr Amine', 'Dr Sara', 'Dr Karim', 'Dr Leila', 'Dr Yacine'].map(name => ({ name }));
    const ms = [];
    const addM = (name, type, teacher, g, sessions) => ms.push({ m: { id: uid(), name, type, teacher, groups: [g], room: '' }, sessions });
    P.forEach((p, k) => {
      addM('Maths', 'Cours', T[k].name, p.name, 2);
      addM('Physique', 'Cours', T[2].name, p.name, 2);
      p.sections.forEach(s => {
        addM('Maths', 'TD', T[3].name, s.name, 1);
        s.groups.forEach(g => addM('Informatique', 'TP', T[4].name, g.name, 1));
      });
    });
    setPromos(P); setRooms(R); setTeachers(T);
    setModules(ms.map(x => x.m)); setActs(ms.flatMap(x => moduleActs(x.m, x.sessions)));
    setUnav({}); setMaxDays({});
  }
  function autoRooms() {
    setModules(modules.map(m => ({ ...m, room: '' })));
    setActs(acts.map(a => ({ ...a, room: '' })));
  }

  return (
    <section>
      <h2>Calendrier et importation</h2>
      <div className="row">
        <div><label>Jours (virgules)</label>
          <input defaultValue={days.join(',')} onBlur={e => { setDays(split(e.target.value)); setUnav({}); }} /></div>
        <div><label>Créneaux (virgules)</label>
          <input defaultValue={hours.join(',')} onBlur={e => { setHours(split(e.target.value)); setUnav({}); }} /></div>
      </div>
      <div className="row">
        <div><label>Importer un CSV (crée promos, salles, enseignants et modules)</label><input type="file" accept=".csv,.txt" onChange={onFile} /></div>
        <label><input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} /> Verrouiller les jours/heures du fichier</label>
        <button onClick={autoRooms}>Salles automatiques</button>
        <button onClick={example}>Exemple</button>
        <button onClick={() => { setActs([]); setPromos([]); setRooms([]); setTeachers([]); setModules([]); setUnav({}); setMaxDays({}); }}>Tout vider</button>
      </div>
      <p className="msg">{acts.length} séance(s), dont {acts.filter(a => a.fix != null).length} verrouillée(s).</p>
    </section>
  );
}