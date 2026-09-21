import { topics, resources, verifiedDate } from './data.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escape = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  route:'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h5"/>',
  book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  arrowRight:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  arrowUpRight:'<path d="M6 18 18 6M6 6h12v12"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  circle:'<circle cx="12" cy="12" r="8"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  binary:'<rect x="4" y="6" width="5" height="12" rx="2"/><path d="m14 7 3-1v12m-3 0h6"/>',
  plus:'<path d="M12 4v16M4 12h16"/>', multiply:'<path d="m6 6 12 12M18 6 6 18"/>',
  divide:'<path d="M4 12h16"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
  float:'<path d="M4 17h3m3-4h3m3-4h4M6 5v3m6-4v3m6 9v3"/>',
  chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/>',
  chevronDown:'<path d="m6 9 6 6 6-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  upload:'<path d="M12 15V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/>',
  check:'<path d="m5 12 4 4L19 6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.book}</svg>`;
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const KEY = 'arithmetic-atlas.progress.v1';
const ids = new Set(resources.map(r=>r.id));
const coreIds = topics.flatMap(t=>t.core);
let storageOK = true;
let progress = { read:[], reading:[], updatedAt:null };
let currentResource = null;
let selectedStage = null;
let visibleCount = 6;
let toastTimer;
let lastDialogTrigger = null;
const filter = { q:'', topic:'all', type:'all', status:'all', free:false };

function cleanProgress(p, imported=false) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.read) || !Array.isArray(p.reading) ||
    (imported && (p.app !== 'arithmetic-atlas' || p.version !== 1))) throw new Error('invalid');
  if (![...p.read,...p.reading].every(x=>typeof x==='string')) throw new Error('invalid');
  const read = [...new Set(p.read.filter(id=>ids.has(id)))];
  return { read, reading:[...new Set(p.reading.filter(id=>ids.has(id)&&!read.includes(id)))], updatedAt:typeof p.updatedAt==='string' ? p.updatedAt : null };
}
try {const raw=localStorage.getItem(KEY);if(raw)progress=cleanProgress(JSON.parse(raw));}catch{storageOK=false;}
const isRead=id=>progress.read.includes(id);
const isReading=id=>progress.reading.includes(id);
const statusText=id=>isRead(id)?'已读':isReading(id)?'在读':'未读';
const topicById=id=>topics.find(t=>t.id===id);
const resourceById=id=>resources.find(r=>r.id===id);

function notify(msg) {
  $('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);
}
function persist() {
  progress.updatedAt=new Date().toISOString();
  try{localStorage.setItem(KEY,JSON.stringify(progress));storageOK=true;}catch{storageOK=false;notify('当前浏览器无法保存记录，请导出进度备份。');}
}
function toggleRead(id) {
  if(!ids.has(id))return;
  const value=!isRead(id);
  progress.read=progress.read.filter(x=>x!==id);
  progress.reading=progress.reading.filter(x=>x!==id);
  if(value)progress.read.push(id);
  persist();refreshProgress();renderResources();
  if(selectedStage)renderStagePanel();
  if(currentResource)renderResourceDialog(currentResource);
  notify(value?'已标记为已读，学习进度已更新。':'已恢复为未读。');
}
function markReading(id) {
  if(!isRead(id)&&!isReading(id)){progress.reading.push(id);persist();refreshProgress();renderResources();if(selectedStage)renderStagePanel();}
  if(currentResource)renderResourceDialog(currentResource);
}
function refreshProgress() {
  const count=progress.read.length,pct=Math.round(count/resources.length*100);
  $('#side-percent').innerHTML=`${pct}<small>%</small>`;
  $('#side-bar').style.width=pct+'%';
  $('#side-count').textContent=`${count} / ${resources.length} 条已读`;
  const done=coreIds.filter(isRead).length;
  $('#core-complete').textContent=`${done} / ${coreIds.length}`;
  $('#continue').innerHTML=`${count||progress.reading.length?'继续学习':'开始学习'}${icon('arrowRight')}`;
  const next=topics.find(t=>!t.core.every(isRead));
  $('#next-topic').innerHTML=`${next?'下一站 · '+next.name:'主线已读完 · 回顾学习目标'}${icon('arrowRight')}`;
  renderRoutes();
}
function renderRoutes(){
  $('#route-grid').innerHTML=topics.map((t,i)=>{
    const n=t.core.filter(isRead).length;
    return `<button class="route-card ${n===t.core.length?'done':''} ${selectedStage===t.id?'selected':''}" data-stage="${t.id}" aria-expanded="${selectedStage===t.id}" aria-controls="stage-panel"><div class="route-top"><span class="route-number"><span class="route-icon">${icon(t.icon)}</span>${String(i+1).padStart(2,'0')}</span><span class="route-status ${n===t.core.length?'done':''}">${n===t.core.length?'主线已读完':`${n} / ${t.core.length} 已读`}</span></div><h3>${t.name}</h3><p>${t.keywords}</p><div class="route-bottom"><span>先修：${t.prerequisite}</span>${icon('arrowUpRight')}</div></button>`;
  }).join('');
}
function chooseStage(id,scroll=false){
  selectedStage=selectedStage===id&&!scroll?null:id;
  renderRoutes();renderStagePanel();
  if(scroll)$('#roadmap').scrollIntoView({behavior:'smooth'});
}
function renderStagePanel(){
  const panel=$('#stage-panel');
  if(!selectedStage){panel.hidden=true;return;}
  const t=topicById(selectedStage);panel.hidden=false;
  panel.innerHTML=`<div><span class="section-kicker">${escape(t.en.toUpperCase())}</span><h3>${t.name} · 学习目标</h3><p>${t.description}</p><ol>${t.goals.map(g=>`<li>${escape(g)}</li>`).join('')}</ol><p>${t.next}</p></div><div><div class="stage-meta">核心阅读 · 建议依次完成</div><div class="stage-readings">${t.core.map((id,i)=>{const r=resourceById(id);return `<button class="stage-reading" data-detail="${id}"><span>${i+1}. ${escape(r.title)}</span><span>${statusText(id)} ${icon('arrowUpRight')}</span></button>`}).join('')}</div><div class="stage-actions"><button class="text-btn" data-browse-topic="${t.id}">浏览本主题全部资料 ${icon('arrowRight')}</button><button class="text-btn" data-close-stage>收起</button></div></div>`;
}
function renderTopicControls(){
  $('#topic-nav').innerHTML=topics.map(t=>`<button class="${filter.topic===t.id?'selected':''}" data-topic="${t.id}" aria-pressed="${filter.topic===t.id}">${t.name}</button>`).join('');
  $('#filter-chips').innerHTML=[{id:'all',name:'全部资料'},...topics].map(t=>`<button class="${filter.topic===t.id?'active':''}" data-topic="${t.id}" aria-pressed="${filter.topic===t.id}">${t.name}<span class="chip-count">${t.id==='all'?resources.length:resources.filter(r=>r.topic===t.id).length}</span></button>`).join('');
}
function normalize(v){return String(v).normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function filteredResources(){
  const queries=normalize(filter.q).trim().split(/\s+/).filter(Boolean);
  return resources.filter(r=>{
    if(filter.topic!=='all'&&r.topic!==filter.topic)return false;
    if(filter.type!=='all'&&r.type!==filter.type)return false;
    if(filter.free&&!r.free)return false;
    if(filter.status==='read'&&!isRead(r.id))return false;
    if(filter.status==='reading'&&!isReading(r.id))return false;
    if(filter.status==='unread'&&(isRead(r.id)||isReading(r.id)))return false;
    const haystack=normalize([r.title,r.subtitle,r.authors,r.year,r.summary,r.focus,r.tags.join(' '),r.reference,topicById(r.topic).name].join(' '));
    return queries.every(q=>haystack.includes(q));
  });
}
function renderResources(){
  const list=filteredResources();
  const active=filter.q||filter.topic!=='all'||filter.type!=='all'||filter.status!=='all'||filter.free;
  $('#result-info').innerHTML=`共 <strong>${list.length}</strong> 条资料${active?' · 已筛选':' · 按学习顺序排列'}`;
  $('#reset-filters').hidden=!active;
  $('#empty-state').hidden=list.length>0;
  $('#load-more').hidden=list.length<=visibleCount;
  $('#load-more').innerHTML=`查看更多资料（${Math.max(0,list.length-visibleCount)}）${icon('chevronDown')}`;
  $('#resource-grid').innerHTML=list.slice(0,visibleCount).map(r=>`<article class="resource-card" data-resource="${r.id}"><div class="card-body"><div class="card-top"><span class="type-pill ${r.type==='论文'?'paper':r.type==='开源实现'?'code':''}">${r.type}${coreIds.includes(r.id)?' · 主线':''}</span>${isReading(r.id)?'<span class="reading-label">在读</span>':''}<span class="card-topic">${topicById(r.topic).name}</span></div><h3 style="margin:0"><button class="card-title" data-detail="${r.id}">${escape(r.title)}</button></h3><div class="card-subtitle">${escape(r.subtitle)}</div><div class="card-authors">${escape(r.authors)} <span>·</span> ${escape(r.year)}</div><p class="card-description">${escape(r.summary)}</p><div class="card-tags">${r.tags.slice(0,3).map(tag=>`<span>${escape(tag)}</span>`).join('')}</div></div><div class="card-footer"><a class="source-link" href="${r.url}" target="_blank" rel="noopener noreferrer" data-open-source="${r.id}" aria-label="${escape(r.title)}：${r.access}，在新标签页打开">${icon('arrowUpRight')}${r.access}</a><button class="mark-read" data-read="${r.id}" aria-pressed="${isRead(r.id)}" aria-label="${isRead(r.id)?'取消已读':'标记已读'}：${escape(r.title)}">${icon(isRead(r.id)?'checkCircle':'circle')}${isRead(r.id)?'已读':'标记已读'}</button></div></article>`).join('');
}
function applyFilter(){visibleCount=6;renderTopicControls();renderResources();}
function chooseTopic(id,scroll=true){filter.topic=id;applyFilter();if(scroll)$('#library').scrollIntoView({behavior:'smooth'});}
function resetFilters(){Object.assign(filter,{q:'',topic:'all',type:'all',status:'all',free:false});$('#search').value='';$('#type-filter').value='all';$('#status-filter').value='all';$('#free-filter').checked=false;applyFilter();}

const dialog=$('#detail-dialog');
function openDialog(content){
  if(!dialog.open)lastDialogTrigger=document.activeElement;
  $('#dialog-content').innerHTML=content;
  if(!dialog.open)dialog.showModal();
  dialog.scrollTop=0;
  $('#dialog-content .close-btn')?.focus({preventScroll:true});
}
const dialogHeader=label=>`<div class="dialog-header"><span class="dialog-label">${label}</span><button class="close-btn" data-close-dialog aria-label="关闭对话框">${icon('close')}</button></div>`;
function showResource(id){currentResource=id;renderResourceDialog(id);}
function renderResourceDialog(id){
  const r=resourceById(id);if(!r)return;
  openDialog(`<div class="dialog-inner">${dialogHeader(`${r.type} / ${topicById(r.topic).name}`)}<h2 id="dialog-title">${escape(r.title)}</h2><div class="dialog-subtitle">${escape(r.subtitle)}</div><div class="dialog-meta">${escape(r.authors)} · ${escape(r.year)} · ${statusText(id)}</div><div class="detail-block"><h3>为什么读</h3><p>${escape(r.summary)}</p></div><div class="detail-block"><h3>建议怎样读</h3><p>${escape(r.focus)}</p></div><div class="detail-block"><h3>引用信息</h3><p>${escape(r.reference)}</p><button class="text-btn" data-copy-citation="${id}">${icon('copy')} 复制引用与链接</button></div><div class="detail-source"><strong>来源：${escape(r.source)}</strong><br>访问方式：${r.access}<br>核对日期：${verifiedDate}<br>${escape(r.note)}<br><a href="${r.evidence||r.url}" target="_blank" rel="noopener noreferrer">查看核实来源 ${icon('arrowUpRight')}</a></div><div class="detail-actions"><a class="primary-btn" href="${r.url}" target="_blank" rel="noopener noreferrer" data-open-source="${id}">前往原始来源 ${icon('arrowUpRight')}</a><button class="secondary-btn" data-read="${id}" aria-pressed="${isRead(id)}">${icon(isRead(id)?'checkCircle':'circle')}${isRead(id)?'取消已读':'标记已读'}</button></div><p class="dialog-note">打开来源会将未读资料记为「在读」；阅读完成后可手动标记已读。</p></div>`);
}
function showProgress(){
  currentResource=null;
  const pct=Math.round(progress.read.length/resources.length*100);
  openDialog(`<div class="dialog-inner">${dialogHeader('YOUR READING PROGRESS')}<h2 id="dialog-title">每读一页，都在向前</h2><div class="progress-big"><strong>${pct}%</strong><span>${progress.read.length} / ${resources.length} 条已读 · ${progress.reading.length} 条在读</span></div><p class="inline-note">按资料条目等权计数；各阶段进度只计算该阶段的主线阅读。</p><div class="progress-rows">${topics.map(t=>{const n=t.core.filter(isRead).length;return `<div><div class="progress-row-top"><span>${t.name}</span><small>${n} / ${t.core.length}</small></div><div class="progress-track"><span style="width:${n/t.core.length*100}%"></span></div></div>`}).join('')}</div><div class="detail-block"><h3>备份与迁移</h3><p>${storageOK?'阅读状态已保存在当前浏览器。':'当前浏览器无法持久保存，请及时导出备份。'}换设备或清除浏览器数据前，请导出 JSON 文件；导入会合并记录，已读状态优先。</p></div><div class="backup-actions"><button class="secondary-btn" data-export>${icon('download')} 导出进度</button><button class="secondary-btn" data-import>${icon('upload')} 导入进度</button><button class="text-btn" data-view-read>查看已读资料 ${icon('arrowRight')}</button></div><input type="file" id="import-file" accept=".json,application/json" hidden><p class="dialog-note">已读不等于掌握。建议结合每个阶段的自检目标，定期回顾。</p></div>`);
}
function showPolicy(){
  currentResource=null;
  openDialog(`<div class="dialog-inner">${dialogHeader('SOURCES & EDITORIAL POLICY')}<h2 id="dialog-title">好资料，也需要清楚的来源</h2><ul class="policy-list"><li>仅链接出版方、作者或高校主页、标准机构、作者预印本与官方开源项目。本站不托管第三方书籍或论文副本。</li><li>标题、作者、年份与版本根据原始来源核实。免费、购买与机构访问分别标注；「开放书稿」不等同于正式出版版本。</li><li>讲义按章节计为学习条目，同一本教材的章节不被描述为多部独立著作。</li><li>路线、阅读建议与自检目标为本站整理，不冒充原作者的课程要求或论文结论。</li><li>论文 PPA 数据依赖工艺、精度、约束和负载；本站不跨条件拼接性能排名。</li><li>本批资料核对于 ${verifiedDate}。站外内容和访问权限可能变化；个别出版方可能要求浏览器验证。</li></ul><div class="detail-source">本站通过 GitHub Pages 公开访问。阅读进度仅存于当前浏览器，不进行云端同步。</div></div>`);
}
function exportProgress(){
  const data={app:'arithmetic-atlas',version:1,...progress,exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`arithmetic-progress-${new Date().toISOString().slice(0,10)}.json`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('进度备份已导出。');
}
async function importProgress(file){
  if(!file)return;
  if(file.size>1024*1024){notify('文件过大，请选择本站导出的进度 JSON。');return;}
  try{
    const p=cleanProgress(JSON.parse(await file.text()),true);
    const merged=cleanProgress({read:[...progress.read,...p.read],reading:[...progress.reading,...p.reading]});
    progress=merged;persist();refreshProgress();renderResources();if(selectedStage)renderStagePanel();showProgress();notify('进度已合并，已有的已读记录已保留。');
  }catch{notify('文件格式不正确，请选择本站导出的进度 JSON。');}
}
async function copyCitation(id){
  const r=resourceById(id);const citation=`${r.authors}. ${r.title}. ${r.reference}\n${r.url}`;
  try{await navigator.clipboard.writeText(citation);notify('引用信息已复制。');}catch{
    currentResource=null;openDialog(`<div class="dialog-inner">${dialogHeader('CITATION')}<h2 id="dialog-title">引用信息</h2><p class="inline-note">当前浏览器不允许自动复制，请选中以下文字复制。</p><pre class="citation">${escape(citation)}</pre></div>`);
  }
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button,a');if(!b)return;
  if(b.dataset.topic){chooseTopic(b.dataset.topic);return;}
  if(b.dataset.stage){chooseStage(b.dataset.stage);return;}
  if(b.dataset.detail){showResource(b.dataset.detail);return;}
  if(b.dataset.read){toggleRead(b.dataset.read);return;}
  if(b.dataset.openSource){markReading(b.dataset.openSource);return;}
  if(b.dataset.browseTopic){chooseTopic(b.dataset.browseTopic);return;}
  if(b.hasAttribute('data-close-stage')){selectedStage=null;renderRoutes();renderStagePanel();return;}
  if(b.hasAttribute('data-close-dialog')){dialog.close();return;}
  if(b.dataset.copyCitation){copyCitation(b.dataset.copyCitation);return;}
  if(b.hasAttribute('data-export')){exportProgress();return;}
  if(b.hasAttribute('data-import')){$('#import-file').click();return;}
  if(b.hasAttribute('data-view-read')){dialog.close();resetFilters();filter.status='read';$('#status-filter').value='read';applyFilter();$('#library').scrollIntoView({behavior:'smooth'});return;}
});
document.addEventListener('change',e=>{if(e.target.id==='import-file')importProgress(e.target.files[0]);});
$('#search').addEventListener('input',e=>{filter.q=e.target.value;applyFilter();});
$('#type-filter').addEventListener('change',e=>{filter.type=e.target.value;applyFilter();});
$('#status-filter').addEventListener('change',e=>{filter.status=e.target.value;applyFilter();});
$('#free-filter').addEventListener('change',e=>{filter.free=e.target.checked;applyFilter();});
$('#reset-filters').addEventListener('click',resetFilters);
$('#empty-reset').addEventListener('click',resetFilters);
$('#load-more').addEventListener('click',()=>{const old=visibleCount;visibleCount+=6;renderResources();const newTitle=$$('#resource-grid .card-title')[old];newTitle?.focus({preventScroll:true});});
$('#continue').addEventListener('click',()=>{const id=progress.reading.find(id=>!isRead(id))||coreIds.find(id=>!isRead(id))||resources.find(r=>!isRead(r.id))?.id;if(id)showResource(id);else showProgress();});
$('#next-topic').addEventListener('click',()=>chooseStage((topics.find(t=>!t.core.every(isRead))||topics[0]).id,true));
$('#source-policy').addEventListener('click',showPolicy);
$('#open-progress').addEventListener('click',showProgress);
$('#core-complete').parentElement.setAttribute('role','button');
$('#core-complete').parentElement.setAttribute('tabindex','0');
$('#core-complete').parentElement.setAttribute('aria-label','查看我的阅读进度');
$('#core-complete').parentElement.addEventListener('click',showProgress);
$('#core-complete').parentElement.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showProgress();}});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{currentResource=null;if(lastDialogTrigger?.isConnected)lastDialogTrigger.focus({preventScroll:true});});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();$('#library').scrollIntoView({behavior:'smooth'});}});
window.addEventListener('storage',e=>{if(e.key===KEY){try{progress=e.newValue?cleanProgress(JSON.parse(e.newValue)):{read:[],reading:[],updatedAt:null};refreshProgress();renderResources();if(selectedStage)renderStagePanel();if(dialog.open&&!currentResource)dialog.close();if(currentResource)renderResourceDialog(currentResource);}catch{notify('其他标签页的进度无法读取，请检查备份。');}}});
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){$$('[data-nav]').forEach(n=>{n.classList.toggle('active',n.dataset.nav===entry.target.id);if(n.dataset.nav===entry.target.id)n.setAttribute('aria-current','location');else n.removeAttribute('aria-current');});}}},{rootMargin:'-15% 0px -50% 0px',threshold:0});
['overview','roadmap','projects','library'].forEach(id=>observer.observe(document.getElementById(id)));
$('#nav-total').textContent=resources.length;$('#stat-total').textContent=resources.length;
refreshProgress();renderTopicControls();renderResources();
if(!storageOK)notify('本地记录无法读取或保存，建议导出进度备份。');
