import { useState } from 'react';

export default function TeachersPanel({ teachers, setTeachers, modules, setModules, acts, setActs }) {
  const [txt, setTxt] = useState('');

  function add() {
    const known = new Set(teachers.map(t => t.name));
    const names = [...new Set(txt.split(/[,\n;]/).map(x => x.trim()).filter(Boolean))].filter(n => !known.has(n));
    if (!names.length) return alert('Aucun nouveau nom.');
    setTeachers([...teachers, ...names.map(name => ({ name }))]);
    setTxt('');
  }
  function del(name) {
    setTeachers(teachers.filter(t => t.name !== name));
    setModules(modules.map(m => (m.teacher === name ? { ...m, teacher: '' } : m)));
    setActs(acts.map(a => (a.teacher === name ? { ...a, teacher: '' } : a)));
  }
  const nb = name => acts.filter(a => a.teacher === name).length;

  return (
    <section>
            <h2>Enseignants (optionnel : à renseigner plus tard)</h2>
      <div className="row">
        <div><label>Nom(s) : sépare plusieurs enseignants par des virgules</label>
          <input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} /></div>
        <button className="p" onClick={add}>Ajouter</button>
      </div>
      <p className="msg">{teachers.length} enseignant(s). Jours disponibles et nombre de jours travaillés : voir « Contraintes ».</p>
      {teachers.length > 0 && (
        <div className="sc">
          <table>
            <thead><tr><th>Enseignant</th><th>Séances / semaine</th><th /></tr></thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.name}>
                  <td dir="auto">{t.name}</td><td>{nb(t.name)}</td>
                  <td><button onClick={() => del(t.name)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}