const MANUAL_TODOS_KEY="wall-dashboard-manual-todos";
const MAX_MANUAL_TODOS=30;
const SWIPE_DELETE_THRESHOLD=110;
const SWIPE_MAX_TRANSLATE=140;
const SWIPE_START_THRESHOLD=8;

let manualTodosState=[];
let manualTodoDomBound=false;
let activeSwipe=null;

function escapeTodoHtml(text){
  if(typeof text!=="string")return "";
  const div=document.createElement("div");
  div.textContent=text;
  return div.innerHTML;
}

function readManualTodos(){
  try{
    const raw=localStorage.getItem(MANUAL_TODOS_KEY);
    if(!raw)return [];
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return [];
    return parsed
      .filter(item=>item&&typeof item.text==="string")
      .slice(0,MAX_MANUAL_TODOS)
      .map(item=>({
        id:String(item.id||`${Date.now()}-${Math.random().toString(16).slice(2)}`),
        text:item.text.trim().slice(0,120),
        checked:Boolean(item.checked)
      }))
      .filter(item=>item.text.length>0);
  }catch(err){
    console.warn("Unable to read manual tasks",err);
    return [];
  }
}

function writeManualTodos(){
  try{
    localStorage.setItem(MANUAL_TODOS_KEY,JSON.stringify(manualTodosState));
  }catch(err){
    console.warn("Unable to save manual tasks",err);
  }
}

function renderManualTodos(){
  const container=document.getElementById("manualTodosGrid");
  if(!container)return;

  if(!manualTodosState.length){
    container.innerHTML="<div class='loading'>No tasks yet</div>";
    return;
  }

  container.innerHTML=manualTodosState.map(item=>{
    const safeText=escapeTodoHtml(item.text);
    const checkedClass=item.checked?"is-checked":"";
    const checkedAttr=item.checked?"checked":"";
    return `<label class="manual-todo-item ${checkedClass}" data-todo-id="${item.id}">
      <input type="checkbox" data-todo-id="${item.id}" ${checkedAttr}>
      <span class="manual-todo-text">${safeText}</span>
    </label>`;
  }).join("");
}

function addManualTodo(text){
  const normalized=(text||"").trim();
  if(!normalized)return;
  if(manualTodosState.length>=MAX_MANUAL_TODOS){
    manualTodosState=manualTodosState.slice(-MAX_MANUAL_TODOS+1);
  }
  manualTodosState.push({
    id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text:normalized.slice(0,120),
    checked:false
  });
  writeManualTodos();
  renderManualTodos();
}

function toggleManualTodo(id, checked){
  manualTodosState=manualTodosState.map(item=>{
    if(item.id!==id)return item;
    return {...item, checked:Boolean(checked)};
  });
  writeManualTodos();
  renderManualTodos();
}

function deleteManualTodo(id){
  manualTodosState=manualTodosState.filter(item=>item.id!==id);
  writeManualTodos();
  renderManualTodos();
}

function resetSwipeRow(row){
  if(!row)return;
  row.style.transform="";
  row.classList.remove("is-swiping");
}

function handleSwipeStart(event, list){
  const target=event.target;
  if(!(target instanceof HTMLElement))return;
  if(target.closest("input[type='checkbox']"))return;
  const row=target.closest(".manual-todo-item");
  if(!row||!(row instanceof HTMLElement)||!list.contains(row))return;

  const touch=event.touches[0];
  if(!touch)return;

  resetSwipeRow(activeSwipe?.row);
  activeSwipe={
    row,
    todoId:row.dataset.todoId||"",
    startX:touch.clientX,
    startY:touch.clientY,
    lastX:touch.clientX,
    hasHorizontalIntent:false
  };
}

function handleSwipeMove(event){
  if(!activeSwipe)return;
  const touch=event.touches[0];
  if(!touch)return;

  const dx=touch.clientX-activeSwipe.startX;
  const dy=touch.clientY-activeSwipe.startY;
  activeSwipe.lastX=touch.clientX;

  if(!activeSwipe.hasHorizontalIntent){
    if(Math.abs(dx)<SWIPE_START_THRESHOLD&&Math.abs(dy)<SWIPE_START_THRESHOLD)return;
    if(Math.abs(dy)>=Math.abs(dx)){
      resetSwipeRow(activeSwipe.row);
      activeSwipe=null;
      return;
    }
    activeSwipe.hasHorizontalIntent=true;
  }

  if(dx>=0){
    activeSwipe.row.style.transform="translateX(0)";
    activeSwipe.row.classList.remove("is-swiping");
    return;
  }

  event.preventDefault();
  const translate=Math.max(dx,-SWIPE_MAX_TRANSLATE);
  activeSwipe.row.style.transform=`translateX(${translate}px)`;
  activeSwipe.row.classList.add("is-swiping");
}

function handleSwipeEnd(){
  if(!activeSwipe)return;
  const swipeDistance=activeSwipe.startX-activeSwipe.lastX;
  const {row,todoId}=activeSwipe;
  activeSwipe=null;

  if(swipeDistance>=SWIPE_DELETE_THRESHOLD&&todoId){
    row.style.transform=`translateX(-${SWIPE_MAX_TRANSLATE}px)`;
    row.style.opacity="0";
    setTimeout(()=>{
      deleteManualTodo(todoId);
    },120);
    return;
  }

  resetSwipeRow(row);
}

function loadTodos(){
  if(manualTodoDomBound)return;
  manualTodoDomBound=true;
  manualTodosState=readManualTodos();
  renderManualTodos();

  const form=document.getElementById("manualTodoForm");
  const input=document.getElementById("manualTodoInput");
  const list=document.getElementById("manualTodosGrid");

  if(form&&input){
    form.addEventListener("submit",event=>{
      event.preventDefault();
      addManualTodo(input.value);
      input.value="";
      input.focus();
    });
  }

  if(list){
    list.addEventListener("change",event=>{
      const target=event.target;
      if(!(target instanceof HTMLInputElement))return;
      if(target.type!=="checkbox")return;
      const id=target.dataset.todoId;
      if(!id)return;
      toggleManualTodo(id,target.checked);
    });

    list.addEventListener("touchstart",event=>{
      handleSwipeStart(event,list);
    },{passive:true});
    list.addEventListener("touchmove",event=>{
      handleSwipeMove(event);
    },{passive:false});
    list.addEventListener("touchend",()=>{
      handleSwipeEnd();
    },{passive:true});
    list.addEventListener("touchcancel",()=>{
      handleSwipeEnd();
    },{passive:true});
  }
}
