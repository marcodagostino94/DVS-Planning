
const rooms = Array.from({length:15},(_,i)=>({id:`sala-${i+1}`,label:`Sala ${i+1}`}))
  .concat([{id:"grafica",label:"Grafica remoto"},{id:"sound",label:"Sound remoto"}]);

const groups = {0:"CHINOTTO 1",5:"CHINOTTO 2",10:"CARSO 3",15:"LAVORAZIONI DA REMOTO"};

const colors = {
  RAI:"#e7b92f",
  CATTLEYA:"#8357d8",
  DVS:"#2384d7",
  SKY:"#50a36f",
  NETFLIX:"#c83b45"
};

let current = new Date(2026,6,1);
let selected = new Set();
let selectedCell = null;
let clipboard = [];
let editingId = null;
let draggedId = null;

let shifts = JSON.parse(localStorage.getItem("dvs-planning-2")) || [
{id:"1",room:"sala-1",date:"2026-07-01",client:"RAI",start:"08:00",end:"16:00",program:"VITA IN DIRETTA",workType:"EDIT",editor:"MARCO D.",status:"definitivo"},
{id:"2",room:"sala-1",date:"2026-07-02",client:"RAI",start:"08:00",end:"16:00",program:"VITA IN DIRETTA",workType:"EDIT",editor:"VALENTINA R.",status:"definitivo"},
{id:"3",room:"sala-2",date:"2026-07-01",client:"CATTLEYA",start:"10:00",end:"18:00",program:"FILM 2",workType:"EDIT",editor:"",status:"provvisorio"},
{id:"4",room:"sala-3",date:"2026-07-01",client:"RAI",start:"08:00",end:"16:00",program:"SERVIZIO SPECIALE",workType:"ASSISTENTE",editor:"ALESSANDRA P.",status:"definitivo"},
{id:"5",room:"sala-3",date:"2026-07-01",client:"RAI",start:"16:00",end:"24:00",program:"SERVIZIO SPECIALE",workType:"EDIT",editor:"BARBARA C.",status:"definitivo"},
{id:"6",room:"sala-4",date:"2026-07-03",client:"DVS",start:"12:00",end:"20:00",program:"DOCUMENTARIO",workType:"COLOR",editor:"LUCA V.",status:"definitivo"},
{id:"7",room:"sala-7",date:"2026-07-06",client:"SKY",start:"10:00",end:"18:00",program:"SPORT WEEK",workType:"EDIT",editor:"MARCO D.",status:"definitivo"},
{id:"8",room:"sala-10",date:"2026-07-07",client:"NETFLIX",start:"10:00",end:"18:00",program:"SERIE TV",workType:"EDIT",editor:"MARCO D.",status:"definitivo"},
{id:"9",room:"grafica",date:"2026-07-02",client:"RAI",start:"09:00",end:"17:00",program:"VITA IN DIRETTA",workType:"GRAFICA",editor:"GIULIA C.",status:"definitivo"},
{id:"10",room:"sound",date:"2026-07-03",client:"DVS",start:"10:00",end:"18:00",program:"DOCUMENTARIO",workType:"SOUND DESIGN",editor:"ANDREA S.",status:"definitivo"}
];

const board = document.getElementById("board");
const dialog = document.getElementById("editDialog");
const form = document.getElementById("shiftForm");
const roomSelect = document.getElementById("room");
const toast = document.getElementById("toast");

rooms.forEach(r=>roomSelect.insertAdjacentHTML("beforeend",`<option value="${r.id}">${r.label}</option>`));

function save(){localStorage.setItem("dvs-planning-2",JSON.stringify(shifts))}
function iso(y,m,d){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function monthDays(d){return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}
function monthName(d){return new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(d)}
function mins(v){const [h,m]=v.split(":").map(Number);return h*60+m}
function overlap(a,b){return mins(a.start)<mins(b.end)&&mins(b.start)<mins(a.end)}
function colorFor(s){return colors[s.client] || "#3d8c76"}
function showToast(t){toast.textContent=t;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1600)}

function personConflict(s){
  if(!s.editor)return false;
  return shifts.some(o=>o.id!==s.id&&o.date===s.date&&o.editor===s.editor&&overlap(s,o));
}

function card(s){
  const warning=personConflict(s);
  return `<article class="shift-card ${s.status} ${selected.has(s.id)?"selected":""}" draggable="true" data-id="${s.id}" style="--shift:${colorFor(s)}">
    <div class="shift-body">
      <div class="shift-client">${s.client}</div>
      <div class="shift-time">${s.start} - ${s.end}</div>
      <div class="shift-program">${s.program}</div>
      <div class="shift-type">${s.workType}</div>
    </div>
    <div class="shift-editor">
      <span class="editor-name">${s.editor || "—"}</span>
      ${warning?'<span class="warning" title="Montatore presente su più turni sovrapposti">▲</span>':""}
    </div>
  </article>`
}

function render(){
  const y=current.getFullYear(),m=current.getMonth(),days=monthDays(current);
  document.getElementById("monthName").textContent=monthName(current);
  board.style.setProperty("--days",days);
  board.innerHTML='<div class="corner">SALA</div>';

  for(let d=1;d<=days;d++){
    const dt=new Date(y,m,d), dow=new Intl.DateTimeFormat("it-IT",{weekday:"short"}).format(dt).toUpperCase().replace(".","");
    const weekend=[0,6].includes(dt.getDay());
    const divider=dt.getDay()===1&&d!==1;
    board.insertAdjacentHTML("beforeend",`<div class="day-head ${weekend?"weekend":""} ${divider?"week-divider":""}">${dow} ${String(d).padStart(2,"0")}</div>`);
  }

  rooms.forEach((r,idx)=>{
    if(groups[idx])board.insertAdjacentHTML("beforeend",`<div class="section-row">${groups[idx]}</div>`);
    let max=1;
    for(let d=1;d<=days;d++){
      const date=iso(y,m,d);
      max=Math.max(max,shifts.filter(s=>s.room===r.id&&s.date===date).length);
    }
    const rowH=Math.max(78,max*78);
    board.insertAdjacentHTML("beforeend",`<div class="room-label" style="--row-h:${rowH}px"><div>${r.label}</div></div>`);
    for(let d=1;d<=days;d++){
      const dt=new Date(y,m,d),date=iso(y,m,d),weekend=[0,6].includes(dt.getDay()),divider=dt.getDay()===1&&d!==1;
      const list=shifts.filter(s=>s.room===r.id&&s.date===date).sort((a,b)=>a.start.localeCompare(b.start));
      board.insertAdjacentHTML("beforeend",`<div class="cell ${weekend?"weekend":""} ${divider?"week-divider":""}" style="--row-h:${rowH}px" data-room="${r.id}" data-date="${date}">
        ${list.map(card).join("")}${list.length?"":'<span class="empty-hint">+ turno</span>'}
      </div>`);
    }
  });
  bind();
}

function bind(){
  document.querySelectorAll(".shift-card").forEach(el=>{
    el.addEventListener("click",e=>{
      e.stopPropagation();
      const id=el.dataset.id;
      if(e.shiftKey&&selected.size){
        const anchor=shifts.find(s=>selected.has(s.id));
        const target=shifts.find(s=>s.id===id);
        if(anchor&&target&&anchor.room===target.room){
          const roomItems=shifts.filter(s=>s.room===anchor.room).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
          const a=roomItems.findIndex(s=>s.id===anchor.id),b=roomItems.findIndex(s=>s.id===id);
          roomItems.slice(Math.min(a,b),Math.max(a,b)+1).forEach(s=>selected.add(s.id));
        }
      }else{
        selected.clear();
        selected.add(id);
      }
      selectedCell=null;
      render();
    });
    el.addEventListener("dblclick",e=>{e.stopPropagation();openEdit(el.dataset.id)});
    el.addEventListener("dragstart",()=>{draggedId=el.dataset.id;el.classList.add("dragging")});
  });
  document.querySelectorAll(".cell").forEach(cell=>{
    cell.addEventListener("click",()=>{
      selected.clear();
      selectedCell={room:cell.dataset.room,date:cell.dataset.date};
      render();
      document.querySelector(`.cell[data-room="${selectedCell.room}"][data-date="${selectedCell.date}"]`)?.classList.add("selected-target");
    });
    cell.addEventListener("dblclick",()=>openNew(cell.dataset.room,cell.dataset.date));
    cell.addEventListener("dragover",e=>e.preventDefault());
    cell.addEventListener("drop",e=>{
      e.preventDefault();
      const s=shifts.find(x=>x.id===draggedId); if(!s)return;
      const candidate={...s,room:cell.dataset.room,date:cell.dataset.date};
      if(hasRoomConflict(candidate,s.id)){showToast("Orari non compatibili");return}
      s.room=candidate.room;s.date=candidate.date;save();render();showToast("Turno spostato");
    });
  });
}

function hasRoomConflict(candidate,excludeId=null){
  return shifts.some(o=>o.id!==excludeId&&o.room===candidate.room&&o.date===candidate.date&&overlap(candidate,o));
}

function openNew(room="sala-1",date=iso(current.getFullYear(),current.getMonth(),1)){
  editingId=null;
  document.getElementById("dialogTitle").textContent="Nuovo turno";
  document.getElementById("deleteBtn").style.display="none";
  fill({room,date,client:"RAI",program:"",start:"08:00",end:"16:00",workType:"EDIT",editor:"",status:"definitivo"});
  dialog.showModal();
}
function openEdit(id){
  editingId=id;
  const s=shifts.find(x=>x.id===id);if(!s)return;
  document.getElementById("dialogTitle").textContent="Modifica turno";
  document.getElementById("deleteBtn").style.display="";
  fill(s);dialog.showModal();
}
function fill(s){
  client.value=s.client||"";program.value=s.program||"";date.value=s.date||"";room.value=s.room||"sala-1";
  start.value=s.start||"08:00";end.value=s.end||"16:00";workType.value=s.workType||"EDIT";editor.value=s.editor||"";status.value=s.status||"definitivo";
}
form.addEventListener("submit",e=>{
  e.preventDefault();
  const payload={id:editingId||String(Date.now()),client:client.value.trim().toUpperCase(),program:program.value.trim().toUpperCase(),date:date.value,room:room.value,start:start.value,end:end.value,workType:workType.value,editor:editor.value.trim().toUpperCase(),status:status.value};
  if(mins(payload.end)<=mins(payload.start)){showToast("Orari non compatibili");return}
  if(hasRoomConflict(payload,editingId)){showToast("Orari non compatibili");return}
  if(editingId){const i=shifts.findIndex(s=>s.id===editingId);shifts[i]=payload}else shifts.push(payload);
  save();dialog.close();render();showToast(editingId?"Turno modificato":"Turno creato");
});
deleteBtn.addEventListener("click",()=>{if(!editingId)return;if(confirm("Eliminare questo turno?")){shifts=shifts.filter(s=>s.id!==editingId);save();dialog.close();render()}});
closeDialog.addEventListener("click",()=>dialog.close());
cancelBtn.addEventListener("click",()=>dialog.close());
newShift.addEventListener("click",()=>openNew());
prevMonth.addEventListener("click",()=>{current=new Date(current.getFullYear(),current.getMonth()-1,1);render()});
nextMonth.addEventListener("click",()=>{current=new Date(current.getFullYear(),current.getMonth()+1,1);render()});

document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="c"&&selected.size){
    e.preventDefault();
    clipboard=[...selected].map(id=>({...shifts.find(s=>s.id===id)}));
    showToast(`${clipboard.length} turno/i copiato/i`);
  }
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="v"&&clipboard.length&&selectedCell){
    e.preventDefault();
    const baseDate=new Date(clipboard[0].date+"T00:00:00");
    const targetDate=new Date(selectedCell.date+"T00:00:00");
    const delta=(targetDate-baseDate)/86400000;
    const created=[];
    for(const src of clipboard){
      const d=new Date(src.date+"T00:00:00"); d.setDate(d.getDate()+delta);
      const candidate={...src,id:String(Date.now()+Math.random()),room:selectedCell.room,date:d.toISOString().slice(0,10)};
      if(hasRoomConflict(candidate)){showToast("Orari non compatibili");return}
      created.push(candidate);
    }
    shifts.push(...created);save();render();showToast(`${created.length} turno/i incollato/i`);
  }
  if(e.key==="Escape"){selected.clear();selectedCell=null;render()}
});

render();
