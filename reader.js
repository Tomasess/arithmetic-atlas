import * as pdfjs from './vendor/pdfjs/pdf.min.mjs';
import { pdfCatalog, pdfGroups } from './pdf-catalog.js';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const $ = id => document.getElementById(id);
const customPrefix = 'arithmetic-atlas.pdf-outline.v1.';
const byId = new Map(pdfCatalog.map(item => [item.id, item]));
const cleanName = name => name.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const vaultMagic = 'ATLASPDF2';
const wrapContext = new TextEncoder().encode('arithmetic-atlas:data-key:v2');
const fragment = new URLSearchParams(location.hash.slice(1));
const initialId = fragment.has('key') ? fragment.get('doc') : decodeURIComponent(location.hash.slice(1));
if (fragment.has('key')) history.replaceState(null,'',`${location.pathname}${location.search}${initialId ? `#${encodeURIComponent(initialId)}` : ''}`);
let accessKey = null;
let unlockMethod = null;
let recoveryMode = false;
let chosen = null;
let pdf = null;
let currentPage = 1;
let renderTask = null;
let renderToken = 0;
let builtIn = [];
let entries = [];
let selectedFile = null;
let loadToken = 0;

function updateAddress() {
  const hash = chosen ? `#${chosen.id}` : '';
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

function renderKeyState() {
  $('key-form').classList.toggle('ready', Boolean(accessKey));
  $('key-form').querySelector('label').textContent = accessKey ? '已解锁本次阅读' : recoveryMode ? '输入独立恢复码' : '输入访问密码';
  $('key-form').querySelector('button').textContent = accessKey ? '锁定阅读' : recoveryMode ? '用恢复码解锁' : '解锁 PDF';
  $('access-key').placeholder = recoveryMode ? '恢复码' : '访问密码';
  $('access-key').hidden = Boolean(accessKey);
  $('access-key').required = !accessKey;
  $('key-state').textContent = accessKey ? `已通过${unlockMethod === 'recovery' ? '恢复码' : '密码'}解锁。仅在这个标签页有效，关闭后需重新输入。` : '密码和恢复码只在当前浏览器中处理，不会发送给网站。';
  $('recovery-help').hidden = Boolean(accessKey);
  $('recovery-help').textContent = recoveryMode ? '返回密码输入' : '忘记密码？使用恢复码';
  $('recovery-note').hidden = !recoveryMode || Boolean(accessKey);
  $('access-key').value = '';
}

async function unlockVault(secret, method) {
  const response = await fetch('./vault/config.json?v=2',{cache:'no-store'});
  if (!response.ok) throw new Error('CONFIG');
  const config = await response.json();
  if (config.version !== 2 || config.kdf?.name !== 'PBKDF2' || config.kdf?.hash !== 'SHA-256' || config.kdf?.iterations !== 600000) throw new Error('CONFIG');
  const envelope = config[method];
  if (!/^[0-9a-f]{32}$/i.test(envelope?.salt || '') || typeof envelope.wrapped !== 'string') throw new Error('CONFIG');
  const salt = Uint8Array.from(envelope.salt.match(/.{2}/g),x=>parseInt(x,16));
  const raw = Uint8Array.from(atob(envelope.wrapped),c=>c.charCodeAt(0));
  if (raw.length !== 60) throw new Error('CONFIG');
  const material = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveKey']);
  const wrappingKey = await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:config.kdf.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const dataKey = await crypto.subtle.decrypt({name:'AES-GCM',iv:raw.slice(0,12),additionalData:wrapContext},wrappingKey,raw.slice(12));
  return crypto.subtle.importKey('raw',dataKey,'AES-GCM',false,['decrypt']);
}

function setStatus(message, kind = '') {
  $('reader-status').textContent = message;
  $('reader-status').dataset.kind = kind;
}

function catalogue() {
  for (const group of pdfGroups) {
    const section = document.createElement('section');
    section.className = 'catalog-group';
    const title = document.createElement('h3');
    title.textContent = group.title;
    const description = document.createElement('p');
    description.textContent = group.description;
    section.append(title, description);
    for (const entry of pdfCatalog.filter(item => item.group === group.id)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-item';
      button.dataset.id = entry.id;
      button.innerHTML = '<span class="catalog-item-title"></span><span class="catalog-item-meta"></span>';
      button.querySelector('.catalog-item-title').textContent = entry.title;
      button.querySelector('.catalog-item-meta').textContent = `${entry.kind} · ${entry.pages} 页 · ${entry.outline === 'curated' ? '本站编排目录' : 'PDF 原有书签'}`;
      button.addEventListener('click', () => selectDocument(entry));
      section.append(button);
    }
    $('catalog-list').append(section);
  }
}

async function releaseDocument() {
  loadToken++;
  renderToken++;
  renderTask?.cancel();
  renderTask = null;
  const old = pdf;
  pdf = null;
  if (old) await old.destroy().catch(() => {});
  selectedFile = null;
  builtIn = [];
  entries = [];
  $('reader-area').hidden = true;
  $('reader-empty').hidden = false;
  $('pdf-canvas').width = $('pdf-canvas').height = 0;
}

function showDescription(doc) {
  $('document-kind').textContent = doc ? `${doc.kind} / ${doc.year}` : 'LOCAL DOCUMENT';
  $('document-title').textContent = doc?.title || '其他本机 PDF';
  $('document-summary').textContent = doc?.summary || '你也可以为任意 PDF 添加自己的章节页码。';
  $('document-actions').hidden = false;
  $('source-link').hidden = !doc?.sourceUrl;
  if (doc?.sourceUrl) {
    $('source-link').href = doc.sourceUrl;
    $('source-link').textContent = `${doc.sourceLabel} ↗`;
  }
  document.querySelectorAll('.catalog-item').forEach(button => {
    button.classList.toggle('active', button.dataset.id === doc?.id);
    if (button.dataset.id === doc?.id) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

async function selectDocument(doc) {
  if (chosen?.id === doc.id && (pdf || $('reader-status').textContent.startsWith('正在'))) return;
  await releaseDocument();
  chosen = doc;
  showDescription(doc);
  $('reader-empty').querySelector('p').textContent = '目录已就绪。可在线打开，也可选择本机 PDF。';
  setStatus(accessKey ? '正在准备在线文件…' : '输入密码即可在线打开；也可选择本机 PDF。');
  updateAddress();
  if (accessKey) await openOnline(doc);
}

function customKey() {
  return `${customPrefix}${chosen?.id || cleanName(selectedFile?.name || '')}`;
}

function readCustom() {
  try {
    const raw = JSON.parse(localStorage.getItem(customKey()) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(x => typeof x.title === 'string' && x.title.length <= 80 && Number.isInteger(x.page) && x.page >= 1 && x.page <= pdf.numPages).slice(0, 200);
  } catch { return []; }
}

function storeCustom() {
  try { localStorage.setItem(customKey(), JSON.stringify(entries)); }
  catch { setStatus('当前浏览器无法保存个人章节；本次打开期间仍可使用。', 'warning'); }
}

async function extractOutline(items, depth = 0, result = []) {
  // A 1,145-page manual may contain 1,000+ bookmarks. Keep the navigation compact.
  for (const item of items) {
    if (result.length >= 160) break;
    if (item.dest) {
      try {
        const destination = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
        const target = destination?.[0];
        const index = typeof target === 'number' ? target : await pdf.getPageIndex(target);
        if (Number.isInteger(index) && index >= 0 && index < pdf.numPages)
          result.push({ title:item.title.trim(), page:index + 1, depth });
      } catch { /* Some embedded bookmarks reference missing destinations. */ }
    }
    if (depth < 1 && item.items?.length) await extractOutline(item.items, depth + 1, result);
  }
  return result;
}

function outlineRows(title, rows, editable = false) {
  if (!rows.length) return;
  const heading = document.createElement('h3');
  heading.textContent = title;
  $('outline-list').append(heading);
  for (const [index, row] of rows.entries()) {
    const wrapper = document.createElement('div');
    wrapper.className = 'outline-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `outline-jump ${row.depth ? 'nested' : ''}`;
    button.dataset.page = String(row.page);
    button.innerHTML = '<span class="outline-name"></span><span class="outline-page"></span>';
    button.querySelector('.outline-name').textContent = row.title;
    button.querySelector('.outline-page').textContent = String(row.page);
    button.addEventListener('click', () => goToPage(row.page));
    wrapper.append(button);
    if (editable) {
      const remove = document.createElement('button');
      remove.className = 'outline-remove';
      remove.type = 'button';
      remove.setAttribute('aria-label', `删除个人章节：${row.title}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        entries.splice(index, 1);
        storeCustom();
        renderOutline();
      });
      wrapper.append(remove);
    }
    $('outline-list').append(wrapper);
  }
}

function renderOutline() {
  $('outline-list').replaceChildren();
  const curated = chosen?.toc?.map(([title,page]) => ({title,page,depth:0})) || [];
  const base = builtIn.length ? builtIn : curated;
  $('outline-source').textContent = builtIn.length ? 'PDF 原有书签' : curated.length ? '本站编排页码' : '尚无原有目录';
  outlineRows(builtIn.length ? 'PDF 原有书签' : '章节页码', base);
  outlineRows('我的章节', entries, true);
  if (!base.length && !entries.length) {
    const empty = document.createElement('p');
    empty.className = 'outline-empty';
    empty.textContent = '这个 PDF 没有书签。可在下方按实际 PDF 页码添加章节。';
    $('outline-list').append(empty);
  }
  document.querySelectorAll('.outline-jump').forEach(button => {
    button.classList.toggle('current', Number(button.dataset.page) === currentPage);
  });
}

async function openBytes(bytes, {file = null, documentItem = null, label = ''} = {}) {
  await releaseDocument();
  const token = loadToken;
  selectedFile = file;
  if (documentItem) chosen = documentItem;
  setStatus(`正在打开 ${label}…`);
  try {
    const task = pdfjs.getDocument({ data:new Uint8Array(bytes) });
    const loaded = await task.promise;
    if (token !== loadToken) { await loaded.destroy(); return; }
    pdf = loaded;
    const matched = documentItem || (file && pdfCatalog.find(item => cleanName(item.filename) === cleanName(file.name)));
    chosen = matched?.pages === pdf.numPages ? matched : null;
    if (matched && !chosen) setStatus('这份文件的页数与编排目录不符，已改用 PDF 自带书签或手动章节。', 'warning');
    showDescription(chosen);
    if (!chosen) {
      $('document-title').textContent = label;
      $('document-kind').textContent = `本机 PDF / ${pdf.numPages} 页`;
    }
    builtIn = await extractOutline((await pdf.getOutline()) || []);
    if (token !== loadToken) return;
    entries = readCustom();
    currentPage = 1;
    $('reader-empty').hidden = true;
    $('reader-area').hidden = false;
    $('bookmark-page').max = String(pdf.numPages);
    $('page-number').max = String(pdf.numPages);
    $('page-total').textContent = `/ ${pdf.numPages}`;
    renderOutline();
    if ($('reader-status').dataset.kind !== 'warning') setStatus(`${label} · ${pdf.numPages} 页 · ${builtIn.length ? '已读取原有书签' : chosen?.toc ? '使用本站编排目录' : '可添加个人目录'}`);
    await renderPage();
  } catch (error) {
    if (token !== loadToken) return;
    await releaseDocument();
    setStatus(error?.name === 'PasswordException' ? 'PDF 已加密，请使用未加密的个人副本。' : '无法打开该 PDF；请确认文件未损坏。', 'error');
  }
}

async function loadFile(file) {
  if (!file) return;
  if (file.size > 100 * 1024 * 1024) { setStatus('PDF 超过 100 MB，请用本机阅读器打开。', 'error'); return; }
  if (file.size < 5 || (await file.slice(0, 5).text()) !== '%PDF-') { setStatus('所选文件不是有效的 PDF。', 'error'); return; }
  await openBytes(await file.arrayBuffer(), {file,label:file.name});
}

async function openOnline(doc) {
  if (!accessKey) { setStatus('请先输入密码，或使用独立恢复码。', 'warning'); $('access-key').focus(); return; }
  await releaseDocument();
  chosen = doc;
  showDescription(doc);
  const token = loadToken;
  setStatus(`正在下载 ${doc.title} 的加密文件…`);
  try {
    const response = await fetch(`./vault/${doc.id}.atlas?v=2`, {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = new Uint8Array(await response.arrayBuffer());
    if (token !== loadToken) return;
    const marker = new TextEncoder().encode(vaultMagic);
    if (data.length < marker.length + 12 + 16 || !marker.every((byte,index) => data[index] === byte)) throw new Error('FORMAT');
    setStatus(`正在本机解密 ${doc.title}…`);
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(marker.length,marker.length+12),additionalData:new TextEncoder().encode(doc.id)},accessKey,data.slice(marker.length+12));
    if (token !== loadToken) return;
    await openBytes(plain, {documentItem:doc,label:doc.title});
  } catch (error) {
    if (token !== loadToken) return;
    setStatus(error?.name === 'OperationError' ? '加密文件验证失败，请联系站点所有者。' : '暂时无法取得在线加密文件，请稍后重试或选择本机 PDF。', 'error');
  }
}

async function renderPage() {
  if (!pdf) return;
  const token = ++renderToken;
  if (renderTask) {
    renderTask.cancel();
    await renderTask.promise.catch(() => {});
  }
  if (token !== renderToken) return;
  const page = await pdf.getPage(currentPage);
  if (token !== renderToken) return;
  const base = page.getViewport({ scale:1 });
  const zoom = $('zoom-select').value;
  const scale = zoom === 'fit' ? Math.max(.35, ($('page-stage').clientWidth - 44) / base.width) : Number(zoom);
  const view = page.getViewport({ scale });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(view.width, view.height), Math.sqrt(6000000 / (view.width * view.height)));
  const canvas = $('pdf-canvas');
  canvas.width = Math.max(1, Math.floor(view.width * pixelRatio));
  canvas.height = Math.max(1, Math.floor(view.height * pixelRatio));
  canvas.style.width = `${view.width}px`;
  canvas.style.height = `${view.height}px`;
  $('page-number').value = String(currentPage);
  $('previous-page').disabled = currentPage <= 1;
  $('next-page').disabled = currentPage >= pdf.numPages;
  document.querySelectorAll('.outline-jump').forEach(button => button.classList.toggle('current', Number(button.dataset.page) === currentPage));
  $('page-stage').scrollTop = 0;
  renderTask = page.render({ canvasContext:canvas.getContext('2d'), viewport:view, transform:[pixelRatio,0,0,pixelRatio,0,0], background:'#fff' });
  try { await renderTask.promise; }
  catch (error) { if (error?.name !== 'RenderingCancelledException') setStatus('这一页无法渲染，请尝试下一页。', 'error'); }
  finally { if (token === renderToken) renderTask = null; }
}

function goToPage(value) {
  const page = Number(value);
  if (!pdf || !Number.isInteger(page) || page < 1 || page > pdf.numPages) {
    setStatus(`请输入 1 到 ${pdf?.numPages || '—'} 之间的 PDF 实际页码。`, 'warning');
    return;
  }
  currentPage = page;
  renderPage();
}

catalogue();
renderKeyState();
if (byId.has(initialId)) selectDocument(byId.get(initialId));
$('open-online').addEventListener('click', () => { if (chosen) openOnline(chosen); });
$('choose-file').addEventListener('click', () => $('pdf-file').click());
$('open-other').addEventListener('click', async () => { await releaseDocument(); chosen = null; updateAddress(); showDescription(null); $('pdf-file').click(); });
$('pdf-file').addEventListener('change', event => { loadFile(event.target.files?.[0]); event.target.value = ''; });
$('recovery-help').addEventListener('click', () => { recoveryMode = !recoveryMode; renderKeyState(); $('access-key').focus(); });
$('key-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (accessKey) {
    await releaseDocument();
    accessKey = null;
    unlockMethod = null;
    updateAddress();
    renderKeyState();
    setStatus('本次阅读已锁定。');
    return;
  }
  const secret = $('access-key').value.trim();
  $('access-key').value = '';
  if (secret.length < 16) { setStatus('请输入完整的密码或恢复码。', 'warning'); return; }
  const button = $('key-form').querySelector('button');
  button.disabled = true;
  setStatus(`正在验证${recoveryMode ? '恢复码' : '密码'}…`);
  try {
    accessKey = await unlockVault(secret,recoveryMode ? 'recovery' : 'password');
    unlockMethod = recoveryMode ? 'recovery' : 'password';
    renderKeyState();
    if (chosen) await openOnline(chosen);
    else setStatus('验证成功。请选择左侧 PDF 在线阅读。');
  } catch (error) {
    setStatus(error?.name === 'OperationError' ? `${recoveryMode ? '恢复码' : '密码'}不正确。` : '无法验证密码，请检查网络后重试。', 'error');
  } finally { button.disabled = false; }
});
$('previous-page').addEventListener('click', () => goToPage(currentPage - 1));
$('next-page').addEventListener('click', () => goToPage(currentPage + 1));
$('page-form').addEventListener('submit', event => { event.preventDefault(); goToPage($('page-number').value); });
$('zoom-select').addEventListener('change', renderPage);
$('bookmark-form').addEventListener('submit', event => {
  event.preventDefault();
  const title = $('bookmark-title').value.trim();
  const page = Number($('bookmark-page').value);
  if (!title || !Number.isInteger(page) || page < 1 || page > pdf.numPages) { setStatus('章节名或 PDF 页码无效。', 'warning'); return; }
  if (entries.length >= 200) { setStatus('个人章节最多保存 200 条。', 'warning'); return; }
  entries.push({title,page});
  entries.sort((a,b) => a.page - b.page);
  storeCustom();
  renderOutline();
  $('bookmark-form').reset();
  setStatus(`已将「${title}」加入个人目录（PDF 第 ${page} 页）。`);
});
let resizeTimer;
window.addEventListener('resize', () => { if (pdf && $('zoom-select').value === 'fit') { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderPage, 180); } });
window.addEventListener('pagehide', () => { renderTask?.cancel(); pdf?.destroy(); });
