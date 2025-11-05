// TODOS – detect Docs checklists and Unicode marks
async function loadTodos(){
  const c=document.getElementById("todosGrid");
  try{
    const html=await fetchRaw(TODO_DOC);
    if(!html){c.innerHTML="<div class='loading'>Unable to load tasks</div>";return;}
    const doc=new DOMParser().parseFromString(html,"text/html");
    const rawItems=[...doc.querySelectorAll("li,p")].filter(e=>e.textContent.trim().length>0);
    if(!rawItems.length){c.innerHTML="<div class='loading'>No tasks</div>";return;}

    const parsed=rawItems.slice(0,20).map(e=>{
      const htmlContent=e.innerHTML;
      const text=e.textContent.trim();
      let checked=false;
      if(/☑|✓|✔|✅/.test(text)) checked=true;
      if(/(check(?!box)?[^"'>]*\.(png|svg))/i.test(htmlContent)&&!/blank/i.test(htmlContent)) checked=true;
      const cleanText=text.replace(/^[☑☐✓✔✅]\s*/,'').trim();
      return{ text:cleanText, checked };
    });

    // HTML sanitization helper
    function escapeHtml(text) {
      if (typeof text !== 'string') return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    c.innerHTML=parsed.map(t=>{
      const safeText = escapeHtml(t.text);
      const checkedAttr = t.checked ? "checked" : "";
      const styleAttr = t.checked ? "text-decoration:line-through;color:var(--text-dim);" : "";
      return `<div class='todo-item'>
        <input type="checkbox" ${checkedAttr} disabled>
        <label style="flex:1;${styleAttr}">${safeText}</label>
      </div>`;
    }).join("");
  }catch(err){console.error(err);c.innerHTML="<div class='loading'>Error loading tasks</div>";}
}

