import { useEffect, useRef, useState } from 'react';
import PromosPanel from './components/PromosPanel';
import RoomsPanel from './components/RoomsPanel';
import TeachersPanel from './components/TeachersPanel';
import DataPanel from './components/DataPanel';
import ModulesPanel from './components/ModulesPanel';
import ConstraintsPanel from './components/ConstraintsPanel';
import TimetableView from './components/TimetableView';
import OccupancyPanel from './components/OccupancyPanel';

const KEY = 'tt4'; // nouveau format de sauvegarde
const DEF = {
  days: 'الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس'.split(','),
  hours: '08:00-09:30,09:30-11:00,11:00-12:30,14:00-15:30,15:30-17:00'.split(','),
  acts: [], promos: [], rooms: [], teachers: [], modules: [],
  unav: {}, maxDays: {}, maxG: 0, maxT: 0, dayG: 0, dayT: 0,
};
function load() {
  try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEF; }
}

export default function App() {
  const [init] = useState(load);
  const [days, setDays] = useState(init.days);
  const [hours, setHours] = useState(init.hours);
  const [acts, setActs] = useState(init.acts);
  const [promos, setPromos] = useState(init.promos);
  const [rooms, setRooms] = useState(init.rooms);
  const [teachers, setTeachers] = useState(init.teachers);
  const [modules, setModules] = useState(init.modules);
  const [unav, setUnav] = useState(init.unav);
  const [maxDays, setMaxDays] = useState(init.maxDays);
  const [maxG, setMaxG] = useState(init.maxG);
  const [maxT, setMaxT] = useState(init.maxT);
  const [dayG, setDayG] = useState(init.dayG);
  const [dayT, setDayT] = useState(init.dayT);
  const [seconds, setSeconds] = useState(10);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const worker = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ days, hours, acts, promos, rooms, teachers, modules, unav, maxDays, maxG, maxT, dayG, dayT }));
    } catch {}
  }, [days, hours, acts, promos, rooms, teachers, modules, unav, maxDays, maxG, maxT, dayG, dayT]);
  useEffect(() => () => worker.current?.terminate(), []);

  function run() {
    if (!acts.length) return alert('Aucune séance : crée des modules d\'abord.');
    worker.current?.terminate();
    const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.current = w;
    setRunning(true); setResult(null); setProgress(null);
    w.onmessage = e => {
      const m = e.data;
      if (m.type === 'progress') setProgress(m);
      else { setResult({ ...m, data: { acts, days, hours, promos, rooms } }); setRunning(false); w.terminate(); }
    };
    w.postMessage({ acts, days, hours, promos, rooms, unav, maxDays, maxG, maxT, dayG, dayT, seconds });
  }

  return (
        <main>
      <h1>Organisation des salles et emplois du temps</h1>
      <p className="sub">Salles, promos, TD et TP. Placement par échanges récursifs avec liste tabou (principe de FET).</p>
      <RoomsPanel {...{ rooms, setRooms, promos, setPromos }} />
      <PromosPanel {...{ promos, setPromos, acts, setActs, modules, setModules, rooms }} />
      <DataPanel {...{ days, hours, setDays, setHours, acts, setActs, setPromos, setRooms, setTeachers, modules, setModules, setUnav, setMaxDays }} />
      <ModulesPanel {...{ modules, setModules, acts, setActs, promos, rooms, teachers }} />
      <TeachersPanel {...{ teachers, setTeachers, modules, setModules, acts, setActs }} />
      <ConstraintsPanel {...{ acts, promos, rooms, teachers, days, hours, unav, setUnav, maxDays, setMaxDays, maxG, setMaxG, maxT, setMaxT, dayG, setDayG, dayT, setDayT }} />
      <section>
        <h2>Génération</h2>
        <div className="row">
          <div style={{ flex: '0 0 160px' }}><label>Durée max (s)</label>
            <input type="number" min="1" value={seconds} onChange={e => setSeconds(+e.target.value)} /></div>
          <button className="p" disabled={running} onClick={run}>{running ? 'Calcul…' : 'Générer'}</button>
        </div>
        {progress && running && <p className="msg">Placées : {progress.placed} / {progress.n} — itérations : {progress.it}</p>}
      </section>
      <OccupancyPanel {...{ acts, promos, rooms, days, hours, result }} />
      {result && <TimetableView result={result} />}
    </main>
  );
}