
const ROOMS = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `sala-${index + 1}`,
    label: `Sala ${index + 1}`
  })),
  { id: "grafica-remoto", label: "Grafica remoto" },
  { id: "sound-remoto", label: "Sound remoto" }
];

const GROUPS = {
  0: "CHINOTTO 1 · SALE 1–5",
  5: "CHINOTTO 2 · SALE 6–10",
  10: "CARSO 3 · SALE 11–15",
  15: "LAVORAZIONI DA REMOTO"
};

const FILM_COLORS = [
  { id: "blue", label: "Blu vetro", rgb: "66, 133, 244" },
  { id: "violet", label: "Viola vetro", rgb: "139, 92, 246" },
  { id: "pink", label: "Rosa vetro", rgb: "229, 91, 155" },
  { id: "red", label: "Rosso vetro", rgb: "235, 76, 91" },
  { id: "orange", label: "Arancio vetro", rgb: "242, 145, 55" },
  { id: "amber", label: "Giallo vetro", rgb: "230, 180, 45" },
  { id: "green", label: "Verde vetro", rgb: "66, 168, 111" },
  { id: "teal", label: "Petrolio vetro", rgb: "44, 158, 164" },
  { id: "cyan", label: "Azzurro vetro", rgb: "53, 170, 223" },
  { id: "indigo", label: "Indaco vetro", rgb: "81, 99, 214" },
  { id: "sand", label: "Sabbia vetro", rgb: "183, 142, 93" },
  { id: "plum", label: "Prugna vetro", rgb: "156, 83, 151" }
];

const DEFAULT_SHIFTS = [
  { id: "1", room: "sala-1", date: "2026-07-01", client: "RAI", film: "VITA IN DIRETTA", start: "08:00", end: "16:00", type: "EDIT", editor: "MARCO D.", status: "definitivo", color: "amber" },
  { id: "2", room: "sala-1", date: "2026-07-02", client: "RAI", film: "VITA IN DIRETTA", start: "08:00", end: "16:00", type: "EDIT", editor: "VALENTINA R.", status: "definitivo", color: "amber" },
  { id: "3", room: "sala-1", date: "2026-07-03", client: "RAI", film: "VITA IN DIRETTA", start: "08:00", end: "16:00", type: "EDIT", editor: "MARCO D.", status: "definitivo", color: "amber" },
  { id: "4", room: "sala-2", date: "2026-07-01", client: "CATTLEYA", film: "FILM 2", start: "10:00", end: "18:00", type: "EDIT", editor: "", status: "provvisorio", color: "violet" },
  { id: "5", room: "sala-3", date: "2026-07-01", client: "RAI", film: "SERVIZIO SPECIALE", start: "08:00", end: "16:00", type: "ASSISTENTE", editor: "ALESSANDRA P.", status: "definitivo", color: "pink" },
  { id: "6", room: "sala-3", date: "2026-07-01", client: "RAI", film: "SERVIZIO SPECIALE", start: "16:00", end: "24:00", type: "EDIT", editor: "BARBARA C.", status: "definitivo", color: "pink" },
  { id: "7", room: "sala-4", date: "2026-07-02", client: "DVS", film: "DOCUMENTARIO", start: "12:00", end: "20:00", type: "COLOR", editor: "LUCA V.", status: "definitivo", color: "teal" },
  { id: "8", room: "sala-6", date: "2026-07-06", client: "SKY", film: "SPORT WEEK", start: "10:00", end: "18:00", type: "EDIT", editor: "MARCO D.", status: "definitivo", color: "blue" },
  { id: "9", room: "sala-8", date: "2026-07-07", client: "NETFLIX", film: "SERIE TV", start: "10:00", end: "18:00", type: "EDIT", editor: "MARCO D.", status: "definitivo", color: "red" },
  { id: "10", room: "sala-11", date: "2026-07-09", client: "CATTLEYA", film: "FILM 2", start: "10:00", end: "18:00", type: "EDIT", editor: "", status: "provvisorio", color: "violet" },
  { id: "11", room: "grafica-remoto", date: "2026-07-02", client: "RAI", film: "VITA IN DIRETTA", start: "09:00", end: "17:00", type: "GRAFICA", editor: "GIULIA C.", status: "definitivo", color: "amber" },
  { id: "12", room: "sound-remoto", date: "2026-07-03", client: "DVS", film: "DOCUMENTARIO", start: "10:00", end: "18:00", type: "SOUND DESIGN", editor: "ANDREA S.", status: "definitivo", color: "teal" }
];

let currentMonth = new Date(2026, 6, 1);
let shifts = loadShifts();
let selectedShiftIds = new Set();
let pasteTarget = null;
let clipboard = [];
let editingId = null;
let draggedId = null;
let shiftAnchorId = null;

const SUPABASE_ENABLED = Boolean(
  window.DVS_SUPABASE?.url &&
  window.DVS_SUPABASE?.anonKey &&
  window.supabase?.createClient
);
const db = SUPABASE_ENABLED
  ? window.supabase.createClient(window.DVS_SUPABASE.url, window.DVS_SUPABASE.anonKey)
  : null;

const grid = document.getElementById("planningGrid");
const scroller = document.getElementById("planningScroller");
const shiftDialog = document.getElementById("shiftDialog");
const shiftForm = document.getElementById("shiftForm");
const summaryDialog = document.getElementById("summaryDialog");
const toast = document.getElementById("toast");

function loadShifts() {
  try {
    return JSON.parse(localStorage.getItem("dvs-planning-build-3")) || structuredClone(DEFAULT_SHIFTS);
  } catch {
    return structuredClone(DEFAULT_SHIFTS);
  }
}

function saveShifts() {
  localStorage.setItem("dvs-planning-build-3", JSON.stringify(shifts));
}

function toDatabaseShift(shift) {
  return {
    id: shift.id,
    room: shift.room,
    shift_date: shift.date,
    client: shift.client,
    film: shift.film,
    start_time: shift.start,
    end_time: shift.end,
    work_type: shift.type,
    editor: shift.editor || null,
    status: shift.status,
    color: shift.color
  };
}

function fromDatabaseShift(row) {
  return {
    id: String(row.id),
    room: row.room,
    date: row.shift_date,
    client: row.client,
    film: row.film,
    start: String(row.start_time).slice(0, 5),
    end: String(row.end_time).slice(0, 5),
    type: row.work_type,
    editor: row.editor || "",
    status: row.status,
    color: row.color
  };
}

async function upsertRemote(items) {
  if (!db || !items.length) return;
  const { error } = await db.from("shifts").upsert(items.map(toDatabaseShift));
  if (error) showToast("Errore salvataggio database");
}

async function deleteRemote(id) {
  if (!db) return;
  const { error } = await db.from("shifts").delete().eq("id", id);
  if (error) showToast("Errore eliminazione database");
}

async function loadRemoteShifts() {
  if (!db) return;
  const { data, error } = await db.from("shifts").select("*").order("shift_date");
  if (error) {
    showToast("Supabase non raggiungibile: modalità locale");
    return;
  }
  if (data?.length) {
    shifts = data.map(fromDatabaseShift);
    saveShifts();
    render();
  }
}

function enableRealtime() {
  if (!db) return;
  db.channel("planning-shifts")
    .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, async () => {
      const { data, error } = await db.from("shifts").select("*").order("shift_date");
      if (!error) {
        shifts = (data || []).map(fromDatabaseShift);
        saveShifts();
        render();
      }
    })
    .subscribe();
}

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function minuteValue(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours * 60) + minutes;
}

function intervalsOverlap(first, second) {
  return minuteValue(first.start) < minuteValue(second.end)
    && minuteValue(second.start) < minuteValue(first.end);
}

function colorById(id) {
  return FILM_COLORS.find(color => color.id === id) || FILM_COLORS[0];
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1900);
}

function personHasConflict(shift) {
  if (!shift.editor) return false;
  return shifts.some(other =>
    other.id !== shift.id
    && other.date === shift.date
    && other.editor.trim().toLowerCase() === shift.editor.trim().toLowerCase()
    && intervalsOverlap(shift, other)
  );
}

function roomHasConflict(candidate, excludedId = null, source = shifts) {
  return source.some(other =>
    other.id !== excludedId
    && other.room === candidate.room
    && other.date === candidate.date
    && intervalsOverlap(candidate, other)
  );
}

function cardHtml(shift) {
  const color = colorById(shift.color);
  const selected = selectedShiftIds.has(shift.id) ? "is-selected" : "";
  const provisional = shift.status === "provvisorio" ? "provisional" : "";
  const warning = personHasConflict(shift)
    ? '<span class="editor-warning" title="Montatore presente in un altro turno sovrapposto">▲</span>'
    : "";

  return `
    <article
      class="shift-card ${selected} ${provisional}"
      data-shift-id="${shift.id}"
      draggable="true"
      style="--film-color:${color.rgb}">
      <div class="shift-content">
        <div class="shift-client">${escapeHtml(shift.client)}</div>
        <div class="shift-time">${escapeHtml(shift.start)} – ${escapeHtml(shift.end)}</div>
        <div class="shift-film">${escapeHtml(shift.film)}</div>
        <div class="shift-type">${escapeHtml(shift.type)}</div>
      </div>
      <div class="editor-strip">
        <span class="editor-name">${escapeHtml(shift.editor || "—")}</span>
        ${warning}
      </div>
    </article>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function render() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const totalDays = daysInMonth(currentMonth);
  const today = new Date();

  document.getElementById("monthLabel").textContent =
    new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(currentMonth);

  grid.style.setProperty("--days", totalDays);
  grid.innerHTML = '<div class="grid-corner">SALA</div>';

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const weekday = new Intl.DateTimeFormat("it-IT", { weekday: "short" })
      .format(date).replace(".", "").toUpperCase();
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const weekStart = date.getDay() === 1 && day !== 1;
    const isToday = date.toDateString() === today.toDateString();

    grid.insertAdjacentHTML("beforeend", `
      <div class="day-header ${weekend ? "weekend" : ""} ${weekStart ? "week-start" : ""} ${isToday ? "today" : ""}">
        ${weekday} ${String(day).padStart(2, "0")}
      </div>`);
  }

  ROOMS.forEach((room, roomIndex) => {
    if (GROUPS[roomIndex]) {
      grid.insertAdjacentHTML("beforeend", `<div class="group-header">${GROUPS[roomIndex]}</div>`);
    }

    let maxShiftsInDay = 1;
    for (let day = 1; day <= totalDays; day += 1) {
      const date = isoDate(year, month, day);
      const count = shifts.filter(shift => shift.room === room.id && shift.date === date).length;
      maxShiftsInDay = Math.max(maxShiftsInDay, count);
    }

    const rowHeight = Math.max(92, (maxShiftsInDay * 87) + 5);

    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="room-label" style="--row-height:${rowHeight}px">${escapeHtml(room.label)}</div>`
    );

    for (let day = 1; day <= totalDays; day += 1) {
      const dateObject = new Date(year, month, day);
      const date = isoDate(year, month, day);
      const weekend = dateObject.getDay() === 0 || dateObject.getDay() === 6;
      const weekStart = dateObject.getDay() === 1 && day !== 1;
      const isTarget = pasteTarget?.room === room.id && pasteTarget?.date === date;

      const dayShifts = shifts
        .filter(shift => shift.room === room.id && shift.date === date)
        .sort((first, second) => first.start.localeCompare(second.start));

      grid.insertAdjacentHTML("beforeend", `
        <div
          class="planning-cell ${weekend ? "weekend" : ""} ${weekStart ? "week-start" : ""} ${isTarget ? "is-paste-target" : ""}"
          style="--row-height:${rowHeight}px"
          data-room="${room.id}"
          data-date="${date}">
          ${dayShifts.map(cardHtml).join("")}
        </div>`);
    }
  });

  bindGridEvents();
}

function bindGridEvents() {
  document.querySelectorAll(".shift-card").forEach(card => {
    card.addEventListener("click", event => {
      event.stopPropagation();
      selectShift(card.dataset.shiftId, event.shiftKey);
    });

    card.addEventListener("dblclick", event => {
      event.stopPropagation();
      openEditDialog(card.dataset.shiftId);
    });

    card.addEventListener("dragstart", () => {
      draggedId = card.dataset.shiftId;
      card.classList.add("is-dragging");
    });

    card.addEventListener("dragend", () => {
      draggedId = null;
      card.classList.remove("is-dragging");
    });
  });

  document.querySelectorAll(".planning-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      selectedShiftIds.clear();
      shiftAnchorId = null;
      pasteTarget = { room: cell.dataset.room, date: cell.dataset.date };
      render();
    });

    cell.addEventListener("dblclick", () => {
      openNewDialog(cell.dataset.room, cell.dataset.date);
    });

    cell.addEventListener("dragover", event => {
      event.preventDefault();
    });

    cell.addEventListener("drop", event => {
      event.preventDefault();
      if (!draggedId) return;

      const shift = shifts.find(item => item.id === draggedId);
      if (!shift) return;

      const candidate = {
        ...shift,
        room: cell.dataset.room,
        date: cell.dataset.date
      };

      if (roomHasConflict(candidate, shift.id)) {
        showToast("Orari non compatibili");
        return;
      }

      shift.room = candidate.room;
      shift.date = candidate.date;
      saveShifts();
      upsertRemote([shift]);
      render();
      showToast("Turno spostato");
    });
  });
}

function selectShift(id, useRange) {
  const target = shifts.find(shift => shift.id === id);
  if (!target) return;

  pasteTarget = null;

  if (useRange && shiftAnchorId) {
    const anchor = shifts.find(shift => shift.id === shiftAnchorId);

    if (anchor && anchor.room === target.room) {
      const sameRoom = shifts
        .filter(shift => shift.room === target.room)
        .sort((first, second) =>
          first.date.localeCompare(second.date) || first.start.localeCompare(second.start)
        );

      const firstIndex = sameRoom.findIndex(shift => shift.id === anchor.id);
      const lastIndex = sameRoom.findIndex(shift => shift.id === target.id);

      if (firstIndex !== -1 && lastIndex !== -1) {
        selectedShiftIds.clear();
        sameRoom
          .slice(Math.min(firstIndex, lastIndex), Math.max(firstIndex, lastIndex) + 1)
          .forEach(shift => selectedShiftIds.add(shift.id));
      }
    } else {
      selectedShiftIds.clear();
      selectedShiftIds.add(id);
      shiftAnchorId = id;
    }
  } else {
    selectedShiftIds.clear();
    selectedShiftIds.add(id);
    shiftAnchorId = id;
  }

  render();
}

function populateSelects() {
  const roomInput = document.getElementById("roomInput");
  roomInput.innerHTML = ROOMS
    .map(room => `<option value="${room.id}">${escapeHtml(room.label)}</option>`)
    .join("");

  const colorInput = document.getElementById("colorInput");
  colorInput.innerHTML = FILM_COLORS
    .map(color => `<option value="${color.id}">${escapeHtml(color.label)}</option>`)
    .join("");
}

function fillForm(shift) {
  document.getElementById("clientInput").value = shift.client || "";
  document.getElementById("filmInput").value = shift.film || "";
  document.getElementById("dateInput").value = shift.date || "";
  document.getElementById("roomInput").value = shift.room || "sala-1";
  document.getElementById("startInput").value = shift.start || "08:00";
  document.getElementById("endInput").value = shift.end || "16:00";
  document.getElementById("typeInput").value = shift.type || "EDIT";
  document.getElementById("editorInput").value = shift.editor || "";
  document.getElementById("statusInput").value = shift.status || "definitivo";
  document.getElementById("colorInput").value = shift.color || "blue";
}

function openNewDialog(room = "sala-1", date = isoDate(currentMonth.getFullYear(), currentMonth.getMonth(), 1)) {
  editingId = null;
  document.getElementById("sheetTitle").textContent = "Nuovo turno";
  document.getElementById("deleteButton").hidden = true;
  fillForm({
    room,
    date,
    client: "",
    film: "",
    start: "08:00",
    end: "16:00",
    type: "EDIT",
    editor: "",
    status: "definitivo",
    color: "blue"
  });
  shiftDialog.showModal();
}

function openEditDialog(id) {
  const shift = shifts.find(item => item.id === id);
  if (!shift) return;

  editingId = id;
  document.getElementById("sheetTitle").textContent = "Modifica turno";
  document.getElementById("deleteButton").hidden = false;
  fillForm(shift);
  shiftDialog.showModal();
}

shiftForm.addEventListener("submit", event => {
  event.preventDefault();

  const candidate = {
    id: editingId || crypto.randomUUID(),
    client: document.getElementById("clientInput").value.trim().toUpperCase(),
    film: document.getElementById("filmInput").value.trim().toUpperCase(),
    date: document.getElementById("dateInput").value,
    room: document.getElementById("roomInput").value,
    start: document.getElementById("startInput").value,
    end: document.getElementById("endInput").value,
    type: document.getElementById("typeInput").value,
    editor: document.getElementById("editorInput").value.trim().toUpperCase(),
    status: document.getElementById("statusInput").value,
    color: document.getElementById("colorInput").value
  };

  if (minuteValue(candidate.end) <= minuteValue(candidate.start)) {
    showToast("Orari non compatibili");
    return;
  }

  if (roomHasConflict(candidate, editingId)) {
    showToast("Orari non compatibili");
    return;
  }

  if (editingId) {
    const index = shifts.findIndex(shift => shift.id === editingId);
    shifts[index] = candidate;
    showToast("Turno modificato");
  } else {
    shifts.push(candidate);
    showToast("Turno creato");
  }

  saveShifts();
  shiftDialog.close();
  render();
});

document.getElementById("deleteButton").addEventListener("click", () => {
  if (!editingId) return;
  if (!window.confirm("Eliminare questo turno?")) return;

  shifts = shifts.filter(shift => shift.id !== editingId);
  saveShifts();
  shiftDialog.close();
  render();
  showToast("Turno eliminato");
});

document.getElementById("closeSheet").addEventListener("click", () => shiftDialog.close());
document.getElementById("cancelButton").addEventListener("click", () => shiftDialog.close());
document.getElementById("newShiftButton").addEventListener("click", () => openNewDialog());

document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  render();
});

document.getElementById("todayButton").addEventListener("click", () => {
  const today = new Date();
  currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  render();
});

document.getElementById("summaryButton").addEventListener("click", () => {
  const prefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const totals = new Map();

  shifts
    .filter(shift => shift.date.startsWith(prefix) && shift.status === "definitivo" && shift.editor)
    .forEach(shift => totals.set(shift.editor, (totals.get(shift.editor) || 0) + 1));

  const summaryList = document.getElementById("summaryList");
  const rows = [...totals.entries()].sort((first, second) => second[1] - first[1]);

  summaryList.innerHTML = rows.length
    ? rows.map(([editor, total]) =>
        `<div class="summary-row"><strong>${escapeHtml(editor)}</strong><span>${total} turni</span></div>`
      ).join("")
    : '<div class="summary-empty">Nessun turno definitivo assegnato nel mese.</div>';

  summaryDialog.showModal();
});

document.getElementById("closeSummary").addEventListener("click", () => summaryDialog.close());

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ((event.metaKey || event.ctrlKey) && key === "c" && selectedShiftIds.size) {
    event.preventDefault();
    clipboard = [...selectedShiftIds]
      .map(id => shifts.find(shift => shift.id === id))
      .filter(Boolean)
      .map(shift => ({ ...shift }));

    showToast(`${clipboard.length} turno/i copiato/i`);
  }

  if ((event.metaKey || event.ctrlKey) && key === "v" && clipboard.length && pasteTarget) {
    event.preventDefault();

    const sortedClipboard = [...clipboard].sort((first, second) =>
      first.date.localeCompare(second.date) || first.start.localeCompare(second.start)
    );
    const firstSourceDate = new Date(`${sortedClipboard[0].date}T12:00:00`);
    const destinationDate = new Date(`${pasteTarget.date}T12:00:00`);
    const dayOffset = Math.round((destinationDate - firstSourceDate) / 86400000);

    const candidates = sortedClipboard.map((source, index) => {
      const targetDate = new Date(`${source.date}T12:00:00`);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      return {
        ...source,
        id: crypto.randomUUID(),
        room: pasteTarget.room,
        date: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`
      };
    });

    const simulated = [...shifts];

    for (const candidate of candidates) {
      if (roomHasConflict(candidate, null, simulated)) {
        showToast("Orari non compatibili");
        return;
      }
      simulated.push(candidate);
    }

    shifts.push(...candidates);
    saveShifts();
    upsertRemote(candidates);
    selectedShiftIds = new Set(candidates.map(candidate => candidate.id));
    shiftAnchorId = candidates[0]?.id || null;
    pasteTarget = null;
    render();
    showToast(`${candidates.length} turno/i incollato/i`);
  }

  if (event.key === "Escape") {
    selectedShiftIds.clear();
    pasteTarget = null;
    shiftAnchorId = null;
    render();
  }
});

populateSelects();
render();
loadRemoteShifts();
enableRealtime();
