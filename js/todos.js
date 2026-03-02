// TODOS – detect Docs checklists and Unicode marks
const TODOS_CACHE_KEY="wall-dashboard-todos-cache";
const DEFAULT_TODO_DOC_URL="https://docs.google.com/document/d/e/2PACX-1vQ3c5d6aalilb8iHsKSVXs6GDRo2UULnQoQWUBiiGZeoym3oDXmCYz-_AKJJ19UIwXex-3Cqv7QjHoE/pub";

function getTodoDocUrl(){
  return window.DASHBOARD_CONFIG?.todoDocumentUrl||DEFAULT_TODO_DOC_URL;
}

function escapeTodoHtml(text){
  if(typeof text!=="string")return "";
  const div=document.createElement("div");
  div.textContent=text;
  return div.innerHTML;
}

function readCachedTodos(){
  try{
    const raw=localStorage.getItem(TODOS_CACHE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return null;
    return parsed.filter(item=>item&&typeof item.text==="string").slice(0,20);
  }catch(err){
    console.warn("Unable to read cached tasks",err);
    return null;
  }
}

function writeCachedTodos(items){
  try{
    localStorage.setItem(TODOS_CACHE_KEY,JSON.stringify(items));
  }catch(err){
    console.warn("Unable to cache tasks",err);
  }
}

function renderTodos(container, items){
  if(!container)return;
  if(!Array.isArray(items)||items.length===0){
    container.innerHTML="<div class='loading'>No tasks</div>";
    return;
  }

  container.innerHTML=items.map(t=>{
    const safeText=escapeTodoHtml(t.text);
    const checkedAttr=t.checked ? "checked" : "";
    const styleAttr=t.checked ? "text-decoration:line-through;color:var(--text-dim);" : "";
    return `<div class='todo-item'>
      <input type="checkbox" ${checkedAttr} disabled>
      <label style="flex:1;${styleAttr}">${safeText}</label>
    </div>`;
  }).join("");
}

async function loadTodos(){
  const c=document.getElementById("todosGrid");
  try{
    const html=await fetchRaw(getTodoDocUrl());
    if(!html){
      const cachedItems=readCachedTodos();
      if(cachedItems){
        renderTodos(c,cachedItems);
        return;
      }
      c.innerHTML="<div class='loading'>Unable to load tasks</div>";
      return;
    }
    const doc=new DOMParser().parseFromString(html,"text/html");
    const rawItems=[...doc.querySelectorAll("li,p")].filter(e=>e.textContent.trim().length>0);
    if(!rawItems.length){
      renderTodos(c,[]);
      writeCachedTodos([]);
      return;
    }

    const parsed=rawItems.slice(0,20).map(e=>{
      const htmlContent=e.innerHTML;
      const text=e.textContent.trim();
      let checked=false;
      if(/☑|✓|✔|✅/.test(text)) checked=true;
      if(/(check(?!box)?[^"'>]*\.(png|svg))/i.test(htmlContent)&&!/blank/i.test(htmlContent)) checked=true;
      const cleanText=text.replace(/^[☑☐✓✔✅]\s*/,'').trim();
      return{ text:cleanText, checked };
    });
    renderTodos(c,parsed);
    writeCachedTodos(parsed);
  }catch(err){
    console.error(err);
    const cachedItems=readCachedTodos();
    if(cachedItems){
      renderTodos(c,cachedItems);
      return;
    }
    c.innerHTML="<div class='loading'>Error loading tasks</div>";
  }
}
