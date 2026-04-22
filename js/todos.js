const MANUAL_TODOS_KEY="wall-dashboard-manual-todos";
const MAX_MANUAL_TODOS=30;

let manualTodosState=[];
let manualTodoDomBound=false;

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
    container.innerHTML="<div class='loading'>No manual tasks yet</div>";
    return;
  }

  container.innerHTML=manualTodosState.map(item=>{
    const safeText=escapeTodoHtml(item.text);
    const checkedClass=item.checked?"is-checked":"";
    const checkedAttr=item.checked?"checked":"";
    return `<label class="manual-todo-item ${checkedClass}">
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
  }
}
