
const ROOMS = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `sala-${i + 1}`,
    label: `Sala ${i + 1}`
  })),
  { id: "remoto-grafica", label: "Grafica remoto" },
  { id: "remoto-sound", label: "Sound remoto" }
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

const STORAGE_KEY = "dvs-planning-build-3";
let currentMonth = new Date(2026, 6, 1);
let editingId = null;
let selectedId = null;

const seedShifts = [
  { id:"1", room:"sala-1", date:"2026-07-01", production:"RAI", film:"VITA IN DIRETTA", start:"08:00", end:"16:00", workType:"EDIT", editor:"Marco D.", status:"definitivo", color:"amber" },
  { id:"2", room:"sala-1", date:"2026-07-02", production:"RAI", film:"VITA IN DIRETTA", start:"08:00", end:"16:00", workType:"EDIT", editor:"Valentina R.", status:"definitivo", color:"amber" },
  { id:"3", room:"sala-2", date:"2026-07-01", production:"CATTLEYA", film:"DOC - NELLE TUE MANI 4", start:"10:00", end:"18:00", workType:"EDIT", editor:"", status:"provvisorio", color:"violet" },
  { id:"4", room:"sala-3", date:"2026-07-01", production:"NETFLIX", film:"LUPIN - STAGIONE 4", start:"09:00", end:"17:00", workType:"EDIT", editor:"Luca M.", status:"definitivo", color:"green" },
  { id:"5", room:"sala-3", date:"2026-07-01", production:"NETFLIX", film:"LUPIN - STAGIONE 4", start:"17:00", end:"24:00", workType:"ASSISTENTE", editor:"Barbara C.", status:"definitivo", color:"green" },
  { id:"6", room:"sala-4", date:"2026-07-03", production:"FREMANTLE", film:"ITALIA'S GOT TALENT", start:"08:30", end:"16:30", workType:"EDIT", editor:"Davide G.", status:"definitivo", color:"red" },
  { id:"7", room:"sala-5", date:"2026-07-04", production:"BANIJAY", film:"PECHINO EXPRESS", start:"09:30", end:"17:30", workType:"EDIT", editor:"Giulia C.", status:"definitivo", color:"cyan" },
  { id:"8", room:"sala-6", date:"2026-07-06", production:"DISCOVERY", film:"SURVIVOR ITALIA", start:"10:00", end:"18:00", workType:"EDIT", editor:"Marco R.", status:"definitivo", color:"orange" },
  { id:"9", room:"sala-7", date:"2026-07-07", production:"RAI", film:"UNOMATTINA", start:"08:00", end:"16:00", workType:"EDIT", editor:"Barbara E.", status:"definitivo", color:"pink" },
  { id:"10", room:"sala-8", date:"2026-07-08", production:"CATTLEYA", film:"GOMORRA - STAGIONE 6", start:"09:00", end:"17:00", workType:"COLOR", editor:"Stefano R.", status:"definitivo", color:"violet" },
  { id:"11", room:"sala-9", date:"2026-07-09", production:"AMAZON PRIME", film:"CELEBRITY HUNTED", start:"10:00", end:"18:00", workType:"COLOR", editor:"Francesca N.", status:"definitivo", color:"lime" },
  { id:"12", room:"sala-10", date:"2026-07-10", production:"DVS", film:"SPOT ISTITUZIONALE", start:"08:00", end:"17:00", workType:"SOUND DESIGN", editor:"Lorenzo C.", status:"definitivo", color:"blue" },
  { id:"13", room:"remoto-grafica", date:"2026-07-02", production:"RAI", film:"VITA IN DIRETTA", start:"09:00", end:"17:00", workType:"GRAFICA", editor:"Giulia C.", status:"definitivo", color:"coral" }
];

let shifts = loadShifts();

const planningGrid = document.getElementById("planningGrid");
const monthLabel = document.getElementById("monthLabel");
const dialog = document.getElementById("shiftDialog");
const form = document.getElementById("shiftForm");
const formError = document.getElementById("formError");
const roomSelect = document.getElementById("room");
const colorSelect = document.getElementById("color");

function loadShifts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedShifts);
  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(seedShifts);
  }
}

function saveShifts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
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

function timeToMinutes(value) {
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

function editorConflict(shift) {
  if (!shift.editor) return false;
  return shifts.some(other =>
    other.id !== shift.id
    && other.date === shift.date
    && other.editor.trim().toLowerCase() === shift.editor.trim().toLowerCase()
    && overlaps(other, shift)
  );
}

function renderCard(shift) {
  const color = FILM_COLORS[shift.color] || FILM_COLORS.blue;
  const warning = editorConflict(shift);

  return `
    <article
      class="shift-card ${shift.status} ${selectedId === shift.id ? "selected" : ""}"
      data-id="${shift.id}"
      style="--accent-rgb:${color.rgb}"
      title="Clicca per modificare">
      <div class="shift-main">
        <div class="shift-production">${escapeHtml(shift.production)}</div>
        <div class="shift-time">${shift.start} – ${shift.end}</div>
        <div class="shift-film">${escapeHtml(shift.film)}</div>
        <div class="shift-type">${escapeHtml(shift.workType)}</div>
      </div>
      <div class="shift-editor">
        <span class="editor-name">${escapeHtml(shift.editor || "Da assegnare")}</span>
        ${warning ? '<span class="editor-warning" title="Montatore presente su più turni sovrapposti">▲</span>' : ""}
      </div>
    </article>
  `;
}

function renderPlanning() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const totalDays = daysInMonth(currentMonth);

  monthLabel.textContent = monthName(currentMonth);
  planningGrid.style.setProperty("--days", totalDays);
  planningGrid.innerHTML = `<div class="corner">SALE</div>`;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const weekday = new Intl.DateTimeFormat("it-IT", { weekday: "short" })
      .format(date)
      .replace(".", "")
      .toUpperCase();
    const weekend = [0, 6].includes(date.getDay());
    const weekStart = date.getDay() === 1 && day !== 1;

    planningGrid.insertAdjacentHTML("beforeend", `
      <div class="day-head ${weekend ? "weekend" : ""} ${weekStart ? "week-start" : ""}">
        <span class="dow">${weekday}</span>
        <span class="num">${String(day).padStart(2, "0")}</span>
      </div>
    `);
  }

  ROOMS.forEach((room, roomIndex) => {
    if (GROUPS[roomIndex]) {
      planningGrid.insertAdjacentHTML(
        "beforeend",
        `<div class="group-row">${GROUPS[roomIndex]}</div>`
      );
    }

    let maxTurnsInDay = 1;
    for (let day = 1; day <= totalDays; day++) {
      const date = isoDate(year, month, day);
      const count = shifts.filter(shift =>
        shift.room === room.id && shift.date === date
      ).length;
      maxTurnsInDay = Math.max(maxTurnsInDay, count);
    }

    const rowHeight = Math.max(
      96,
      maxTurnsInDay * (86 + 5) + 10
    );

    planningGrid.insertAdjacentHTML("beforeend", `
      <div class="room-label" style="--row-height:${rowHeight}px">
        ${room.label}
      </div>
    `);

    for (let day = 1; day <= totalDays; day++) {
      const dateObject = new Date(year, month, day);
      const date = isoDate(year, month, day);
      const weekend = [0, 6].includes(dateObject.getDay());
      const weekStart = dateObject.getDay() === 1 && day !== 1;

      const dayShifts = shifts
        .filter(shift => shift.room === room.id && shift.date === date)
        .sort((a, b) => a.start.localeCompare(b.start));

      planningGrid.insertAdjacentHTML("beforeend", `
        <div
          class="planning-cell ${weekend ? "weekend" : ""} ${weekStart ? "week-start" : ""}"
          style="--row-height:${rowHeight}px"
          data-room="${room.id}"
          data-date="${date}">
          ${dayShifts.map(renderCard).join("")}
          ${dayShifts.length ? "" : '<span class="cell-add-hint">+ turno</span>'}
        </div>
      `);
    }
  });

  bindPlanningEvents();
}

function bindPlanningEvents() {
  document.querySelectorAll(".shift-card").forEach(card => {
    card.addEventListener("click", event => {
      event.stopPropagation();
      selectedId = card.dataset.id;
      openEditDialog(card.dataset.id);
    });
  });

  document.querySelectorAll(".planning-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      selectedId = null;
      openNewDialog(cell.dataset.room, cell.dataset.date);
    });
  });
}

function fillSelects() {
  roomSelect.innerHTML = ROOMS
    .map(room => `<option value="${room.id}">${room.label}</option>`)
    .join("");

  colorSelect.innerHTML = Object.entries(FILM_COLORS)
    .map(([value, item]) => `<option value="${value}">${item.label}</option>`)
    .join("");
}

function resetForm(shift = {}) {
  document.getElementById("shiftId").value = shift.id || "";
  document.getElementById("production").value = shift.production || "";
  document.getElementById("film").value = shift.film || "";
  document.getElementById("date").value = shift.date || "";
  document.getElementById("room").value = shift.room || "sala-1";
  document.getElementById("start").value = shift.start || "08:00";
  document.getElementById("end").value = shift.end || "16:00";
  document.getElementById("workType").value = shift.workType || "EDIT";
  document.getElementById("editor").value = shift.editor || "";
  document.getElementById("status").value = shift.status || "definitivo";
  document.getElementById("color").value = shift.color || "blue";
  formError.textContent = "";
}

function openNewDialog(room = "sala-1", date = "") {
  editingId = null;
  document.getElementById("dialogTitle").textContent = "Nuovo turno";
  document.getElementById("deleteShiftBtn").classList.add("hidden");
  resetForm({
    room,
    date: date || isoDate(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    )
  });
  dialog.showModal();
}

function openEditDialog(id) {
  const shift = shifts.find(item => item.id === id);
  if (!shift) return;

  editingId = id;
  document.getElementById("dialogTitle").textContent = "Modifica turno";
  document.getElementById("deleteShiftBtn").classList.remove("hidden");
  resetForm(shift);
  dialog.showModal();
}

function closeDialog() {
  dialog.close();
  formError.textContent = "";
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const candidate = {
    id: editingId || crypto.randomUUID(),
    room: document.getElementById("room").value,
    date: document.getElementById("date").value,
    production: document.getElementById("production").value.trim().toUpperCase(),
    film: document.getElementById("film").value.trim().toUpperCase(),
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    workType: document.getElementById("workType").value,
    editor: document.getElementById("editor").value.trim(),
    status: document.getElementById("status").value,
    color: document.getElementById("color").value
  };

  if (timeToMinutes(candidate.end) <= timeToMinutes(candidate.start)) {
    formError.textContent = "Orari non compatibili.";
    return;
  }

  if (roomConflict(candidate, editingId)) {
    formError.textContent = "Orari non compatibili: la sala contiene già un turno sovrapposto.";
    return;
  }

  if (editingId) {
    const index = shifts.findIndex(item => item.id === editingId);
    shifts[index] = candidate;
  } else {
    shifts.push(candidate);
  }

  saveShifts();
  selectedId = candidate.id;
  closeDialog();
  renderPlanning();
});

document.getElementById("deleteShiftBtn").addEventListener("click", () => {
  if (!editingId) return;
  if (!confirm("Eliminare questo turno?")) return;

  shifts = shifts.filter(item => item.id !== editingId);
  saveShifts();
  selectedId = null;
  closeDialog();
  renderPlanning();
});

document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialogBtn").addEventListener("click", closeDialog);

document.getElementById("newShiftBtn").addEventListener("click", () => {
  openNewDialog();
});

document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );
  renderPlanning();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1
  );
  renderPlanning();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  const now = new Date();
  currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  renderPlanning();
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

fillSelects();
renderPlanning();
