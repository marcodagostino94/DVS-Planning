import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Users, Settings, PanelLeft, X, AlertTriangle } from 'lucide-react';
import './styles.css';

const rooms = Array.from({ length: 15 }, (_, i) => i + 1);
const remoteRows = ['GRAFICA REMOTO', 'SOUND REMOTO'];
const workTypes = ['EDIT', 'ASSISTENTE', 'GRAFICA', 'COLOR', 'SOUND DESIGN'];

const sampleShifts = [
  { id: 1, room: 1, day: 1, client: 'RAI', start: '08:00', end: '16:00', title: 'VITA IN DIRETTA', work: 'EDIT', person: 'Marco D.', status: 'final', color: 'red' },
  { id: 2, room: 1, day: 1, client: 'RAI', start: '16:00', end: '24:00', title: 'VITA IN DIRETTA', work: 'ASSISTENTE', person: 'Valentina', status: 'final', color: 'red' },
  { id: 3, room: 2, day: 1, client: 'CATTLEYA', start: '10:00', end: '18:00', title: 'SERIE TV', work: 'EDIT', person: '', status: 'provisional', color: 'white' },
  { id: 4, room: 4, day: 2, client: 'RAI', start: '08:00', end: '16:00', title: 'SPECIAL', work: 'COLOR', person: 'Alessandra', status: 'final', color: 'blue' },
  { id: 5, room: 7, day: 3, client: 'DVS', start: '12:00', end: '20:00', title: 'DOCUMENTARIO', work: 'EDIT', person: 'Marco D.', status: 'final', color: 'violet' },
  { id: 6, room: 10, day: 4, client: 'RAI', start: '10:00', end: '18:00', title: 'PRESADIRETTA', work: 'ASSISTENTE', person: '', status: 'provisional', color: 'white' },
  { id: 7, room: 13, day: 5, client: 'CATTLEYA', start: '08:00', end: '16:00', title: 'FILM', work: 'EDIT', person: 'Barbara', status: 'final', color: 'cyan' },
  { id: 8, remote: 'GRAFICA REMOTO', day: 2, client: 'RAI', start: '10:00', end: '18:00', title: 'PROMO', work: 'GRAFICA', person: 'Luca', status: 'final', color: 'orange' },
  { id: 9, remote: 'SOUND REMOTO', day: 4, client: 'CATTLEYA', start: '12:00', end: '20:00', title: 'SERIE TV', work: 'SOUND DESIGN', person: 'Giulia', status: 'final', color: 'pink' },
  { id: 10, room: 6, day: 8, client: 'RAI', start: '08:00', end: '16:00', title: 'VITA IN DIRETTA', work: 'EDIT', person: 'Marco D.', status: 'final', color: 'red' },
  { id: 11, room: 8, day: 8, client: 'CATTLEYA', start: '10:00', end: '18:00', title: 'NUOVA SERIE', work: 'EDIT', person: 'Marco D.', status: 'final', color: 'green' },
  { id: 12, room: 9, day: 9, client: 'RAI', start: '08:00', end: '16:00', title: 'REPORT', work: 'ASSISTENTE', person: 'Valentina', status: 'final', color: 'blue' },
  { id: 13, room: 3, day: 10, client: 'DVS', start: '10:00', end: '18:00', title: 'DOC', work: 'COLOR', person: 'Alessandra', status: 'final', color: 'violet' },
  { id: 14, room: 12, day: 11, client: 'CATTLEYA', start: '08:00', end: '16:00', title: 'FILM', work: 'EDIT', person: 'Barbara', status: 'final', color: 'cyan' },
];

function monthLabel(date) {
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date).toUpperCase();
}
function daysInMonth(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); }
function dayName(date, day) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
    .format(new Date(date.getFullYear(), date.getMonth(), day)).replace('.', '').toUpperCase();
}
function mins(value) {
  const [h, m] = value.split(':').map(Number);
  return (h === 24 ? 1440 : h * 60) + m;
}
function overlap(a, b) { return mins(a.start) < mins(b.end) && mins(b.start) < mins(a.end); }

function App() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1));
  const [shifts, setShifts] = useState(sampleShifts);
  const [selectedIds, setSelectedIds] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const [activeCell, setActiveCell] = useState(null);
  const [clipboard, setClipboard] = useState([]);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [toast, setToast] = useState('');
  const boardRef = useRef(null);

  const days = useMemo(() => Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1), [currentDate]);
  const columns = useMemo(() => {
    const list = [];
    days.forEach(day => {
      list.push({ type: 'day', day });
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      if (d.getDay() === 0 && day !== days.length) list.push({ type: 'week-divider', key: `w-${day}` });
    });
    return list;
  }, [days, currentDate]);

  const rows = [...rooms.map(room => ({ type: 'room', label: `SALA ${room}`, room })), ...remoteRows.map(remote => ({ type: 'remote', label: remote, remote }))];
  const gridTemplate = `72px ${columns.map(c => c.type === 'day' ? '104px' : '9px').join(' ')}`;

  const warningIds = useMemo(() => {
    const ids = new Set();
    shifts.forEach((a, i) => {
      if (!a.person) return;
      shifts.slice(i + 1).forEach(b => {
        if (a.day === b.day && a.person === b.person && overlap(a, b)) { ids.add(a.id); ids.add(b.id); }
      });
    });
    return ids;
  }, [shifts]);

  const notify = message => { setToast(message); window.clearTimeout(window.__dvsToast); window.__dvsToast = window.setTimeout(() => setToast(''), 2300); };
  const moveMonth = delta => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));

  const cellKey = (row, day) => `${row.type}:${row.room || row.remote}:${day}`;
  const shiftsForCell = (row, day) => shifts.filter(s => s.day === day && (row.type === 'room' ? s.room === row.room : s.remote === row.remote));

  const selectShift = (event, shift, row) => {
    event.stopPropagation();
    if (event.shiftKey && anchor && anchor.rowKey === (row.room || row.remote)) {
      const min = Math.min(anchor.day, shift.day), max = Math.max(anchor.day, shift.day);
      const ids = shifts.filter(s => s.day >= min && s.day <= max && (row.type === 'room' ? s.room === row.room : s.remote === row.remote)).map(s => s.id);
      setSelectedIds(ids);
    } else if (event.metaKey) {
      setSelectedIds(prev => prev.includes(shift.id) ? prev.filter(id => id !== shift.id) : [...prev, shift.id]);
      setAnchor({ rowKey: row.room || row.remote, day: shift.day });
    } else {
      setSelectedIds([shift.id]);
      setAnchor({ rowKey: row.room || row.remote, day: shift.day });
    }
    setActiveCell({ row, day: shift.day });
  };

  const roomConflict = candidate => shifts.some(s => s.id !== candidate.id && s.day === candidate.day && s.room === candidate.room && candidate.room && overlap(s, candidate));

  const moveShift = (id, row, day) => {
    const source = shifts.find(s => s.id === id);
    if (!source) return;
    const candidate = { ...source, day, room: row.type === 'room' ? row.room : undefined, remote: row.type === 'remote' ? row.remote : undefined };
    if (roomConflict(candidate)) { notify('Orari non compatibili'); return; }
    setShifts(prev => prev.map(s => s.id === id ? candidate : s));
    setSelectedIds([id]);
    notify('Turno spostato');
  };

  const pasteInto = cell => {
    if (!clipboard.length || !cell) return;
    const sourceMinDay = Math.min(...clipboard.map(s => s.day));
    const created = clipboard.map((s, index) => ({
      ...s,
      id: Date.now() + index,
      day: cell.day + (s.day - sourceMinDay),
      room: cell.row.type === 'room' ? cell.row.room : undefined,
      remote: cell.row.type === 'remote' ? cell.row.remote : undefined
    }));
    if (created.some(roomConflict)) { notify('Orari non compatibili'); return; }
    setShifts(prev => [...prev, ...created]);
    setSelectedIds(created.map(s => s.id));
    notify(created.length > 1 ? `${created.length} turni incollati` : 'Turno incollato');
  };

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && selectedIds.length) {
        e.preventDefault();
        setClipboard(shifts.filter(s => selectedIds.includes(s.id)).map(s => ({ ...s })));
        notify(selectedIds.length > 1 ? `${selectedIds.length} turni copiati` : 'Turno copiato');
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v' && activeCell) { e.preventDefault(); pasteInto(activeCell); }
      if (e.key === 'Escape') setSelectedIds([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, shifts, activeCell, clipboard]);

  const openNew = (row = { type: 'room', room: 1 }, day = 1) => {
    setEditing({ room: row.type === 'room' ? row.room : undefined, remote: row.type === 'remote' ? row.remote : undefined, day, client: 'RAI', start: '08:00', end: '16:00', title: '', work: 'EDIT', person: '', status: 'provisional', color: 'red' });
    setModalOpen(true);
  };
  const openEdit = shift => { setEditing(shift); setModalOpen(true); };

  const saveShift = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const candidate = {
      id: editing?.id || Date.now(), day: Number(fd.get('day')), room: Number(fd.get('room')),
      client: fd.get('client').trim() || 'DVS', start: fd.get('start'), end: fd.get('end'),
      title: fd.get('title').trim() || 'NUOVO LAVORO', work: fd.get('work'), person: fd.get('person').trim(),
      status: fd.get('status'), color: fd.get('status') === 'provisional' ? 'white' : fd.get('color')
    };
    if (mins(candidate.end) <= mins(candidate.start) || roomConflict(candidate)) { notify('Orari non compatibili'); return; }
    setShifts(prev => editing?.id ? prev.map(s => s.id === editing.id ? candidate : s) : [...prev, candidate]);
    setModalOpen(false); setSelectedIds([candidate.id]); notify(editing?.id ? 'Turno modificato' : 'Turno creato');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">D</div>
        <nav>
          <button className="nav-icon active" title="Planning"><PanelLeft size={20}/></button>
          <button className="nav-icon" title="Riepilogo turni"><CalendarDays size={20}/></button>
          <button className="nav-icon" title="Persone"><Users size={20}/></button>
          <button className="nav-icon bottom" title="Impostazioni"><Settings size={20}/></button>
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div className="title-block"><span>DVS PLANNING</span><strong>{monthLabel(currentDate)}</strong></div>
          <div className="month-controls">
            <button onClick={() => moveMonth(-1)}><ChevronLeft size={18}/></button>
            <button className="today" onClick={() => setCurrentDate(new Date(2026, 6, 1))}>Oggi</button>
            <button onClick={() => moveMonth(1)}><ChevronRight size={18}/></button>
          </div>
          <div className="online"><i></i> 4 online</div>
          <button className="primary" onClick={() => openNew()}><Plus size={17}/> Nuovo turno</button>
        </header>

        <section className="planning-stage">
          <div className="board-scroll" ref={boardRef}>
            <div className="board" style={{ gridTemplateColumns: gridTemplate }}>
              <div className="corner-cell">SALE</div>
              {columns.map(col => col.type === 'day'
                ? <div className="day-head" key={`h-${col.day}`}>{dayName(currentDate, col.day)} {String(col.day).padStart(2,'0')}</div>
                : <div className="week-divider head" key={col.key}></div>)}

              {rows.map((row, rowIndex) => (
                <React.Fragment key={row.label}>
                  {(row.type === 'room' && [0,5,10].includes(rowIndex)) && (
                    <div className="group-label" style={{ gridColumn: `1 / span ${columns.length + 1}` }}>
                      {rowIndex === 0 ? 'CHINOTTO 1' : rowIndex === 5 ? 'CHINOTTO 2' : 'CARSO 3'}
                    </div>
                  )}
                  {rowIndex === 15 && <div className="group-label remote-label" style={{ gridColumn: `1 / span ${columns.length + 1}` }}>REMOTO</div>}
                  <div className={`room-label ${row.type === 'remote' ? 'remote' : ''}`}>{row.label.replace('SALA ', '')}</div>
                  {columns.map(col => {
                    if (col.type === 'week-divider') return <div className="week-divider" key={`${row.label}-${col.key}`}></div>;
                    const cellShifts = shiftsForCell(row, col.day).sort((a,b) => mins(a.start)-mins(b.start));
                    const isActive = activeCell && cellKey(activeCell.row, activeCell.day) === cellKey(row, col.day);
                    return (
                      <div className={`board-cell ${isActive ? 'active-cell' : ''}`} key={`${row.label}-${col.day}`}
                        onClick={() => { setActiveCell({ row, day: col.day }); setSelectedIds([]); }}
                        onDoubleClick={() => openNew(row, col.day)}
                        onContextMenu={e => { e.preventDefault(); setActiveCell({ row, day: col.day }); if (clipboard.length) pasteInto({ row, day: col.day }); }}
                        onDragOver={e => e.preventDefault()} onDrop={() => { if (draggedId) moveShift(draggedId, row, col.day); setDraggedId(null); }}>
                        {cellShifts.map(s => (
                          <article key={s.id} className={`shift-card ${s.color} ${s.status} ${selectedIds.includes(s.id) ? 'selected' : ''}`}
                            draggable onDragStart={() => setDraggedId(s.id)}
                            onClick={e => selectShift(e, s, row)} onDoubleClick={e => { e.stopPropagation(); openEdit(s); }}>
                            <div className="shift-body">
                              <div className="shift-client">{s.client}</div>
                              <div className="shift-time">{s.start} - {s.end}</div>
                              <strong>{s.title}</strong>
                              <b>{s.work}</b>
                            </div>
                            <div className="person-band"><span>{s.person || '—'}</span>{warningIds.has(s.id) && <AlertTriangle size={13}/>}</div>
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
      </main>

      {toast && <div className="toast">{toast}</div>}

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <form className="modal" onSubmit={saveShift}>
            <div className="modal-head"><div><small>FINESTRA PROVVISORIA</small><h2>{editing?.id ? 'Modifica turno' : 'Nuovo turno'}</h2></div><button type="button" className="icon-btn" onClick={() => setModalOpen(false)}><X size={19}/></button></div>
            <div className="form-grid">
              <label>Produzione<input name="client" defaultValue={editing?.client || ''}/></label>
              <label>Giorno<input name="day" type="number" min="1" max={days.length} defaultValue={editing?.day || 1}/></label>
              <label>Sala<select name="room" defaultValue={editing?.room || 1}>{rooms.map(r => <option key={r} value={r}>Sala {r}</option>)}</select></label>
              <label>Stato<select name="status" defaultValue={editing?.status || 'provisional'}><option value="provisional">Provvisorio</option><option value="final">Definitivo</option></select></label>
              <label>Dalle<input name="start" type="time" defaultValue={editing?.start || '08:00'}/></label>
              <label>Alle<input name="end" type="time" defaultValue={editing?.end || '16:00'}/></label>
              <label className="full">Film / Programma<input name="title" defaultValue={editing?.title || ''}/></label>
              <label>Lavorazione<select name="work" defaultValue={editing?.work || 'EDIT'}>{workTypes.map(w => <option key={w}>{w}</option>)}</select></label>
              <label>Montatore<input name="person" defaultValue={editing?.person || ''}/></label>
              <label>Colore<select name="color" defaultValue={editing?.color === 'white' ? 'red' : editing?.color || 'red'}>{['red','blue','violet','green','cyan','orange','pink'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Annulla</button><button className="primary" type="submit">Salva</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
