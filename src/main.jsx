import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight, Plus, Users, CalendarDays, LayoutGrid, X, MoveRight } from 'lucide-react';
import './styles.css';

const rooms = Array.from({ length: 15 }, (_, i) => i + 1);
const remoteRows = ['GRAFICA REMOTO', 'SOUND REMOTO'];

const sampleShifts = [
  { id: 1, room: 1, day: 1, client: 'RAI', time: '08:00 - 16:00', title: 'VITA IN DIRETTA', work: 'EDIT', person: 'Marco', status: 'final', color: 'red' },
  { id: 2, room: 1, day: 1, client: 'RAI', time: '16:00 - 24:00', title: 'VITA IN DIRETTA', work: 'ASSISTENTE', person: 'Valentina', status: 'final', color: 'red' },
  { id: 3, room: 2, day: 1, client: 'CATTLEYA', time: '10:00 - 18:00', title: 'SERIE TV', work: 'EDIT', person: 'Barbara', status: 'provisional', color: 'amber' },
  { id: 4, room: 4, day: 2, client: 'RAI', time: '08:00 - 16:00', title: 'SPECIAL', work: 'COLOR', person: 'Alessandra', status: 'final', color: 'blue' },
  { id: 5, room: 7, day: 3, client: 'DVS', time: '12:00 - 20:00', title: 'DOCUMENTARIO', work: 'EDIT', person: 'Marco', status: 'final', color: 'violet' },
  { id: 6, room: 10, day: 4, client: 'RAI', time: '10:00 - 18:00', title: 'PRESADIRETTA', work: 'ASSISTENTE', person: 'Valentina', status: 'provisional', color: 'green' },
  { id: 7, room: 13, day: 5, client: 'CATTLEYA', time: '08:00 - 16:00', title: 'FILM', work: 'EDIT', person: 'Barbara', status: 'final', color: 'cyan' },
  { id: 8, remote: 'GRAFICA REMOTO', day: 2, client: 'RAI', time: '10:00 - 18:00', title: 'PROMO', work: 'GRAFICA', person: 'Luca', status: 'final', color: 'orange' },
  { id: 9, remote: 'SOUND REMOTO', day: 4, client: 'CATTLEYA', time: '12:00 - 20:00', title: 'SERIE TV', work: 'SOUND DESIGN', person: 'Giulia', status: 'final', color: 'pink' },
];

function monthLabel(date) {
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date).toUpperCase();
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function dayName(date, day) {
  const d = new Date(date.getFullYear(), date.getMonth(), day);
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(d).replace('.', '').toUpperCase();
}

function App() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1));
  const [shifts, setShifts] = useState(sampleShifts);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  const days = useMemo(() => Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1), [currentDate]);
  const shownDays = days.slice(0, 7);

  const totals = useMemo(() => {
    const map = {};
    shifts.filter(s => s.person && s.status === 'final').forEach(s => { map[s.person] = (map[s.person] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [shifts]);

  const moveMonth = delta => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));

  const handleDrop = (room, day, remote = null) => {
    if (!draggedId) return;
    setShifts(prev => prev.map(s => s.id === draggedId ? { ...s, room: remote ? undefined : room, remote: remote || undefined, day } : s));
    setDraggedId(null);
  };

  const createQuickShift = (room, day, remote = null) => {
    setSelected({ room, day, remote, client: 'RAI', time: '08:00 - 16:00', title: '', work: 'EDIT', person: '', status: 'provisional', color: 'red' });
    setModalOpen(true);
  };

  const saveShift = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newShift = {
      id: selected?.id || Date.now(),
      room: selected?.remote ? undefined : Number(fd.get('room')),
      remote: selected?.remote || undefined,
      day: Number(fd.get('day')),
      client: fd.get('client').trim() || 'DVS',
      time: `${fd.get('start')} - ${fd.get('end')}`,
      title: fd.get('title').trim() || 'NUOVO LAVORO',
      work: fd.get('work'),
      person: fd.get('person').trim(),
      status: fd.get('status'),
      color: fd.get('color')
    };
    setShifts(prev => selected?.id ? prev.map(s => s.id === selected.id ? newShift : s) : [...prev, newShift]);
    setModalOpen(false);
    setSelected(null);
  };

  const rows = [...rooms.map(room => ({ type: 'room', label: `SALA ${room}`, room })), ...remoteRows.map(remote => ({ type: 'remote', label: remote, remote }))];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">D</span><div><strong>DIGITAL VIDEO</strong><small>PLANNING</small></div></div>
        <nav>
          <button className="nav-item active"><LayoutGrid size={18}/> Planning</button>
          <button className="nav-item"><CalendarDays size={18}/> Turni mensili</button>
          <button className="nav-item"><Users size={18}/> Persone</button>
        </nav>
        <div className="sidebar-note">
          <span>Build 1.0</span>
          <small>Prototipo grafico con dati locali</small>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">PLANNING OPERATIVO</p>
            <h1>{monthLabel(currentDate)}</h1>
          </div>
          <div className="month-controls">
            <button onClick={() => moveMonth(-1)}><ChevronLeft size={19}/></button>
            <button className="today" onClick={() => setCurrentDate(new Date(2026, 6, 1))}>Oggi</button>
            <button onClick={() => moveMonth(1)}><ChevronRight size={19}/></button>
          </div>
          <div className="online-pill"><span></span> 4 utenti online</div>
          <button className="primary" onClick={() => createQuickShift(1, 1)}><Plus size={18}/> Nuovo turno</button>
        </header>

        <section className="legend-bar">
          <div><span className="legend-dot final"></span> Definitivo</div>
          <div><span className="legend-dot provisional"></span> Provvisorio</div>
          <div className="hint"><MoveRight size={15}/> Trascina una calamita per spostarla</div>
        </section>

        <div className="content-grid">
          <section className="planning-card">
            <div className="board-scroll">
              <div className="board" style={{ '--days': shownDays.length }}>
                <div className="corner-cell">SALE</div>
                {shownDays.map(day => <div className="day-head" key={day}><strong>{day}</strong><span>{dayName(currentDate, day)}</span></div>)}

                {rows.map((row, rowIndex) => (
                  <React.Fragment key={row.label}>
                    {(row.type === 'room' && [0,5,10].includes(rowIndex)) && (
                      <div className="group-label" style={{ gridColumn: `1 / span ${shownDays.length + 1}` }}>
                        {rowIndex === 0 ? 'CHINOTTO 1 · SALE 1–5' : rowIndex === 5 ? 'CHINOTTO 2 · SALE 6–10' : 'CARSO 3 · SALE 11–15'}
                      </div>
                    )}
                    {rowIndex === 15 && <div className="group-label remote-label" style={{ gridColumn: `1 / span ${shownDays.length + 1}` }}>LAVORAZIONI DA REMOTO</div>}
                    <div className={`room-label ${row.type === 'remote' ? 'remote' : ''}`}>{row.label}</div>
                    {shownDays.map(day => {
                      const cellShifts = shifts.filter(s => s.day === day && (row.type === 'room' ? s.room === row.room : s.remote === row.remote));
                      return (
                        <div className="board-cell" key={`${row.label}-${day}`} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(row.room, day, row.remote)} onDoubleClick={() => createQuickShift(row.room, day, row.remote)}>
                          {cellShifts.map(s => (
                            <article key={s.id} className={`shift-card ${s.color} ${s.status}`} draggable onDragStart={() => setDraggedId(s.id)} onClick={() => { setSelected(s); setModalOpen(true); }}>
                              <div className="shift-top"><span>{s.client}</span><span className="status-dot"></span></div>
                              <div className="shift-time">{s.time}</div>
                              <strong>{s.title}</strong>
                              <div className="shift-bottom"><b>{s.work}</b><span>{s.person || '—'}</span></div>
                            </article>
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          <aside className="summary-card">
            <div className="summary-title"><div><p className="eyebrow">RIEPILOGO</p><h2>Turni del mese</h2></div><Users size={22}/></div>
            <p className="summary-sub">Conteggio automatico dei turni definitivi assegnati.</p>
            <div className="people-list">
              {totals.map(([name, count]) => <div className="person-row" key={name}><div className="avatar">{name[0]}</div><span>{name}</span><strong>{count}</strong></div>)}
            </div>
            <div className="summary-footer"><small>Totale turni definitivi</small><strong>{totals.reduce((acc, [, c]) => acc + c, 0)}</strong></div>
          </aside>
        </div>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <form className="modal" onSubmit={saveShift}>
            <div className="modal-head"><div><p className="eyebrow">CALAMITA</p><h2>{selected?.id ? 'Modifica turno' : 'Nuovo turno'}</h2></div><button type="button" className="icon-btn" onClick={() => setModalOpen(false)}><X size={20}/></button></div>
            <div className="form-grid">
              <label>Produzione<input name="client" defaultValue={selected?.client || ''}/></label>
              <label>Giorno<input name="day" type="number" min="1" max="31" defaultValue={selected?.day || 1}/></label>
              {!selected?.remote && <label>Sala<select name="room" defaultValue={selected?.room || 1}>{rooms.map(r => <option key={r} value={r}>Sala {r}</option>)}</select></label>}
              <label>Stato<select name="status" defaultValue={selected?.status || 'provisional'}><option value="provisional">Provvisorio</option><option value="final">Definitivo</option></select></label>
              <label>Ora inizio<input name="start" type="time" defaultValue={selected?.time?.split(' - ')[0] || '08:00'}/></label>
              <label>Ora fine<input name="end" type="time" defaultValue={selected?.time?.split(' - ')[1] || '16:00'}/></label>
              <label className="full">Film / Programma<input name="title" defaultValue={selected?.title || ''}/></label>
              <label>Lavorazione<select name="work" defaultValue={selected?.work || 'EDIT'}>{['EDIT','ASSISTENTE','GRAFICA','COLOR','SOUND DESIGN'].map(w => <option key={w}>{w}</option>)}</select></label>
              <label>Persona<input name="person" defaultValue={selected?.person || ''} placeholder="Lascia vuoto se provvisorio"/></label>
              <label>Colore<select name="color" defaultValue={selected?.color || 'red'}>{['red','amber','blue','violet','green','cyan','orange','pink'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Annulla</button><button className="primary" type="submit">Salva turno</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
