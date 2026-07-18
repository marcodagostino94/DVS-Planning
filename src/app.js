
const ROOMS = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `sala-${index + 1}`,
    label: `Sala ${index + 1}`,
    sortOrder: index + 1
  })),
  { id: "remoto-1", label: "Remote 1", sortOrder: 16 },
  { id: "remoto-2", label: "Remote 2", sortOrder: 17 },
  { id: "remoto-3", label: "Remote 3", sortOrder: 18 }
];

const GROUPS = {
  0: "CHINOTTO 1 · Sale 1–5",
  5: "CHINOTTO 2 · Sale 6–10",
  10: "CARSO 3 · Sale 11–15",
  15: "LAVORAZIONI DA REMOTO"
};

const FILM_COLORS = {
  amber:  { label: "Ambra", rgb: "225, 166, 34" },
  blue:   { label: "Blu", rgb: "61, 125, 235" },
  green:  { label: "Verde", rgb: "54, 165, 91" },
  violet: { label: "Viola", rgb: "135, 79, 225" },
  cyan:   { label: "Azzurro", rgb: "35, 167, 192" },
  orange: { label: "Arancione", rgb: "235, 126, 39" },
  pink:   { label: "Rosa", rgb: "226, 74, 151" },
  red:    { label: "Rosso", rgb: "218, 56, 70" },
  lime:   { label: "Lime", rgb: "111, 174, 57" },
  indigo: { label: "Indaco", rgb: "78, 84, 203" },
  teal:   { label: "Petrolio", rgb: "28, 145, 134" },
  coral:  { label: "Corallo", rgb: "224, 102, 84" }
};

const ITALIAN_FIXED_HOLIDAYS = new Set([
  "01-01", "01-06", "04-25", "05-01", "06-02",
  "08-15", "11-01", "12-08", "12-25", "12-26"
]);

const SHIFT_STORAGE = "dvs-planning-build-10-shifts";
const EDITOR_STORAGE = "dvs-planning-build-9-staff";
const ZOOM_STORAGE = "dvs-planning-build-11-zoom";
const PROFILE_STORAGE = "dvs-planning-build-11-profile";
const REMEMBER_PROFILE_STORAGE = "dvs-planning-build-11-remember";
const REMINDER_STORAGE = "dvs-planning-build-12-reminders";
const DEFAULT_PROFILES = [
  { id: "alessio-iuso", name: "Alessio Iuso", initials: "AI", tone: "red" },
  { id: "nicola-iuso", name: "Nicola Iuso", initials: "NI", tone: "blue" },
  { id: "sara-dal-pont", name: "Sara Dal Pont", initials: "SD", tone: "purple" },
  { id: "marco-dagostino", name: "Marco D'Agostino", initials: "MD", tone: "orange" }
];

const hasSupabaseConfig = Boolean(
  window.DVS_SUPABASE?.url &&
  window.DVS_SUPABASE?.publishableKey &&
  window.supabase?.createClient
);

const db = hasSupabaseConfig
  ? window.supabase.createClient(
      window.DVS_SUPABASE.url,
      window.DVS_SUPABASE.publishableKey
    )
  : null;

let currentMonth = new Date(2026, 6, 1);
let editingShiftId = null;
let editingEditorId = null;
let selectedShiftIds = new Set();
let selectionAnchorId = null;
let selectedCell = null;
let draggedShiftId = null;
let copiedShifts = [];
let clipboardMode = "copy";
let cutShiftIds = new Set();
let marqueeState = null;
let marqueeElement = null;
let contextTargetCell = null;
let dragSourceShiftId = null;
let dragGhost = null;
let activeDragGroup = [];
let activeDragSource = null;
let suppressNextClick = false;
let emptyCellClickTimer = null;
let highlightedDropCells = new Set();
let planningZoom = Number(localStorage.getItem(ZOOM_STORAGE)) || 1;
let activeProfile = null;
let reminders = loadLocal(REMINDER_STORAGE, []);

const seedEditors = [
  { id:"ed-1", firstName:"Marco", lastName:"D'Agostino", active:true },
  { id:"ed-2", firstName:"Valentina", lastName:"Rossi", active:true },
  { id:"ed-3", firstName:"Alessandra", lastName:"Marimpietri", active:true },
  { id:"ed-4", firstName:"Barbara", lastName:"Cupertino", active:true },
  { id:"ed-5", firstName:"Luca", lastName:"Mancini", active:true },
  { id:"ed-6", firstName:"Davide", lastName:"Gentili", active:true },
  { id:"ed-7", firstName:"Giulia", lastName:"Corsi", active:true },
  { id:"ed-8", firstName:"Lorenzo", lastName:"Conti", active:true }
];

const seedShifts = [
  { id:"1", room:"sala-1", date:"2026-07-01", production:"RAI", film:"VITA IN DIRETTA", start:"08:00", end:"16:00", workType:"EDIT", editorId:"ed-1", status:"definitivo", color:"amber" },
  { id:"2", room:"sala-1", date:"2026-07-02", production:"RAI", film:"VITA IN DIRETTA", start:"08:00", end:"16:00", workType:"EDIT", editorId:"ed-2", status:"definitivo", color:"amber" },
  { id:"3", room:"sala-2", date:"2026-07-01", production:"CATTLEYA", film:"DOC - NELLE TUE MANI 4", start:"10:00", end:"18:00", workType:"EDIT", editorId:null, status:"provvisorio", color:"violet" },
  { id:"4", room:"sala-3", date:"2026-07-01", production:"NETFLIX", film:"LUPIN - STAGIONE 4", start:"09:00", end:"17:00", workType:"EDIT", editorId:"ed-5", status:"definitivo", color:"green" },
  { id:"5", room:"sala-3", date:"2026-07-01", production:"NETFLIX", film:"LUPIN - STAGIONE 4", start:"17:00", end:"24:00", workType:"ASSISTENTE", editorId:"ed-4", status:"definitivo", color:"green" },
  { id:"6", room:"sala-4", date:"2026-07-03", production:"FREMANTLE", film:"ITALIA'S GOT TALENT", start:"08:30", end:"16:30", workType:"EDIT", editorId:"ed-6", status:"definitivo", color:"red" },
  { id:"7", room:"sala-5", date:"2026-07-04", production:"BANIJAY", film:"PECHINO EXPRESS", start:"09:30", end:"17:30", workType:"EDIT", editorId:"ed-7", status:"definitivo", color:"cyan" },
  { id:"8", room:"sala-6", date:"2026-07-06", production:"DISCOVERY", film:"SURVIVOR ITALIA", start:"10:00", end:"18:00", workType:"EDIT", editorId:"ed-1", status:"definitivo", color:"orange" },
  { id:"9", room:"sala-7", date:"2026-07-07", production:"RAI", film:"UNOMATTINA", start:"08:00", end:"16:00", workType:"EDIT", editorId:"ed-4", status:"definitivo", color:"pink" },
  { id:"10", room:"sala-8", date:"2026-07-08", production:"CATTLEYA", film:"GOMORRA - STAGIONE 6", start:"09:00", end:"17:00", workType:"COLOR", editorId:"ed-3", status:"definitivo", color:"violet" },
  { id:"11", room:"sala-9", date:"2026-07-09", production:"AMAZON PRIME", film:"CELEBRITY HUNTED", start:"10:00", end:"18:00", workType:"COLOR", editorId:"ed-2", status:"definitivo", color:"lime" },
  { id:"12", room:"sala-10", date:"2026-07-10", production:"DVS", film:"SPOT ISTITUZIONALE", start:"08:00", end:"17:00", workType:"SOUND", editorId:"ed-8", status:"definitivo", color:"blue" },
  { id:"13", room:"remoto-1", date:"2026-07-02", production:"RAI", film:"VITA IN DIRETTA", start:"09:00", end:"17:00", workType:"GRAFICA", editorId:"ed-7", status:"definitivo", color:"coral" }
];

let editors = loadLocal(EDITOR_STORAGE, []);
// Build 8.0.1: elimina automaticamente i soli nominativi dimostrativi della vecchia interfaccia.
const prototypeStaffIds = new Set(seedEditors.map(item => item.id));
editors = editors.filter(item => !prototypeStaffIds.has(item.id));
let shifts = loadLocal(SHIFT_STORAGE, seedShifts).map(shift => ({
  ...shift,
  isClient: Boolean(shift.isClient),
  isDoubleStation: Boolean(shift.isDoubleStation),
  confirmed: Boolean(shift.confirmed)
}));

const planningGrid = document.getElementById("planningGrid");
const planningCanvas = document.getElementById("planningCanvas");
const planningScroller = document.getElementById("planningScroller");
const monthLabel = document.getElementById("monthLabel");
const zoomSelect = document.getElementById("zoomSelect");
const profileGate = document.getElementById("profileGate");
const profileGrid = document.getElementById("profileGrid");
const rememberProfile = document.getElementById("rememberProfile");
const activeProfileLabel = document.getElementById("activeProfileLabel");
const shiftDialog = document.getElementById("shiftDialog");
const editorDialog = document.getElementById("editorDialog");
const shiftForm = document.getElementById("shiftForm");
const editorForm = document.getElementById("editorForm");
const toast = document.getElementById("toast");
const contextMenu = document.getElementById("contextMenu");
const selectionBadge = document.getElementById("selectionBadge");

function renderProfiles() {
  profileGrid.innerHTML = DEFAULT_PROFILES.map(profile => `
    <button class="profile-card profile-${profile.tone}" type="button" data-profile-id="${profile.id}">
      <span class="profile-avatar"><span class="profile-head"></span><span class="profile-body"></span></span>
      <strong>${escapeHtml(profile.name)}</strong>
    </button>
  `).join("");
  profileGrid.querySelectorAll(".profile-card").forEach(card => {
    card.addEventListener("click", () => selectProfile(card.dataset.profileId));
  });
}

function updateActiveProfileUI() {
  activeProfileLabel.textContent = activeProfile ? `Profilo: ${activeProfile.name}` : "";
}

function selectProfile(profileId) {
  activeProfile = DEFAULT_PROFILES.find(profile => profile.id === profileId) || null;
  if (!activeProfile) return;
  if (rememberProfile.checked) {
    localStorage.setItem(PROFILE_STORAGE, activeProfile.id);
    localStorage.setItem(REMEMBER_PROFILE_STORAGE, "true");
  } else {
    localStorage.removeItem(PROFILE_STORAGE);
    localStorage.removeItem(REMEMBER_PROFILE_STORAGE);
  }
  updateActiveProfileUI();
  profileGate.classList.add("hidden");
}

function initializeProfileGate() {
  renderProfiles();
  const remembered = localStorage.getItem(REMEMBER_PROFILE_STORAGE) === "true";
  const rememberedId = localStorage.getItem(PROFILE_STORAGE);
  rememberProfile.checked = remembered;
  if (remembered && rememberedId) {
    activeProfile = DEFAULT_PROFILES.find(profile => profile.id === rememberedId) || null;
    if (activeProfile) profileGate.classList.add("hidden");
  }
  updateActiveProfileUI();
}

function logoutProfile() {
  activeProfile = null;
  localStorage.removeItem(PROFILE_STORAGE);
  localStorage.removeItem(REMEMBER_PROFILE_STORAGE);
  rememberProfile.checked = false;
  updateActiveProfileUI();
  profileGate.classList.remove("hidden");
}

function loadLocal(key, fallback) {
  const saved = localStorage.getItem(key);
  if (!saved) return structuredClone(fallback);
  try { return JSON.parse(saved); }
  catch { return structuredClone(fallback); }
}

function saveLocal() {
  localStorage.setItem(SHIFT_STORAGE, JSON.stringify(shifts));
  localStorage.setItem(EDITOR_STORAGE, JSON.stringify(editors));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function monthName(date) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function startOfPlanningMonth(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  return addDays(first, -mondayOffset);
}

function endOfPlanningMonth(monthDate) {
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const sundayOffset = (7 - last.getDay()) % 7;
  return addDays(last, sundayOffset);
}

function planningDates(monthDate) {
  const dates = [];
  const start = startOfPlanningMonth(monthDate);
  const end = endOfPlanningMonth(monthDate);
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) dates.push(new Date(date));
  return dates;
}

function isoFromDate(date) {
  return isoDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeTime(value) {
  const trimmed = value.trim();
  if (trimmed === "24" || trimmed === "24:0" || trimmed === "24:00") return "24:00";
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  if (value === "24:00") return 1440;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(a, b) {
  return timeToMinutes(a.start) < timeToMinutes(b.end)
    && timeToMinutes(b.start) < timeToMinutes(a.end);
}

function roomConflict(candidate, excludeId = null) {
  return shifts.some(shift =>
    shift.id !== excludeId
    && shift.room === candidate.room
    && shift.date === candidate.date
    && overlaps(shift, candidate)
  );
}

function getEditor(id) {
  return editors.find(editor => editor.id === id) || null;
}

function editorDisplay(editor) {
  if (!editor) return "";
  const initial = editor.firstName.trim().charAt(0).toUpperCase();
  return `${initial}. ${editor.lastName.trim().toUpperCase()}`;
}

function fullEmployeeName(editor) {
  return `${editor.firstName || ""} ${editor.lastName || ""}`.trim();
}

function editorConflict(shift) {
  if (!shift.editorId) return false;
  return shifts.some(other =>
    other.id !== shift.id
    && other.date === shift.date
    && other.editorId === shift.editorId
    && overlaps(other, shift)
  );
}

function selectedShiftList() {
  return shifts.filter(shift => selectedShiftIds.has(shift.id));
}

function selectOnlyShift(id) {
  selectedShiftIds = new Set([id]);
  selectionAnchorId = id;
  selectedCell = null;
}

function selectShiftRange(anchorId, targetId) {
  const anchorShift = shifts.find(shift => shift.id === anchorId);
  const targetShift = shifts.find(shift => shift.id === targetId);

  if (!anchorShift || !targetShift || anchorShift.room !== targetShift.room) {
    selectOnlyShift(targetId);
    return;
  }

  const sameRoom = shifts
    .filter(shift => shift.room === anchorShift.room)
    .sort((a, b) =>
      a.date.localeCompare(b.date)
      || a.start.localeCompare(b.start)
      || a.id.localeCompare(b.id)
    );

  const anchorIndex = sameRoom.findIndex(shift => shift.id === anchorId);
  const targetIndex = sameRoom.findIndex(shift => shift.id === targetId);

  if (anchorIndex < 0 || targetIndex < 0) {
    selectOnlyShift(targetId);
    return;
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);

  selectedShiftIds = new Set(
    sameRoom.slice(start, end + 1).map(shift => shift.id)
  );
  selectedCell = null;
}

function clearSelection() {
  selectedShiftIds.clear();
  selectionAnchorId = null;
  selectedCell = null;
}

function clearCutState() {
  cutShiftIds.clear();
  document.querySelectorAll('.shift-card.cut-pending').forEach(card => card.classList.remove('cut-pending'));
}

function copySelectedShifts() {
  const selected = selectedShiftList()
    .sort((a, b) =>
      a.date.localeCompare(b.date)
      || a.start.localeCompare(b.start)
    );

  if (!selected.length) return false;

  clipboardMode = "copy";
  clearCutState();
  copiedShifts = selected.map(shift => ({ ...shift }));
  renderPlanning();
  showToast(selected.length === 1 ? "Turno copiato" : `${selected.length} turni copiati`);
  return true;
}

function cutSelectedShifts() {
  const selected = selectedShiftList()
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  if (!selected.length) return false;
  if (selected.some(shift => shift.confirmed)) { showToast("Il turno confermato è bloccato"); return false; }

  clipboardMode = "cut";
  copiedShifts = selected.map(shift => ({ ...shift }));
  cutShiftIds = new Set(selected.map(shift => shift.id));
  renderPlanning();
  showToast(selected.length === 1 ? "Turno tagliato" : `${selected.length} turni tagliati`);
  return true;
}

function pasteCopiedShifts() {
  if (!copiedShifts.length || !selectedCell) return false;

  const sourceBase = new Date(`${copiedShifts[0].date}T12:00:00`);
  const targetBase = new Date(`${selectedCell.date}T12:00:00`);
  const offsetDays = Math.round((targetBase - sourceBase) / 86400000);
  const isCut = clipboardMode === "cut";
  const movingIds = isCut ? new Set(copiedShifts.map(shift => shift.id)) : new Set();

  const candidates = copiedShifts.map(source => {
    const sourceDate = new Date(`${source.date}T12:00:00`);
    sourceDate.setDate(sourceDate.getDate() + offsetDays);
    return {
      ...source,
      id: isCut ? source.id : crypto.randomUUID(),
      confirmed: isCut ? Boolean(source.confirmed) : false,
      confirmedAt: null,
      room: selectedCell.room,
      date: isoDate(sourceDate.getFullYear(), sourceDate.getMonth(), sourceDate.getDate())
    };
  });

  const hasInternalConflict = candidates.some((candidate, index) =>
    candidates.some((other, otherIndex) => index !== otherIndex
      && candidate.room === other.room && candidate.date === other.date && overlaps(candidate, other))
  );
  const hasExistingConflict = candidates.some(candidate =>
    shifts.some(existing => !movingIds.has(existing.id)
      && existing.room === candidate.room && existing.date === candidate.date && overlaps(existing, candidate))
  );

  if (hasInternalConflict || hasExistingConflict) {
    showToast("Orari non compatibili: operazione annullata");
    return true;
  }

  if (isCut) {
    const movedById = new Map(candidates.map(candidate => [candidate.id, candidate]));
    shifts = shifts.map(shift => movedById.get(shift.id) || shift);
    candidates.forEach(syncShiftToSupabase);
    copiedShifts = [];
    clipboardMode = "copy";
    clearCutState();
  } else {
    shifts.push(...candidates);
    candidates.forEach(syncShiftToSupabase);
  }

  saveLocal();
  selectedShiftIds = new Set(candidates.map(candidate => candidate.id));
  selectionAnchorId = candidates[0]?.id || null;
  selectedCell = null;
  renderPlanning();
  showToast(candidates.length === 1 ? (isCut ? "Turno spostato" : "Turno incollato") : `${candidates.length} turni ${isCut ? "spostati" : "incollati"}`);
  return true;
}


function selectionRoom() {
  const selected = selectedShiftList();
  return selected.length ? selected[0].room : null;
}

function updateSelectionBadge() {
  const count = selectedShiftIds.size;
  selectionBadge.textContent = count > 1 ? `${count} turni selezionati` : "";
  selectionBadge.classList.toggle("hidden", count <= 1);
}

function toggleCommandSelection(id) {
  const target = shifts.find(shift => shift.id === id);
  if (!target) return;
  const room = selectionRoom();
  if (room && room !== target.room) {
    selectOnlyShift(id);
    return;
  }
  if (selectedShiftIds.has(id)) {
    selectedShiftIds.delete(id);
    if (selectionAnchorId === id) selectionAnchorId = [...selectedShiftIds][0] || null;
  } else {
    selectedShiftIds.add(id);
    if (!selectionAnchorId) selectionAnchorId = id;
  }
  selectedCell = null;
}

function hideContextMenu() {
  contextMenu.classList.add("hidden");
  contextTargetCell = null;
}

function showContextMenu(event, targetCell) {
  event.preventDefault();
  event.stopPropagation();
  contextTargetCell = targetCell || null;
  const selected = selectedShiftList();
  const hasConfirmed = selected.some(shift => shift.confirmed);
  const hasUnconfirmed = selected.some(shift => !shift.confirmed);
  const exactlyOne = selected.length === 1;
  contextMenu.querySelector('[data-action="edit"]').disabled = !exactlyOne || hasConfirmed;
  contextMenu.querySelector('[data-action="confirm"]').hidden = !hasUnconfirmed;
  contextMenu.querySelector('[data-action="confirm"]').disabled = !hasUnconfirmed;
  contextMenu.querySelector('[data-action="unconfirm"]').hidden = !hasConfirmed;
  contextMenu.querySelector('[data-action="unconfirm"]').disabled = !hasConfirmed;
  contextMenu.querySelector('[data-action="copy"]').disabled = !selected.length;
  contextMenu.querySelector('[data-action="cut"]').disabled = !selected.length || hasConfirmed;
  contextMenu.querySelector('[data-action="paste"]').disabled = !copiedShifts.length || !targetCell;
  contextMenu.querySelector('[data-action="make-definitive"]').disabled = hasConfirmed || !selected.some(s => s.status === "provvisorio");
  contextMenu.querySelector('[data-action="make-provisional"]').disabled = hasConfirmed || !selected.some(s => s.status === "definitivo");
  contextMenu.querySelector('[data-action="delete"]').disabled = !selected.length || hasConfirmed;
  contextMenu.classList.remove("hidden");
  const width = 210;
  const height = contextMenu.offsetHeight || 250;
  contextMenu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth-width-8))}px`;
  contextMenu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight-height-8))}px`;
}

function deleteSelectedShifts() {
  const selected = selectedShiftList();
  if (selected.some(shift => shift.confirmed)) return showToast("Il turno confermato è bloccato");
  if (!selected.length) return;
  if (!confirm(selected.length === 1 ? "Eliminare questo turno?" : `Eliminare ${selected.length} turni?`)) return;
  const ids = new Set(selected.map(s=>s.id));
  shifts = shifts.filter(s=>!ids.has(s.id));
  selected.forEach(s=>deleteShiftFromSupabase(s.id));
  saveLocal(); clearSelection(); renderPlanning();
}

function setSelectedStatus(status) {
  const selected = selectedShiftList();
  if (selected.some(shift => shift.confirmed)) return showToast("Il turno confermato è bloccato");
  selected.forEach(s=>{ s.status=status; syncShiftToSupabase(s); });
  saveLocal(); renderPlanning();
  showToast(selected.length === 1 ? `Turno reso ${status}` : `${selected.length} turni aggiornati`);
}

function selectedGroupForDrag(sourceId) {
  const source = shifts.find(shift => shift.id === sourceId);
  if (!source || source.confirmed) {
    if (source?.confirmed) showToast("Il turno confermato è bloccato");
    return [];
  }

  if (!selectedShiftIds.has(sourceId)) {
    selectOnlyShift(sourceId);
  }

  return selectedShiftList()
    .filter(shift => shift.room === source.room && !shift.confirmed)
    .map(shift => ({ ...shift }))
    .sort((a, b) =>
      a.date.localeCompare(b.date)
      || a.start.localeCompare(b.start)
      || a.id.localeCompare(b.id)
    );
}

async function setShiftConfirmed(shift, confirmed) {
  if (!shift) return;
  shift.confirmed = confirmed;
  shift.confirmedAt = confirmed ? new Date().toISOString() : null;
  saveLocal();
  await syncShiftToSupabase(shift);
  renderPlanning();
  showToast(confirmed ? "Turno confermato e bloccato" : "Conferma annullata");
}

async function confirmSelectedShift() {
  const selected = selectedShiftList().filter(shift => !shift.confirmed);
  if (!selected.length) return;

  const confirmedAt = new Date().toISOString();
  selected.forEach(shift => {
    shift.confirmed = true;
    shift.confirmedAt = confirmedAt;
  });

  saveLocal();
  await Promise.all(selected.map(shift => syncShiftToSupabase(shift)));
  renderPlanning();
  showToast(selected.length === 1
    ? "Turno confermato e bloccato"
    : `${selected.length} turni confermati e bloccati`);
}

async function unconfirmSelectedShift() {
  const selected = selectedShiftList().filter(shift => shift.confirmed);
  if (!selected.length) return;
  const message = selected.length === 1
    ? "Vuoi annullare la conferma del turno?"
    : `Vuoi annullare la conferma di ${selected.length} turni?`;
  if (!confirm(message)) return;

  selected.forEach(shift => {
    shift.confirmed = false;
    shift.confirmedAt = null;
  });

  saveLocal();
  await Promise.all(selected.map(shift => syncShiftToSupabase(shift)));
  renderPlanning();
  showToast(selected.length === 1
    ? "Conferma annullata"
    : `Conferma annullata per ${selected.length} turni`);
}

function captureDragGroup(sourceId) {
  activeDragGroup = selectedGroupForDrag(sourceId);
  activeDragSource = activeDragGroup.find(shift => shift.id === sourceId) || null;
  return activeDragGroup;
}

function buildMovedGroup(targetRoom, targetDate) {
  if (!activeDragSource || !activeDragGroup.length) return [];

  const sourceDate = new Date(`${activeDragSource.date}T12:00:00`);
  const destinationDate = new Date(`${targetDate}T12:00:00`);
  const offsetDays = Math.round((destinationDate - sourceDate) / 86400000);

  return activeDragGroup.map(original => {
    const movedDate = new Date(`${original.date}T12:00:00`);
    movedDate.setDate(movedDate.getDate() + offsetDays);

    return {
      ...original,
      room: targetRoom,
      date: isoDate(
        movedDate.getFullYear(),
        movedDate.getMonth(),
        movedDate.getDate()
      )
    };
  });
}

function groupHasConflict(candidates) {
  const movingIds = new Set(activeDragGroup.map(shift => shift.id));

  for (let first = 0; first < candidates.length; first += 1) {
    for (let second = first + 1; second < candidates.length; second += 1) {
      const a = candidates[first];
      const b = candidates[second];
      if (
        a.room === b.room
        && a.date === b.date
        && overlaps(a, b)
      ) return true;
    }
  }

  return candidates.some(candidate =>
    shifts.some(existing =>
      !movingIds.has(existing.id)
      && existing.room === candidate.room
      && existing.date === candidate.date
      && overlaps(existing, candidate)
    )
  );
}

function clearActiveDrag() {
  activeDragGroup = [];
  activeDragSource = null;
}

function startMarquee(event, cell) {
  if (event.button !== 0 || event.target.closest('.shift-card')) return;
  const row = cell.getBoundingClientRect();
  marqueeState = {
    room: cell.dataset.room,
    startX: event.clientX,
    currentX: event.clientX,
    rowTop: row.top,
    rowBottom: row.bottom,
    additive: event.metaKey || event.ctrlKey,
    active: false
  };
}

function updateMarquee(event) {
  if (!marqueeState) return;
  marqueeState.currentX = event.clientX;
  if (!marqueeState.active && Math.abs(marqueeState.currentX - marqueeState.startX) < 5) return;

  if (!marqueeState.active) {
    marqueeState.active = true;
    if (!marqueeState.additive) { selectedShiftIds.clear(); selectionAnchorId = null; }
    selectedCell = null;
    marqueeElement = document.createElement('div');
    marqueeElement.className = 'selection-marquee';
    document.body.appendChild(marqueeElement);
  }

  const left = Math.min(marqueeState.startX, marqueeState.currentX);
  const right = Math.max(marqueeState.startX, marqueeState.currentX);
  const top = marqueeState.rowTop + 2;
  const bottom = marqueeState.rowBottom - 2;
  Object.assign(marqueeElement.style, {left:`${left}px`, top:`${top}px`, width:`${Math.max(1,right-left)}px`, height:`${Math.max(1,bottom-top)}px`});
  document.querySelectorAll(`.planning-cell[data-room="${marqueeState.room}"] .shift-card`).forEach(card => {
    const r = card.getBoundingClientRect();
    if (!(r.right < left || r.left > right || r.bottom < top || r.top > bottom)) selectedShiftIds.add(card.dataset.shiftId);
  });
  if (!selectionAnchorId) selectionAnchorId = [...selectedShiftIds][0] || null;
  document.querySelectorAll('.shift-card').forEach(card => card.classList.toggle('selected', selectedShiftIds.has(card.dataset.shiftId)));
  updateSelectionBadge();
}

function finishMarquee() {
  if (!marqueeState) return;
  const wasActive = marqueeState.active;
  marqueeElement?.remove();
  marqueeElement = null;
  marqueeState = null;
  if (wasActive) renderPlanning();
}

function createDragGhost(group) {
  dragGhost?.remove();
  dragGhost = document.createElement('div');
  dragGhost.className = 'drag-group-ghost';
  group.forEach((shift, index) => {
    const sourceCard = document.querySelector(`.shift-card[data-shift-id="${shift.id}"]`);
    const preview = sourceCard ? sourceCard.cloneNode(true) : document.createElement('div');
    preview.classList.remove('selected', 'dragging', 'cut-pending');
    preview.classList.add('drag-ghost-card');
    preview.removeAttribute('draggable');
    preview.style.transform = `translate(${index * 5}px, ${index * 5}px)`;
    dragGhost.appendChild(preview);
  });
  document.body.appendChild(dragGhost);
}

function moveDragGhost(event) {
  if (dragGhost) {
    dragGhost.style.left = `${event.clientX + 14}px`;
    dragGhost.style.top = `${event.clientY + 14}px`;
  }
}

function clearDropHighlights() {
  highlightedDropCells.clear();
  document.querySelectorAll('.group-drop-target, .group-drop-invalid').forEach(cell => cell.classList.remove('group-drop-target', 'group-drop-invalid'));
}

function highlightGroupDestination(targetRoom, targetDate) {
  clearDropHighlights();
  const candidates = buildMovedGroup(targetRoom, targetDate);
  const invalid = candidates.length === 0 || groupHasConflict(candidates);
  candidates.forEach(candidate => {
    const key = `${candidate.room}|${candidate.date}`;
    highlightedDropCells.add(key);
    const cell = document.querySelector(`.planning-cell[data-room="${candidate.room}"][data-date="${candidate.date}"]`);
    cell?.classList.add(invalid ? 'group-drop-invalid' : 'group-drop-target');
  });
  return !invalid;
}

function removeDragGhost() {
  dragGhost?.remove();
  dragGhost = null;
  clearDropHighlights();
}


function isHoliday(date) {
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return ITALIAN_FIXED_HOLIDAYS.has(key);
}

function fitText(element, minSize) {
  const original = Number(getComputedStyle(element).fontSize.replace("px", ""));
  let size = original;
  element.style.fontSize = `${size}px`;

  while (element.scrollWidth > element.clientWidth && size > minSize) {
    size -= .35;
    element.style.fontSize = `${size}px`;
  }
}

function fitAllCardText() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".shift-production").forEach(el => fitText(el, 5.5));
    document.querySelectorAll(".shift-time").forEach(el => fitText(el, 6));
    document.querySelectorAll(".shift-film").forEach(el => fitText(el, 6));
    document.querySelectorAll(".shift-type").forEach(el => fitText(el, 6));
    document.querySelectorAll(".editor-name").forEach(el => fitText(el, 6.5));
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderCard(shift) {
  const color = FILM_COLORS[shift.color] || FILM_COLORS.blue;
  const editor = getEditor(shift.editorId);
  const warning = editorConflict(shift);
  const assignment = shift.isClient ? "CLIENTE" : editorDisplay(editor);
  const cardClasses = [
    "shift-card", shift.status,
    shift.confirmed ? "confirmed" : "",
    shift.isDoubleStation ? "double-station" : "",
    selectedShiftIds.has(shift.id) ? "selected" : "",
    cutShiftIds.has(shift.id) ? "cut-pending" : ""
  ].filter(Boolean).join(" ");

  return `
    <article
      class="${cardClasses}"
      data-shift-id="${shift.id}"
      draggable="${shift.confirmed ? "false" : "true"}"
      style="--accent-rgb:${color.rgb}">
      <div class="shift-main">
        <div class="shift-production">${escapeHtml(shift.production)}</div>
        <div class="shift-time">${escapeHtml(shift.start)} – ${escapeHtml(shift.end)}</div>
        <div class="shift-film">${escapeHtml(shift.film)}</div>
        <div class="shift-type">${escapeHtml(shift.workType)}${shift.isDoubleStation ? '<span class="double-station-label">DOPPIA POSTAZIONE</span>' : ""}</div>
      </div>
      <div class="shift-editor">
        <span class="editor-name${shift.confirmed ? " confirmed-name" : ""}">${escapeHtml(assignment)}</span>
        ${shift.confirmed ? '<span class="confirmed-lock" title="Turno confermato">●</span>' : ""}
        ${warning ? '<span class="editor-warning" title="Dipendente presente su più turni sovrapposti">▲</span>' : ""}
      </div>
    </article>
  `;
}

function renderPlanning() {
  const dates = planningDates(currentMonth);
  const activeMonth = currentMonth.getMonth();
  const now = new Date();

  monthLabel.textContent = monthName(currentMonth);
  planningGrid.style.setProperty("--days", dates.length);
  planningGrid.innerHTML = `<div class="corner">SALE</div>`;

  dates.forEach(date => {
    const weekday = new Intl.DateTimeFormat("it-IT", { weekday: "short" })
      .format(date).replace(".", "").toUpperCase();
    const weekend = [0, 6].includes(date.getDay());
    const holiday = isHoliday(date);
    const weekStart = date.getDay() === 1 && date.getTime() !== dates[0].getTime();
    const today = date.toDateString() === now.toDateString();
    const outsideMonth = date.getMonth() !== activeMonth;

    planningGrid.insertAdjacentHTML("beforeend", `
      <div class="day-head ${weekend ? "weekend" : ""} ${holiday ? "holiday" : ""} ${weekStart ? "week-start" : ""} ${today ? "today-column" : ""} ${outsideMonth ? "outside-month" : ""}"
           data-date="${isoFromDate(date)}">
        <span class="dow">${weekday}</span>
        <span class="num">${String(date.getDate()).padStart(2, "0")}</span>
        ${outsideMonth ? `<span class="month-mini">${new Intl.DateTimeFormat("it-IT", {month:"short"}).format(date).replace(".", "").toUpperCase()}</span>` : ""}
      </div>
    `);
  });

  ROOMS.forEach((room, roomIndex) => {
    if (GROUPS[roomIndex]) planningGrid.insertAdjacentHTML("beforeend", `<div class="group-row">${GROUPS[roomIndex]}</div>`);

    let maxTurnsInDay = 1;
    dates.forEach(dateObject => {
      const date = isoFromDate(dateObject);
      const count = shifts.filter(shift => shift.room === room.id && shift.date === date).length;
      maxTurnsInDay = Math.max(maxTurnsInDay, count);
    });

    const rowHeight = Math.max(98, maxTurnsInDay * 93 + 8);
    planningGrid.insertAdjacentHTML("beforeend", `<div class="room-label" style="--row-height:${rowHeight}px">${room.label}</div>`);

    dates.forEach(dateObject => {
      const date = isoFromDate(dateObject);
      const weekend = [0, 6].includes(dateObject.getDay());
      const holiday = isHoliday(dateObject);
      const weekStart = dateObject.getDay() === 1 && dateObject.getTime() !== dates[0].getTime();
      const outsideMonth = dateObject.getMonth() !== activeMonth;
      const isSelected = selectedCell?.room === room.id && selectedCell?.date === date;
      const dayShifts = shifts.filter(shift => shift.room === room.id && shift.date === date).sort((a,b)=>a.start.localeCompare(b.start));

      planningGrid.insertAdjacentHTML("beforeend", `
        <div class="planning-cell ${weekend ? "weekend" : ""} ${holiday ? "holiday" : ""} ${weekStart ? "week-start" : ""} ${outsideMonth ? "outside-month" : ""} ${isSelected ? "cell-selected" : ""}"
          style="--row-height:${rowHeight}px" data-room="${room.id}" data-date="${date}">
          ${isSelected ? '<span class="cell-selection-dot" aria-hidden="true"></span>' : ""}
          ${dayShifts.map(renderCard).join("")}
          ${dayShifts.length ? "" : '<span class="cell-add-hint">+ turno</span>'}
        </div>`);
    });
  });

  bindPlanningEvents();
  updateSelectionBadge();
  fitAllCardText();
  applyPlanningZoom(false);
}

function bindPlanningEvents() {
  document.querySelectorAll(".shift-card").forEach(card => {
    card.addEventListener("click", event => {
      event.stopPropagation();
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      hideContextMenu();
      const id=card.dataset.shiftId;
      if (event.metaKey||event.ctrlKey) toggleCommandSelection(id);
      else if (event.shiftKey&&selectionAnchorId) selectShiftRange(selectionAnchorId,id);
      else selectOnlyShift(id);
      renderPlanning();
    });
    card.addEventListener("dblclick", event => {
      event.stopPropagation(); hideContextMenu();
      const shift = shifts.find(item => item.id === card.dataset.shiftId);
      if (shift?.confirmed) return showToast("Il turno confermato è bloccato");
      openEditShift(card.dataset.shiftId);
    });
    card.addEventListener("contextmenu", event => {
      const id=card.dataset.shiftId;
      if (!selectedShiftIds.has(id)) selectOnlyShift(id);
      const x=event.clientX,y=event.clientY;
      renderPlanning();
      requestAnimationFrame(()=>showContextMenu({preventDefault(){},stopPropagation(){},clientX:x,clientY:y}, document.querySelector(`.shift-card[data-shift-id="${id}"]`)?.closest('.planning-cell')));
    });
    card.addEventListener("dragstart", event => {
      const dragged = shifts.find(item => item.id === card.dataset.shiftId);
      if (dragged?.confirmed) { event.preventDefault(); return showToast("Il turno confermato è bloccato"); }
      dragSourceShiftId = card.dataset.shiftId;
      const group = captureDragGroup(dragSourceShiftId);

      selectedShiftIds = new Set(group.map(shift => shift.id));
      selectionAnchorId = dragSourceShiftId;
      suppressNextClick = true;

      document.querySelectorAll('.shift-card').forEach(item => {
        if (selectedShiftIds.has(item.dataset.shiftId)) item.classList.add('dragging');
      });

      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragSourceShiftId);
      const image = new Image();
      image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      event.dataTransfer.setDragImage(image, 0, 0);
      createDragGhost(group);
      updateSelectionBadge();
    });

    card.addEventListener("dragend", () => {
      document.querySelectorAll('.shift-card.dragging').forEach(item => item.classList.remove('dragging'));
      dragSourceShiftId = null;
      clearActiveDrag();
      removeDragGhost();
    });
  });

  document.querySelectorAll(".planning-cell").forEach(cell => {
    cell.addEventListener("click", event => {
      if (event.target.closest('.shift-card') || marqueeState?.active) return;
      clearTimeout(emptyCellClickTimer);
      emptyCellClickTimer = setTimeout(() => {
        hideContextMenu();
        selectedShiftIds.clear();
        selectionAnchorId = null;
        selectedCell = {room:cell.dataset.room, date:cell.dataset.date};
        renderPlanning();
      }, 190);
    });
    cell.addEventListener("dblclick", event => {
      if (event.target.closest('.shift-card')) return;
      clearTimeout(emptyCellClickTimer);
      emptyCellClickTimer = null;
      selectedCell = {room:cell.dataset.room, date:cell.dataset.date};
      openNewShift(cell.dataset.room, cell.dataset.date);
    });
    cell.addEventListener("mousedown", event => { if (!event.target.closest('.shift-card')) startMarquee(event,cell); });
    cell.addEventListener("contextmenu", event => { clearTimeout(emptyCellClickTimer); selectedCell={room:cell.dataset.room,date:cell.dataset.date}; showContextMenu(event,cell); });
    cell.addEventListener("dragover", event => {
      event.preventDefault();
      const valid = highlightGroupDestination(cell.dataset.room, cell.dataset.date);
      event.dataTransfer.dropEffect = valid ? 'move' : 'none';
      moveDragGhost(event);
    });
    cell.addEventListener("dragleave", event => {
      if (!event.relatedTarget?.closest?.('.planning-cell')) clearDropHighlights();
    });
    cell.addEventListener("drop", event => {
      event.preventDefault(); clearDropHighlights();
      const sourceId = dragSourceShiftId || event.dataTransfer.getData('text/plain');
      if (!activeDragGroup.length) captureDragGroup(sourceId);

      const candidates = buildMovedGroup(cell.dataset.room, cell.dataset.date);
      if (!candidates.length) {
        clearActiveDrag();
        return removeDragGhost();
      }

      if (groupHasConflict(candidates)) {
        showToast('Orari non compatibili');
        clearActiveDrag();
        return removeDragGhost();
      }

      const movedById = new Map(candidates.map(candidate => [candidate.id, candidate]));
      shifts = shifts.map(shift => movedById.get(shift.id) || shift);
      candidates.forEach(syncShiftToSupabase);
      saveLocal();

      selectedShiftIds = new Set(candidates.map(candidate => candidate.id));
      selectionAnchorId = sourceId;
      selectedCell = null;
      clearActiveDrag();
      renderPlanning();
      removeDragGhost();
      showToast(
        candidates.length === 1
          ? 'Turno spostato'
          : `${candidates.length} turni spostati`
      );
    });
  });
}

document.addEventListener('mousemove',event=>{ if (marqueeState) updateMarquee(event); if (dragGhost) moveDragGhost(event); });
document.addEventListener('mouseup',()=>{ if (marqueeState) finishMarquee(); });
document.addEventListener('click',event=>{ if (!contextMenu.contains(event.target)) hideContextMenu(); });

contextMenu.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]'); if (!button||button.disabled) return;
  const action=button.dataset.action, targetCell=contextTargetCell; hideContextMenu();
  if (action==='edit') { const s=selectedShiftList(); if (s.length===1) openEditShift(s[0].id); }
  else if (action==='confirm') confirmSelectedShift();
  else if (action==='unconfirm') unconfirmSelectedShift();
  else if (action==='copy') copySelectedShifts();
  else if (action==='cut') cutSelectedShifts();
  else if (action==='paste'&&targetCell) { selectedCell={room:targetCell.dataset.room,date:targetCell.dataset.date}; pasteCopiedShifts(); }
  else if (action==='make-definitive') setSelectedStatus('definitivo');
  else if (action==='make-provisional') setSelectedStatus('provvisorio');
  else if (action==='delete') deleteSelectedShifts();
});

function populateShiftSelects() {
  document.getElementById("room").innerHTML = ROOMS.map(room => `<option value="${room.id}">${room.label}</option>`).join("");
  document.getElementById("color").innerHTML = Object.entries(FILM_COLORS).map(([value,item]) => `<option value="${value}">${item.label}</option>`).join("");

  const sortedEditors = [...editors].sort((a,b) => fullEmployeeName(a).localeCompare(fullEmployeeName(b), "it"));
  document.getElementById("editorSuggestions").innerHTML = sortedEditors.map(editor =>
    `<option value="${escapeHtml(fullEmployeeName(editor))}" data-id="${editor.id}"></option>`
  ).join("");

  const productions = [...new Set(shifts.map(shift => shift.production).filter(Boolean))].sort();
  const films = [...new Set(shifts.map(shift => shift.film).filter(Boolean))].sort();
  document.getElementById("productionSuggestions").innerHTML = productions.map(value => `<option value="${escapeHtml(value)}"></option>`).join("");
  document.getElementById("filmSuggestions").innerHTML = films.map(value => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function setWeekdaySelection(values = ["all"]) {
  const selected = new Set(values.map(String));
  document.querySelectorAll("#weekdayPicker button").forEach(button => button.classList.toggle("active", selected.has(button.dataset.weekday)));
}

function selectedWeekdays() {
  const values = [...document.querySelectorAll("#weekdayPicker button.active")].map(button => button.dataset.weekday);
  return values.includes("all") ? null : new Set(values.map(Number));
}

function setStatusUI(status) {
  document.getElementById("status").value = status;
  document.querySelectorAll(".segmented-control [data-status]").forEach(button => button.classList.toggle("active", button.dataset.status === status));
  const color = document.getElementById("color");
  color.disabled = status === "provvisorio";
  document.getElementById("colorField").classList.toggle("disabled-field", status === "provvisorio");
}

function updateClientUI() {
  const client = document.getElementById("isClient").checked;
  const search = document.getElementById("editorSearchInput");
  search.disabled = client;
  if (client) { search.value = ""; document.getElementById("editor").value = ""; }
}

function resolveEditorInput(showError = false) {
  const input = document.getElementById("editorSearchInput");
  const normalized = input.value.trim().toLocaleLowerCase("it");
  if (!normalized) { document.getElementById("editor").value = ""; return true; }
  const match = editors.find(editor => fullEmployeeName(editor).toLocaleLowerCase("it") === normalized);
  document.getElementById("editor").value = match?.id || "";
  if (!match && showError) document.getElementById("shiftFormError").textContent = "Seleziona un dipendente presente nel database.";
  return Boolean(match);
}


let dateCalendarMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
let activeDateField = null;

function formatRangeDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("it-IT", { day:"2-digit", month:"short", year:"numeric" });
}

function updateDateRangeDisplay() {
  const from = document.getElementById("dateFrom").value;
  const to = document.getElementById("dateTo").value;
  document.getElementById("dateFromDisplay").textContent = formatRangeDate(from);
  document.getElementById("dateToDisplay").textContent = formatRangeDate(to);
}

function renderDateCalendar() {
  const title = document.getElementById("dateCalendarTitle");
  const grid = document.getElementById("dateCalendarGrid");
  if (!title || !grid) return;

  title.textContent = dateCalendarMonth.toLocaleDateString("it-IT", { month:"long", year:"numeric" });
  const first = new Date(dateCalendarMonth.getFullYear(), dateCalendarMonth.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -mondayOffset);
  const selectedValue = activeDateField ? document.getElementById(activeDateField).value : "";
  const today = isoFromDate(new Date());

  grid.innerHTML = Array.from({length:42}, (_,index) => {
    const date = addDays(gridStart,index);
    const value = isoFromDate(date);
    const outside = date.getMonth() !== dateCalendarMonth.getMonth();
    const classes = [
      "compact-calendar-day",
      outside ? "outside" : "",
      value === selectedValue ? "selected" : "",
      value === today ? "today" : ""
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-calendar-date="${value}">${date.getDate()}</button>`;
  }).join("");

  grid.querySelectorAll("[data-calendar-date]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      selectCalendarDate(button.dataset.calendarDate);
    });
  });
}

function selectCalendarDate(value) {
  if (!activeDateField) return;
  const from = document.getElementById("dateFrom");
  const to = document.getElementById("dateTo");
  const error = document.getElementById("shiftFormError");

  if (activeDateField === "dateFrom") {
    from.value = value;
    if (!to.value || to.value < value) to.value = value;
  } else {
    if (from.value && value < from.value) {
      if (error) error.textContent = "La data finale non può essere precedente alla data iniziale.";
      return;
    }
    to.value = value;
  }

  if (error) error.textContent = "";
  updateDateRangeDisplay();
  closeDateCalendar();
}

function openDateCalendar(fieldId) {
  const popover = document.getElementById("dateCalendarPopover");
  const trigger = document.getElementById(fieldId === "dateFrom" ? "dateFromTrigger" : "dateToTrigger");
  const value = document.getElementById(fieldId).value || document.getElementById("dateFrom").value;
  activeDateField = fieldId;

  if (value) {
    const date = new Date(`${value}T12:00:00`);
    dateCalendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  }

  popover.classList.toggle("align-to", fieldId === "dateTo");
  popover.classList.toggle("align-from", fieldId === "dateFrom");
  document.getElementById("dateFromTrigger")?.classList.toggle("active", fieldId === "dateFrom");
  document.getElementById("dateToTrigger")?.classList.toggle("active", fieldId === "dateTo");
  document.getElementById("dateFromTrigger")?.setAttribute("aria-expanded", String(fieldId === "dateFrom"));
  document.getElementById("dateToTrigger")?.setAttribute("aria-expanded", String(fieldId === "dateTo"));

  renderDateCalendar();
  popover.classList.remove("hidden");
  trigger?.focus({preventScroll:true});
}

function closeDateCalendar() {
  document.getElementById("dateCalendarPopover")?.classList.add("hidden");
  document.getElementById("dateFromTrigger")?.classList.remove("active");
  document.getElementById("dateToTrigger")?.classList.remove("active");
  document.getElementById("dateFromTrigger")?.setAttribute("aria-expanded", "false");
  document.getElementById("dateToTrigger")?.setAttribute("aria-expanded", "false");
  activeDateField = null;
}

function toggleDateCalendar(fieldId) {
  const popover = document.getElementById("dateCalendarPopover");
  const sameFieldOpen = !popover?.classList.contains("hidden") && activeDateField === fieldId;
  if (sameFieldOpen) closeDateCalendar();
  else openDateCalendar(fieldId);
}

document.getElementById("dateFromTrigger")?.addEventListener("click", event => { event.stopPropagation(); toggleDateCalendar("dateFrom"); });
document.getElementById("dateToTrigger")?.addEventListener("click", event => { event.stopPropagation(); toggleDateCalendar("dateTo"); });
document.getElementById("datePrevMonth")?.addEventListener("click", event => { event.stopPropagation(); dateCalendarMonth = new Date(dateCalendarMonth.getFullYear(),dateCalendarMonth.getMonth()-1,1); renderDateCalendar(); });
document.getElementById("dateNextMonth")?.addEventListener("click", event => { event.stopPropagation(); dateCalendarMonth = new Date(dateCalendarMonth.getFullYear(),dateCalendarMonth.getMonth()+1,1); renderDateCalendar(); });
document.getElementById("dateCalendarPopover")?.addEventListener("click", event => event.stopPropagation());
document.addEventListener("click", event => {
  const field = document.querySelector(".date-range-field");
  if (field && !field.contains(event.target)) closeDateCalendar();
});

function resetShiftForm(shift = {}) {
  const date = shift.date || isoDate(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  document.getElementById("shiftId").value = shift.id || "";
  document.getElementById("production").value = shift.production || "";
  document.getElementById("film").value = shift.film || "";
  document.getElementById("dateFrom").value = date;
  document.getElementById("dateTo").value = shift.dateTo || date;
  updateDateRangeDisplay();
  dateCalendarMonth = new Date(`${date}T12:00:00`);
  renderDateCalendar();
  document.getElementById("room").value = shift.room || "sala-1";
  document.getElementById("start").value = shift.start || "10:00";
  document.getElementById("end").value = shift.end || "18:00";
  document.getElementById("workType").value = shift.workType || "EDIT";
  document.getElementById("editor").value = shift.editorId || "";
  document.getElementById("editorSearchInput").value = shift.editorId ? fullEmployeeName(getEditor(shift.editorId)) : "";
  document.getElementById("isClient").checked = Boolean(shift.isClient);
  document.getElementById("isDoubleStation").checked = Boolean(shift.isDoubleStation);
  document.getElementById("color").value = shift.color || "blue";
  setStatusUI(shift.status || "definitivo");
  setWeekdaySelection(["all"]);
  updateClientUI();
  document.getElementById("shiftFormError").textContent = "";
}

function openNewShift(room = "sala-1", date = "") {
  populateShiftSelects(); editingShiftId = null;
  document.getElementById("shiftDialogTitle").textContent = "Nuovo turno";
  document.getElementById("deleteShiftBtn").classList.add("hidden");
  document.querySelector(".date-range-field").classList.remove("calendar-disabled");
  document.querySelectorAll("#dateCalendarPopover button").forEach(button => button.disabled = false);
  document.getElementById("weekdayPicker").classList.remove("disabled");
  resetShiftForm({ room, date: date || isoDate(currentMonth.getFullYear(), currentMonth.getMonth(), 1) });
  shiftDialog.showModal();
}

function openEditShift(id) {
  const shift = shifts.find(item => item.id === id);
  if (!shift) return;
  if (shift.confirmed) return showToast("Il turno confermato è bloccato");
  populateShiftSelects(); editingShiftId = id;
  document.getElementById("shiftDialogTitle").textContent = "Modifica turno";
  document.getElementById("deleteShiftBtn").classList.remove("hidden");
  resetShiftForm(shift);
  document.querySelector(".date-range-field").classList.add("calendar-disabled");
  document.querySelectorAll("#dateCalendarPopover button").forEach(button => button.disabled = true);
  document.getElementById("weekdayPicker").classList.add("disabled");
  shiftDialog.showModal();
}

function closeShiftDialog() { shiftDialog.close(); document.getElementById("shiftFormError").textContent = ""; }

function datesForFormRange() {
  const from = new Date(`${document.getElementById("dateFrom").value}T12:00:00`);
  const to = new Date(`${document.getElementById("dateTo").value}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return [];
  const weekdays = selectedWeekdays();
  const values = [];
  for (let date = new Date(from); date <= to; date = addDays(date, 1)) if (!weekdays || weekdays.has(date.getDay())) values.push(isoFromDate(date));
  return values;
}

shiftForm.addEventListener("submit", event => {
  event.preventDefault();
  const start = normalizeTime(document.getElementById("start").value);
  const end = normalizeTime(document.getElementById("end").value);
  const error = document.getElementById("shiftFormError");
  error.textContent = "";
  if (!start || !end || timeToMinutes(end) <= timeToMinutes(start)) { error.textContent = "Inserisci un intervallo orario valido."; return; }
  if (!document.getElementById("isClient").checked && !resolveEditorInput(true)) return;

  const dates = editingShiftId ? [document.getElementById("dateFrom").value] : datesForFormRange();
  if (!dates.length) { error.textContent = "Il periodo non contiene giorni selezionati."; return; }

  const common = {
    room: document.getElementById("room").value,
    production: document.getElementById("production").value.trim().replace(/\s+/g," ").toUpperCase(),
    film: document.getElementById("film").value.trim().replace(/\s+/g," ").toUpperCase(),
    start, end,
    workType: document.getElementById("workType").value,
    editorId: document.getElementById("editor").value || null,
    isClient: document.getElementById("isClient").checked,
    isDoubleStation: document.getElementById("isDoubleStation").checked,
    status: document.getElementById("status").value,
    color: document.getElementById("color").value,
    confirmed: false
  };

  const candidates = dates.map((date,index) => ({ ...common, id: editingShiftId || crypto.randomUUID(), date }));
  const conflict = candidates.find(candidate => roomConflict(candidate, editingShiftId));
  if (conflict) { error.textContent = `La sala contiene già un turno sovrapposto il ${new Date(conflict.date+"T12:00:00").toLocaleDateString("it-IT")}.`; return; }

  if (editingShiftId) {
    const previous = shifts.find(item => item.id === editingShiftId);
    candidates[0].confirmed = Boolean(previous?.confirmed);
    shifts[shifts.findIndex(item => item.id === editingShiftId)] = candidates[0];
  } else shifts.push(...candidates);

  saveLocal(); candidates.forEach(syncShiftToSupabase);
  selectedShiftIds = new Set(candidates.map(candidate => candidate.id)); selectionAnchorId = candidates[0].id; selectedCell = null;
  closeShiftDialog(); renderPlanning();
  showToast(candidates.length === 1 ? "Turno salvato" : `${candidates.length} turni creati`);
});

document.getElementById("deleteShiftBtn").addEventListener("click", () => {
  const shift = shifts.find(item => item.id === editingShiftId);
  if (!editingShiftId || shift?.confirmed) return;
  if (!confirm("Eliminare questo turno?")) return;
  shifts = shifts.filter(item => item.id !== editingShiftId); saveLocal(); deleteShiftFromSupabase(editingShiftId);
  selectedShiftIds.clear(); selectionAnchorId = null; closeShiftDialog(); renderPlanning();
});

document.getElementById("closeShiftDialog").addEventListener("click", closeShiftDialog);
document.getElementById("cancelShiftBtn").addEventListener("click", closeShiftDialog);
document.getElementById("newShiftBtn").addEventListener("click", () => openNewShift());

document.getElementById("start").addEventListener("change", event => {
  const value = normalizeTime(event.target.value); if (!value) return;
  const minutes = timeToMinutes(value) + 480;
  document.getElementById("end").value = minutes >= 1440 ? "23:59" : `${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
});
document.getElementById("isClient").addEventListener("change", updateClientUI);
document.getElementById("editorSearchInput").addEventListener("change", () => resolveEditorInput(false));
document.querySelectorAll(".segmented-control [data-status]").forEach(button => button.addEventListener("click", () => setStatusUI(button.dataset.status)));
document.querySelectorAll("#weekdayPicker button").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.weekday === "all") return setWeekdaySelection(["all"]);
  document.querySelector('#weekdayPicker [data-weekday="all"]').classList.remove("active");
  button.classList.toggle("active");
  if (![...document.querySelectorAll('#weekdayPicker button:not([data-weekday="all"])')].some(item => item.classList.contains("active"))) setWeekdaySelection(["all"]);
}));
document.getElementById("dateFrom").addEventListener("change", event => {
  const to = document.getElementById("dateTo"); if (!to.value || to.value < event.target.value) to.value = event.target.value;
});

document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  clearSelection();
  renderPlanning();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  clearSelection();
  renderPlanning();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  const now = new Date();
  currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  clearSelection();
  renderPlanning();

  requestAnimationFrame(() => {
    const dayHeader = planningGrid.querySelector(`[data-date="${isoFromDate(now)}"]`);
    if (!dayHeader) return;
    const target = dayHeader.offsetLeft * planningZoom
      - planningScroller.clientWidth / 2
      + dayHeader.offsetWidth * planningZoom / 2;
    planningScroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  });
});

function clampZoom(value) {
  return Math.min(2, Math.max(.5, value));
}

function nearestZoomOption(value) {
  const options = [.5, .75, 1, 1.25, 1.5, 1.75, 2];
  return options.reduce((best, option) => Math.abs(option - value) < Math.abs(best - value) ? option : best, 1);
}

function fitPlanningToWindow() {
  planningCanvas.style.zoom = 1;
  const naturalWidth = planningCanvas.scrollWidth || 1;
  const availableWidth = Math.max(1, planningScroller.clientWidth - 4);
  planningZoom = clampZoom(availableWidth / naturalWidth);
  applyPlanningZoom();
  zoomSelect.value = "fit";
}

function applyPlanningZoom(save = true) {
  planningZoom = clampZoom(planningZoom);
  planningCanvas.style.zoom = planningZoom;
  if (zoomSelect && zoomSelect.value !== "fit") zoomSelect.value = String(nearestZoomOption(planningZoom));
  if (save) localStorage.setItem(ZOOM_STORAGE, String(planningZoom));
}

planningScroller.addEventListener("wheel", event => {
  if (!(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();

  const rect = planningScroller.getBoundingClientRect();
  const mouseX = event.clientX - rect.left + planningScroller.scrollLeft;
  const mouseY = event.clientY - rect.top + planningScroller.scrollTop;
  const previous = planningZoom;
  planningZoom = clampZoom(planningZoom + (event.deltaY < 0 ? .08 : -.08));

  const ratio = planningZoom / previous;
  applyPlanningZoom();

  planningScroller.scrollLeft = mouseX * ratio - (event.clientX - rect.left);
  planningScroller.scrollTop = mouseY * ratio - (event.clientY - rect.top);
}, { passive: false });

let gestureStartZoom = planningZoom;
planningScroller.addEventListener("gesturestart", event => {
  event.preventDefault();
  gestureStartZoom = planningZoom;
}, { passive: false });

planningScroller.addEventListener("gesturechange", event => {
  event.preventDefault();
  planningZoom = clampZoom(gestureStartZoom * event.scale);
  applyPlanningZoom();
}, { passive: false });

document.addEventListener("keydown", event => {
  const target = event.target;
  const isTyping = Boolean(target.closest("input, select, textarea"));

  if (!isTyping && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
    if (copySelectedShifts()) event.preventDefault();
  }

  if (!isTyping && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "x") {
    if (cutSelectedShifts()) event.preventDefault();
  }

  if (!isTyping && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
    if (pasteCopiedShifts()) event.preventDefault();
  }

  if ((event.metaKey || event.ctrlKey) && ["+", "=", "-"].includes(event.key)) {
    if (isTyping) return;
    event.preventDefault();
    planningZoom = nearestZoomOption(planningZoom + (event.key === "-" ? -.2 : .2));
    zoomSelect.value = String(planningZoom);
    applyPlanningZoom();
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "0" && !isTyping) {
    event.preventDefault();
    fitPlanningToWindow();
  }

  if (event.key === "Escape" && !shiftDialog.open && !editorDialog.open) {
    selectedShiftIds.clear();
  selectionAnchorId = null;
    selectedCell = null;
    renderPlanning();
  }
});

function renderEditors() {
  const query = document.getElementById("editorSearch").value.trim().toLocaleLowerCase("it");
  const roleFilter = document.getElementById("editorRoleFilter")?.value || "";
  const filtered = editors
    .filter(editor => {
      const haystack = [fullEmployeeName(editor), editor.role, editor.phone, editor.email, editor.notes]
        .filter(Boolean).join(" ").toLocaleLowerCase("it");
      return haystack.includes(query) && (!roleFilter || editor.role === roleFilter);
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName, "it", { sensitivity: "base" })
      || a.lastName.localeCompare(b.lastName, "it", { sensitivity: "base" }));

  document.getElementById("editorsCount").textContent = `${filtered.length} dipendenti`;
  document.getElementById("editorsList").innerHTML = filtered.length ? filtered.map(editor => `
    <article class="editor-row" data-editor-id="${editor.id}" tabindex="0" aria-label="Modifica ${escapeHtml(fullEmployeeName(editor))}">
      <div class="employee-main">
        <div class="employee-heading">
          <div class="editor-display">${escapeHtml(fullEmployeeName(editor).toLocaleUpperCase("it"))}</div>
          <span class="employee-role">${escapeHtml(editor.role || "Altro")}</span>
        </div>
        <div class="employee-details">
          ${editor.phone ? `<a class="employee-contact" href="tel:${escapeHtml(editor.phone.replace(/[^+\d]/g, ""))}" data-stop-open>☎ ${escapeHtml(editor.phone)}</a>` : ""}
          ${editor.email ? `<a class="employee-contact" href="mailto:${escapeHtml(editor.email)}" data-stop-open>✉ ${escapeHtml(editor.email)}</a>` : ""}
        </div>
      </div>
      <div class="employee-note-column"><span>Nota</span><div class="employee-notes">${editor.notes ? escapeHtml(editor.notes) : "—"}</div></div>
      <button class="editor-edit-btn" type="button" data-editor-id="${editor.id}" title="Modifica" aria-label="Modifica ${escapeHtml(fullEmployeeName(editor))}">✎</button>
    </article>
  `).join("") : `<div class="employees-empty">Nessun dipendente trovato.</div>`;

  document.querySelectorAll(".editor-row").forEach(row => {
    row.addEventListener("click", event => {
      if (!event.target.closest("[data-stop-open], .editor-edit-btn")) openEditEditor(row.dataset.editorId);
    });
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEditEditor(row.dataset.editorId);
      }
    });
  });
  document.querySelectorAll(".editor-edit-btn").forEach(button => {
    button.addEventListener("click", () => openEditEditor(button.dataset.editorId));
  });
}

function setEmployeeDialogValues(editor = null) {
  document.getElementById("editorId").value = editor?.id || "";
  document.getElementById("editorFirstName").value = editor?.firstName || "";
  document.getElementById("editorLastName").value = editor?.lastName || "";
  document.getElementById("editorRole").value = editor?.role || "Montatore";
  document.getElementById("editorPhone").value = editor?.phone || "";
  document.getElementById("editorEmail").value = editor?.email || "";
  document.getElementById("editorNotes").value = editor?.notes || "";
  document.getElementById("deleteEditorBtn").classList.toggle("hidden", !editor);
  document.getElementById("editorFormError").textContent = "";
}

function openDialogSafely(dialog) {
  if (!dialog) return;
  try {
    if (!dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  } catch {
    dialog.setAttribute("open", "");
  }
}

function closeDialogSafely(dialog) {
  if (!dialog) return;
  try {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  } catch {
    dialog.removeAttribute("open");
  }
}

function openNewEditor() {
  editingEditorId = null;
  document.getElementById("editorDialogTitle").textContent = "Nuovo dipendente";
  setEmployeeDialogValues();
  openDialogSafely(editorDialog);
  requestAnimationFrame(() => document.getElementById("editorFirstName")?.focus());
}

function openEditEditor(id) {
  const editor = editors.find(item => item.id === id);
  if (!editor) return;
  editingEditorId = id;
  document.getElementById("editorDialogTitle").textContent = "Modifica dipendente";
  setEmployeeDialogValues(editor);
  openDialogSafely(editorDialog);
  requestAnimationFrame(() => document.getElementById("editorFirstName")?.focus());
}

function closeEditorDialog() {
  closeDialogSafely(editorDialog);
  document.getElementById("editorFormError").textContent = "";
}

editorForm.addEventListener("submit", async event => {
  event.preventDefault();

  const firstName = document.getElementById("editorFirstName").value.trim().replace(/\s+/g, " ").toLocaleUpperCase("it");
  const lastName = document.getElementById("editorLastName").value.trim().replace(/\s+/g, " ").toLocaleUpperCase("it");
  const role = document.getElementById("editorRole").value;
  const phone = document.getElementById("editorPhone").value.trim();
  const email = document.getElementById("editorEmail").value.trim();
  const notes = document.getElementById("editorNotes").value.trim();

  if (!firstName || !lastName) {
    document.getElementById("editorFormError").textContent = "Inserisci nome e cognome.";
    return;
  }

  const duplicate = editors.some(editor => editor.id !== editingEditorId
    && editor.firstName.toLocaleLowerCase("it") === firstName.toLocaleLowerCase("it")
    && editor.lastName.toLocaleLowerCase("it") === lastName.toLocaleLowerCase("it"));
  if (duplicate) {
    document.getElementById("editorFormError").textContent = "Questo dipendente esiste già.";
    return;
  }

  const candidate = { id: editingEditorId || crypto.randomUUID(), firstName, lastName, role, phone, email, notes };
  if (editingEditorId) editors[editors.findIndex(item => item.id === editingEditorId)] = candidate;
  else editors.push(candidate);

  saveLocal();
  const ok = await syncEditorToSupabase(candidate);
  closeEditorDialog();
  renderEditors();
  renderPlanning();
  showToast(ok ? "Dipendente salvato" : "Dipendente salvato in locale");
});

async function deleteCurrentEditor() {
  if (!editingEditorId) return;
  const editor = editors.find(item => item.id === editingEditorId);
  if (!editor) return;
  const linkedShifts = shifts.filter(shift => shift.editorId === editingEditorId).length;
  const warning = linkedShifts
    ? `\n\nÈ associato a ${linkedShifts} turn${linkedShifts === 1 ? "o" : "i"}: nei turni il dipendente verrà impostato come non assegnato.`
    : "";
  if (!confirm(`Eliminare definitivamente ${fullEmployeeName(editor)}?\n\nQuesta operazione non può essere annullata.${warning}`)) return;

  if (linkedShifts) {
    shifts = shifts.map(shift => shift.editorId === editingEditorId ? { ...shift, editorId: null } : shift);
    for (const shift of shifts.filter(item => item.editorId === null)) await syncShiftToSupabase(shift);
  }
  editors = editors.filter(item => item.id !== editingEditorId);
  await deleteEditorFromSupabase(editingEditorId);
  saveLocal();
  closeEditorDialog();
  renderEditors();
  renderPlanning();
  showToast("Dipendente eliminato");
}

const newEditorBtn = document.getElementById("newEditorBtn");
const closeEditorDialogBtn = document.getElementById("closeEditorDialog");
const cancelEditorBtn = document.getElementById("cancelEditorBtn");
const deleteEditorBtn = document.getElementById("deleteEditorBtn");
const editorSearch = document.getElementById("editorSearch");

newEditorBtn?.addEventListener("click", openNewEditor);
closeEditorDialogBtn?.addEventListener("click", closeEditorDialog);
cancelEditorBtn?.addEventListener("click", closeEditorDialog);
deleteEditorBtn?.addEventListener("click", deleteCurrentEditor);
editorSearch?.addEventListener("input", renderEditors);
document.getElementById("editorRoleFilter")?.addEventListener("change", renderEditors);

// Fallback delegato: mantiene funzionanti apertura e modifica anche dopo render dinamici o cache parziali.
document.addEventListener("click", event => {
  const newButton = event.target.closest("#newEditorBtn");
  if (newButton) {
    event.preventDefault();
    openNewEditor();
    return;
  }

  const editButton = event.target.closest(".editor-edit-btn[data-editor-id]");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openEditEditor(editButton.dataset.editorId);
  }
});

zoomSelect?.addEventListener("change", () => {
  if (zoomSelect.value === "fit") fitPlanningToWindow();
  else {
    planningZoom = Number(zoomSelect.value);
    applyPlanningZoom();
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", logoutProfile);


function localTodayIso() {
  const now = new Date();
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function italianLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("it-IT", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(date);
}

function openView(viewName) {
  document.querySelectorAll(".nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === viewName));
  document.querySelectorAll(".app-view").forEach(view => view.classList.remove("active"));
  document.getElementById(`${viewName}View`)?.classList.add("active");
  if (viewName === "editors") renderEditors();
  if (viewName === "dashboard") renderDashboard();
}

function openPlanningToday() {
  const now = new Date();
  currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  openView("planning");
  renderPlanning();
  requestAnimationFrame(() => {
    const todayCell = document.querySelector(`[data-date="${localTodayIso()}"]`);
    todayCell?.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
  });
}

function employeeNameById(id) {
  const editor = editors.find(item => item.id === id);
  return editor ? fullEmployeeName(editor) : "CLIENTE";
}

function dashboardRoomOrder(roomId) {
  const room = ROOMS.find(item => item.id === roomId);
  return room?.sortOrder ?? Number.MAX_SAFE_INTEGER;
}

function renderDashboard() {
  const today = localTodayIso();
  const todays = shifts
    .filter(shift => shift.date === today)
    .sort((a, b) => {
      const roomDifference = dashboardRoomOrder(a.room) - dashboardRoomOrder(b.room);
      return roomDifference || String(a.start || "").localeCompare(String(b.start || ""));
    });

  const people = [...new Set(todays.filter(shift => shift.editorId).map(shift => shift.editorId))]
    .sort((a, b) => employeeNameById(a).localeCompare(employeeNameById(b), "it", { sensitivity:"base" }));
  const occupiedPhysicalRooms = new Set(todays.filter(shift => /^sala-\d+$/.test(shift.room)).map(shift => shift.room));

  const greeting = document.getElementById("dashboardGreeting");
  if (greeting) greeting.textContent = `Buongiorno${activeProfile?.name ? `, ${activeProfile.name.split(" ")[0]}` : ""}`;
  const dateLabel = document.getElementById("dashboardDate");
  if (dateLabel) dateLabel.textContent = italianLongDate();

  const shiftCount = document.getElementById("todayShiftCount");
  const peopleCount = document.getElementById("todayPeopleCount");
  const roomCount = document.getElementById("todayRoomCount");
  if (shiftCount) shiftCount.textContent = String(todays.length);
  if (peopleCount) peopleCount.textContent = String(people.length);
  if (roomCount) roomCount.textContent = `${occupiedPhysicalRooms.size}/15`;

  const planningList = document.getElementById("todayPlanningList");
  if (planningList) {
    planningList.innerHTML = todays.length ? todays.map(shift => {
      const room = ROOMS.find(item => item.id === shift.room)?.label || shift.room;
      return `<div class="today-shift-row"><time>${escapeHtml(shift.start)}–${escapeHtml(shift.end)}</time><span class="room">${escapeHtml(room)}</span><strong>${escapeHtml(shift.film || shift.production || "Turno")}</strong><span>${escapeHtml(employeeNameById(shift.editorId))}</span></div>`;
    }).join("") : '<div class="empty-dashboard">Nessun turno programmato per oggi.</div>';
    planningList.scrollTop = 0;
  }

  const roomsList = document.getElementById("todayRoomsList");
  if (roomsList) {
    const physicalRooms = ROOMS.filter(room => /^sala-\d+$/.test(room.id));
    const activeRemoteIds = new Set(todays.filter(shift => /^remoto-\d+$/.test(shift.room)).map(shift => shift.room));
    const activeRemoteRooms = ROOMS.filter(room => activeRemoteIds.has(room.id));
    const dashboardRooms = [...physicalRooms, ...activeRemoteRooms].sort((a, b) => a.sortOrder - b.sortOrder);
    const rowsPerColumn = Math.ceil(dashboardRooms.length / 2);
    roomsList.style.setProperty("--dashboard-room-rows", String(rowsPerColumn));
    roomsList.innerHTML = dashboardRooms.map(room => {
      const isBusy = todays.some(shift => shift.room === room.id);
      const label = room.label.replace(/^Remote\s+/i, "Remoto ");
      return `<div class="compact-room"><i class="room-dot ${isBusy ? "busy" : ""}" aria-hidden="true"></i><span>${escapeHtml(label)}</span></div>`;
    }).join("");
    roomsList.scrollTop = 0;
  }

  const employeesList = document.getElementById("todayEmployeesList");
  if (employeesList) {
    employeesList.innerHTML = people.length ? people.map(id => {
      const employeeShifts = todays.filter(shift => shift.editorId === id);
      const roomLabels = [...new Set(employeeShifts.map(shift => {
        const label = ROOMS.find(item => item.id === shift.room)?.label || shift.room || "—";
        return label.replace(/^Remote\s+/i, "Remoto ");
      }))];
      return `<div class="compact-row"><span>${escapeHtml(employeeNameById(id))}</span><span>${escapeHtml(roomLabels.join(", "))}</span></div>`;
    }).join("") : '<div class="empty-dashboard">Nessun dipendente presente oggi.</div>';
    employeesList.scrollTop = 0;
  }

  renderReminders();
}

function renderReminders() {
  const list = document.getElementById("remindersList");
  const count = document.getElementById("remindersCount");
  if (!list || !count) return;
  count.textContent = String(reminders.length);
  list.innerHTML = reminders.length ? reminders.map(item => `<div class="reminder-row"><span>${escapeHtml(item.text)}</span><button class="reminder-delete" type="button" data-reminder-id="${escapeHtml(item.id)}" aria-label="Elimina promemoria">×</button></div>`).join("") : '<div class="empty-dashboard">Nessun promemoria condiviso.</div>';
}

async function syncReminderToSupabase(reminder) {
  if (!db) return;
  const { error } = await db.from("reminders").upsert({ id:reminder.id, text:reminder.text, created_by:activeProfile?.name || null, created_at:reminder.createdAt });
  if (error) showToast(`Promemoria: ${error.message}`);
}
async function deleteReminderFromSupabase(id) {
  if (!db) return;
  const { error } = await db.from("reminders").delete().eq("id", id);
  if (error) showToast(`Promemoria: ${error.message}`);
}
async function loadRemindersFromSupabase() {
  if (!db) return;
  const { data, error } = await db.from("reminders").select("*").order("created_at", { ascending:false });
  if (error) { console.warn("Tabella reminders non ancora configurata:", error.message); return; }
  reminders = (data || []).map(row => ({ id:String(row.id), text:row.text, createdAt:row.created_at }));
  localStorage.setItem(REMINDER_STORAGE, JSON.stringify(reminders));
  renderReminders();
}

document.getElementById("todayShiftsCard")?.addEventListener("click", openPlanningToday);
document.getElementById("openTodayPlanning")?.addEventListener("click", openPlanningToday);
document.getElementById("reminderForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const input = document.getElementById("reminderInput");
  const text = input.value.trim();
  if (!text) return;
  const reminder = { id: crypto.randomUUID(), text, createdAt:new Date().toISOString() };
  reminders.unshift(reminder);
  localStorage.setItem(REMINDER_STORAGE, JSON.stringify(reminders));
  input.value = "";
  renderReminders();
  await syncReminderToSupabase(reminder);
});
document.getElementById("remindersList")?.addEventListener("click", async event => {
  const button = event.target.closest(".reminder-delete");
  if (!button) return;
  const id = button.dataset.reminderId;
  reminders = reminders.filter(item => item.id !== id);
  localStorage.setItem(REMINDER_STORAGE, JSON.stringify(reminders));
  renderReminders();
  await deleteReminderFromSupabase(id);
});

document.querySelectorAll(".nav-item[data-view]").forEach(button => {
  button.addEventListener("click", () => openView(button.dataset.view));
});

async function syncShiftSuggestions(shift) {
  if (!db) return;
  const operations = [];
  if (shift.production) operations.push(db.from("production_suggestions").insert({ name: shift.production }));
  if (shift.film) operations.push(db.from("program_suggestions").insert({ name: shift.film }));
  const results = await Promise.all(operations);
  const failed = results.find(result => result.error && result.error.code !== "23505");
  if (failed?.error) console.warn("Suggerimenti non sincronizzati:", failed.error.message);
}

async function syncShiftToSupabase(shift) {
  if (!db) return;
  const row = {
    id: shift.id,
    room_code: shift.room,
    shift_date: shift.date,
    production: shift.production,
    film: shift.film,
    program_title: shift.film,
    start_time: shift.start === "24:00" ? "00:00" : shift.start,
    end_time: shift.end === "24:00" ? "00:00" : shift.end,
    end_is_24: shift.end === "24:00",
    work_type: shift.workType,
    staff_id: shift.editorId,
    is_client: Boolean(shift.isClient),
    is_double_station: Boolean(shift.isDoubleStation),
    status: shift.status,
    confirmed: Boolean(shift.confirmed),
    confirmed_at: shift.confirmed ? (shift.confirmedAt || new Date().toISOString()) : null,
    color_key: shift.color
  };
  const { error } = await db.from("shifts").upsert(row);
  if (error) showToast(`Supabase: ${error.message}`);
  else syncShiftSuggestions(shift);
}

async function deleteShiftFromSupabase(id) {
  if (!db) return;
  const { error } = await db.from("shifts").delete().eq("id", id);
  if (error) showToast(`Supabase: ${error.message}`);
}

async function syncEditorToSupabase(editor) {
  if (!db) return false;
  const row = {
    id: editor.id,
    first_name: editor.firstName,
    last_name: editor.lastName,
    role: editor.role || "Altro",
    phone: editor.phone || null,
    email: editor.email || null,
    notes: editor.notes || null
  };
  const { error } = await db.from("staff").upsert(row);
  if (error) { showToast(`Supabase: ${error.message}`); return false; }
  return true;
}

async function deleteEditorFromSupabase(id) {
  if (!db) return true;
  const { error } = await db.from("staff").delete().eq("id", id);
  if (error) { showToast(`Supabase: ${error.message}`); return false; }
  return true;
}

async function loadSupabaseData() {
  if (!db) return;

  const [staffResult, shiftsResult] = await Promise.all([
    db.from("staff").select("*").order("first_name").order("last_name"),
    db.from("shifts").select("*").order("shift_date").order("start_time")
  ]);

  if (staffResult.error) {
    console.error("Errore caricamento staff:", staffResult.error);
    showToast(`Supabase staff: ${staffResult.error.message}`);
    return;
  }

  if (shiftsResult.error) {
    console.error("Errore caricamento turni:", shiftsResult.error);
    showToast(`Supabase turni: ${shiftsResult.error.message}`);
    return;
  }

  editors = (staffResult.data || []).map(row => ({
    id: String(row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role || "Altro",
    phone: row.phone || "",
    email: row.email || "",
    notes: row.notes || ""
  }));

  shifts = (shiftsResult.data || []).map(row => ({
    id: String(row.id),
    room: row.room_code,
    date: row.shift_date,
    production: row.production || "",
    film: row.program_title || row.film || "",
    start: String(row.start_time || "").slice(0, 5),
    end: row.end_is_24 ? "24:00" : String(row.end_time || "").slice(0, 5),
    workType: row.work_type,
    editorId: row.staff_id ? String(row.staff_id) : null,
    isClient: Boolean(row.is_client),
    isDoubleStation: Boolean(row.is_double_station),
    status: row.status,
    color: row.color_key,
    confirmed: Boolean(row.confirmed),
    confirmedAt: row.confirmed_at || null
  }));

  saveLocal();
  renderEditors();
  renderPlanning();
  renderDashboard();
}

function enableRealtime() {
  if (!db) return;

  db.channel("dvs-planning-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, loadSupabaseData)
    .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, loadSupabaseData)
    .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, loadRemindersFromSupabase)
    .subscribe();
}

initializeProfileGate();
populateShiftSelects();
zoomSelect.value = String(nearestZoomOption(planningZoom));
applyPlanningZoom(false);
renderPlanning();
renderEditors();
renderDashboard();
loadRemindersFromSupabase();
loadSupabaseData();
enableRealtime();
