// CSV PARSER
function normalizeHeader(h){return h.replace(/^\uFEFF/,"").replace(/[^\x20-\x7E]/g,"").trim().replace(/^"(.*)"$/,"$1").toLowerCase();}
function detectDelimiter(line){const c=(line.match(/,/g)||[]).length,s=(line.match(/;/g)||[]).length;return s>c?";":",";}
function parseCSV(text){
  let t=text.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const lines=t.split("\n").filter(l=>l.trim().length>0);
  if(lines.length===0)return{headers:[],rows:[]};
  const d=detectDelimiter(lines[0]);
  const parse=(line)=>{const out=[];let cur="",q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch=='"'){if(q&&line[i+1]=='"'){cur+='"';i++;}else q=!q;}else if(ch===d&&!q){out.push(cur);cur="";}else cur+=ch;}out.push(cur);return out.map(s=>s.replace(/^"(.*)"$/,"$1"));};
  return{headers:parse(lines[0]).map(normalizeHeader),rows:lines.slice(1).map(parse)};
}

// MARKETS
async function loadMarkets(){
  const c=document.getElementById("marketsGrid");
  c.innerHTML="<div class='loading'>Loading...</div>";
  try{
    let csv=await fetchRaw(STOCKS_CSV);
    if(!csv){c.innerHTML="<div class='loading'>No stock data</div>";return;}
    const base64match=csv.match(/^data:text\/csv;base64,([A-Za-z0-9+/=]+)/);
    if(base64match){try{csv=atob(base64match[1]);}catch(e){console.warn("decode fail",e);}}
    const parsed=parseCSV(csv);
    const h=parsed.headers; const ni=h.indexOf("name"),pi=h.indexOf("price");
    if(ni===-1||pi===-1){c.innerHTML="<div class='loading'>CSV missing Name/Price</div>";return;}
    const cards=parsed.rows.map(r=>{
      const n=(r[ni]||"").trim(),p=(r[pi]||"").trim();
      if(!n)return"";return`<div class='market-card'><div class='market-name'>${n}</div><div class='market-price'>$${p||"—"}</div></div>`;
    }).join("");
    c.innerHTML=cards||"<div class='loading'>No rows</div>";
  }catch(e){console.error(e);c.innerHTML="<div class='loading'>Error loading stock data</div>";}
}

