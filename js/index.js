const ADMIN_EMAIL = 'KitsuMangaFeedback@gmail.com';

const grid = document.getElementById('grid');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchSubmitBtn = document.getElementById('searchSubmitBtn');
let pendingSearchTerm = ''; // Per memorizzare la ricerca da fare
const resultsInfo = document.getElementById('resultsInfo');
const tabs = document.querySelectorAll('.tab-btn');
const addMangaBtn = document.getElementById('addMangaBtn');
const reloadBtn = document.getElementById('reloadBtn');
const adminBtn = document.getElementById('adminBtn');
const bugBtn = document.getElementById('bugBtn');
const requestModal = document.getElementById('requestModal');
const bugModal = document.getElementById('bugModal');
const adminPanel = document.getElementById('adminPanel');
const submitRequest = document.getElementById('submitRequest');
const submitBug = document.getElementById('submitBug');
const closeRequestModal = document.getElementById('closeRequestModal');
const closeBugModal = document.getElementById('closeBugModal');
const closeAdmin = document.getElementById('closeAdmin');

let mangasLocal = [];
let mangasExternal = [];
let mangaRequests = [];
let bugReports = [];
let currentTab = 'local';
let currentSearchTerm = '';
let currentAdminTab = 'requests';
const ADMIN_PASSWORD = 'admin123';

const LISTS_KEY = 'kitsumanga_lists';

function loadLists() {
  const saved = localStorage.getItem(LISTS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) {
      return { reading: [], plan: [], completed: [] };
    }
  }
  return { reading: [], plan: [], completed: [] };
}

function saveLists(lists) {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

function updateListCounts() {
  const lists = loadLists();
  document.getElementById('readingCount').textContent = lists.reading.length;
  document.getElementById('planCount').textContent = lists.plan.length;
  document.getElementById('completedCount').textContent = lists.completed.length;
  document.getElementById('mobileReadingCount').textContent = lists.reading.length;
  document.getElementById('mobilePlanCount').textContent = lists.plan.length;
  document.getElementById('mobileCompletedCount').textContent = lists.completed.length;
}

function removeFromList(listType, mangaId) {
  const lists = loadLists();
  lists[listType] = lists[listType].filter(m => m.id !== mangaId);
  saveLists(lists);
  updateListCounts();
}

function renderListTab(listType) {
  const lists = loadLists();
  const items = lists[listType] || [];
  
  const tabNames = {
    reading: 'Sto leggendo',
    plan: 'Da leggere',
    completed: 'Completati'
  };
  
  sortSelect.style.display = 'none';
  addMangaBtn.style.display = 'none';
  
  if (items.length === 0) {
    grid.innerHTML = `<div class="no-results">📭 Nessun manga in "${tabNames[listType]}"</div>`;
    resultsInfo.innerHTML = `📚 0 manga in "${tabNames[listType]}"`;
    return;
  }
  
  grid.innerHTML = '';
  
  items.forEach(manga => {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
      <img src="${manga.cover}" alt="${manga.title}" onerror="this.src='https://placehold.co/300x400/1a1a2e/a78bfa?text=${encodeURIComponent(manga.title)}'">
      <div class="info">
        <div class="title">${escapeHtml(manga.title)}</div>
        <div class="chapter">${manga.latest || ''}</div>
        ${manga.author ? `<div class="chapter" style="font-size: 11px;">✍️ ${escapeHtml(manga.author)}</div>` : ''}
        <button class="remove-from-list-btn" data-id="${manga.id}" data-list="${listType}">🗑️ Rimuovi</button>
      </div>
    `;
    
    card.onclick = (e) => {
      if (e.target.classList.contains('remove-from-list-btn')) return;
      window.location.href = `pages/manga-detail.html?manga=${encodeURIComponent(manga.id)}&title=${encodeURIComponent(manga.title)}`;
    };
    
    grid.appendChild(card);
  });
  
  document.querySelectorAll('.remove-from-list-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const list = btn.dataset.list;
      removeFromList(list, id);
      renderListTab(list);
      showToast(`🗑️ Rimosso dalla lista`);
    });
  });
  
  resultsInfo.innerHTML = `📚 ${items.length} manga in "${tabNames[listType]}"`;
}

function setActiveList(activeList) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.list === activeList) item.classList.add('active');
  });
  
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.list === activeList) item.classList.add('active');
  });
  
  tabs.forEach(btn => btn.classList.remove('active'));
}

function initListsUI() {
  updateListCounts();
  
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const listType = item.dataset.list;
      currentTab = listType;
      setActiveList(listType);
      renderListTab(listType);
    });
  });
  
  const dropdown = document.getElementById('listsDropdownMobile');
  const dropdownBtn = document.getElementById('listsDropdownBtn');
  
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });
  
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove('active');
  });
  
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const listType = item.dataset.list;
      currentTab = listType;
      setActiveList(listType);
      renderListTab(listType);
      dropdown.classList.remove('active');
    });
  });
}

async function inviaEmail(tipo, dati) {
  let messaggio = '';
  
  if (tipo === 'richieste') {
    dati.forEach((req, i) => {
      messaggio += `【${i+1}】 ${req.title}\n`;
      messaggio += `   👤 Richiedente: ${req.requester}\n`;
      messaggio += `   ✍️ Autore: ${req.author || 'Non specificato'}\n`;
      messaggio += `   🔗 URL: ${req.url || 'Non specificato'}\n`;
      messaggio += `   💬 Motivo: ${req.reason || 'Nessuno'}\n`;
      messaggio += `   🏷️ Stato locale: ${req.status === 'pending' ? '⏳ In attesa' : (req.status === 'approved' ? '✅ Approvata' : '❌ Respinta')}\n`;
      if (req.cover) messaggio += `   🖼️ Cover: ${req.cover}\n`;
      messaggio += `\n`;
    });
  } else if (tipo === 'bugs') {
    dati.forEach((bug, i) => {
      const tipoLabel = {
        'visual': '🎨 Problema visivo',
        'functional': '⚙️ Problema funzionale',
        'loading': '🔄 Problema di caricamento',
        'reader': '📖 Problema nel lettore',
        'other': '📝 Altro'
      };
      messaggio += `【${i+1}】 ${bug.title}\n`;
      messaggio += `   👤 Segnalato da: ${bug.reporter}\n`;
      messaggio += `   🏷️ Tipo: ${tipoLabel[bug.type] || bug.type}\n`;
      messaggio += `   📝 Descrizione: ${bug.description}\n`;
      messaggio += `   📄 Pagina: ${bug.page || 'Non specificata'}\n`;
      messaggio += `   🏷️ Stato locale: ${bug.status === 'pending' ? '⏳ In attesa' : '✅ Risolto'}\n`;
      messaggio += `\n`;
    });
  }
  
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://formsubmit.co/${ADMIN_EMAIL}`;
  form.style.display = 'none';
  
  const inputMessage = document.createElement('input');
  inputMessage.name = 'message';
  inputMessage.value = messaggio;
  
  const inputSubject = document.createElement('input');
  inputSubject.name = '_subject';
  inputSubject.value = `📬 KitsuManga - ${tipo === 'richieste' ? 'Nuove richieste' : 'Nuovi bug'}`;
  
  const inputFormat = document.createElement('input');
  inputFormat.name = '_format';
  inputFormat.value = 'text';
  
  const inputNext = document.createElement('input');
  inputNext.name = '_next';
  inputNext.value = window.location.href;
  
  form.appendChild(inputMessage);
  form.appendChild(inputSubject);
  form.appendChild(inputFormat);
  form.appendChild(inputNext);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  
  return true;
}

async function inviaTutteLeRichieste() {
  if (mangaRequests.length === 0) {
    showToast('❌ Non hai richieste da inviare', true);
    return;
  }
  showToast('📧 Invio in corso...');
  await inviaEmail('richieste', mangaRequests);
  showToast('✅ Richieste inviate!');
}

async function inviaTuttiIBug() {
  if (bugReports.length === 0) {
    showToast('❌ Non hai bug da inviare', true);
    return;
  }
  showToast('📧 Invio in corso...');
  await inviaEmail('bugs', bugReports);
  showToast('✅ Bug inviati!');
}

const reqCoverInput = document.getElementById('reqCover');
const coverPreview = document.getElementById('coverPreview');

reqCoverInput.addEventListener('input', () => {
  const url = reqCoverInput.value.trim();
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    coverPreview.src = url;
    coverPreview.classList.add('show');
    coverPreview.onerror = () => coverPreview.classList.remove('show');
  } else {
    coverPreview.classList.remove('show');
  }
});

function loadRequests() {
  const saved = localStorage.getItem('mangaRequests');
  mangaRequests = saved ? JSON.parse(saved) : [];
}

function loadBugs() {
  const saved = localStorage.getItem('bugReports');
  bugReports = saved ? JSON.parse(saved) : [];
}

function saveRequests() {
  localStorage.setItem('mangaRequests', JSON.stringify(mangaRequests));
}

function saveBugs() {
  localStorage.setItem('bugReports', JSON.stringify(bugReports));
}

function showToast(message, isError = false) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  if (isError) toast.style.background = '#ef4444';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function authenticateAdmin() {
  const password = prompt('Inserisci la password amministratore:');
  if (password === ADMIN_PASSWORD) {
    showAdminPanel();
    showToast('✅ Accesso amministratore consentito');
  } else if (password !== null) {
    showToast('❌ Password errata', true);
  }
}

function showAdminPanel() {
  adminPanel.classList.add('active');
  renderAdminContent();
}

function renderAdminContent() {
  if (currentAdminTab === 'requests') {
    renderAdminRequests();
  } else {
    renderAdminBugs();
  }
}

function renderAdminRequests() {
  const container = document.getElementById('adminRequestsList');
  if (mangaRequests.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:50px;">📭 Nessuna richiesta in sospeso</div>';
    return;
  }
  
  container.innerHTML = '';
  mangaRequests.forEach((req, index) => {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.innerHTML = `
      <h3>${escapeHtml(req.title)}</h3>
      <p><strong>Richiedente:</strong> ${escapeHtml(req.requester)}</p>
      <p><strong>Autore:</strong> ${escapeHtml(req.author || 'Non specificato')}</p>
      ${req.cover ? `<p><strong>Cover:</strong> <a href="${req.cover}" target="_blank" style="color:#c4b5fd;">Visualizza</a><br><img src="${req.cover}" class="cover-thumb" onerror="this.style.display='none'"></p>` : '<p><strong>Cover:</strong> Non fornita</p>'}
      <p><strong>URL:</strong> ${req.url ? `<a href="${req.url}" target="_blank" style="color:#c4b5fd;">Link</a>` : 'Non specificato'}</p>
      <p><strong>Motivo:</strong> ${escapeHtml(req.reason || 'Nessuno')}</p>
      <p><strong>Data:</strong> ${new Date(req.date).toLocaleString()}</p>
      <p><strong>Stato:</strong> <span style="color:${req.status === 'approved' ? '#10b981' : (req.status === 'rejected' ? '#ef4444' : '#f59e0b')}">${req.status === 'approved' ? '✅ Approvata' : (req.status === 'rejected' ? '❌ Respinta' : '⏳ In attesa')}</span></p>
      <div class="request-actions">
        ${req.status === 'pending' ? `<button class="approve-btn" data-index="${index}">✅ Approva</button>` : ''}
        ${req.status === 'pending' ? `<button class="reject-btn" data-index="${index}">❌ Rifiuta</button>` : ''}
        <button class="reject-btn" data-index="${index}" data-delete="true" style="background:#6b7280;">🗑️ Elimina</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  document.querySelectorAll('#adminRequestsList .approve-btn').forEach(btn => {
    btn.addEventListener('click', () => approveRequest(parseInt(btn.dataset.index)));
  });
  document.querySelectorAll('#adminRequestsList .reject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      btn.dataset.delete ? deleteRequest(idx) : rejectRequest(idx);
    });
  });
}

function renderAdminBugs() {
  const container = document.getElementById('adminBugsList');
  if (bugReports.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:50px;">🐛 Nessuna segnalazione bug</div>';
    return;
  }
  
  container.innerHTML = '';
  bugReports.forEach((bug, index) => {
    const typeLabels = {
      'visual': '🎨 Problema visivo',
      'functional': '⚙️ Problema funzionale',
      'loading': '🔄 Problema di caricamento',
      'reader': '📖 Problema nel lettore',
      'other': '📝 Altro'
    };
    const card = document.createElement('div');
    card.className = 'bug-card';
    card.innerHTML = `
      <h3>${escapeHtml(bug.title)}</h3>
      <p><strong>Tipo:</strong> ${typeLabels[bug.type] || bug.type}</p>
      <p><strong>Segnalato da:</strong> ${escapeHtml(bug.reporter)}</p>
      <p><strong>Descrizione:</strong> ${escapeHtml(bug.description)}</p>
      <p><strong>Pagina:</strong> ${escapeHtml(bug.page || 'Non specificata')}</p>
      <p><strong>Data:</strong> ${new Date(bug.date).toLocaleString()}</p>
      <p><strong>Stato:</strong> <span style="color:${bug.status === 'fixed' ? '#10b981' : '#f59e0b'}">${bug.status === 'fixed' ? '✅ Risolto' : '⏳ In attesa'}</span></p>
      <div class="bug-actions">
        ${bug.status === 'pending' ? `<button class="fix-btn" data-index="${index}">✅ Segna come risolto</button>` : ''}
        <button class="reject-btn" data-index="${index}" data-delete="true" style="background:#6b7280;">🗑️ Elimina</button>
      </div>
    `;
    container.appendChild(card);
  });
  
  document.querySelectorAll('#adminBugsList .fix-btn').forEach(btn => {
    btn.addEventListener('click', () => fixBug(parseInt(btn.dataset.index)));
  });
  document.querySelectorAll('#adminBugsList .reject-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteBug(parseInt(btn.dataset.index)));
  });
}

function approveRequest(index) {
  mangaRequests[index].status = 'approved';
  saveRequests();
  renderAdminRequests();
  showToast('✅ Richiesta approvata!');
  if (currentTab === 'requests') renderRequestsTab();
}

function rejectRequest(index) {
  mangaRequests[index].status = 'rejected';
  saveRequests();
  renderAdminRequests();
  showToast('❌ Richiesta rifiutata');
  if (currentTab === 'requests') renderRequestsTab();
}

function deleteRequest(index) {
  mangaRequests.splice(index, 1);
  saveRequests();
  renderAdminRequests();
  if (currentTab === 'requests') renderRequestsTab();
  showToast('🗑️ Richiesta eliminata');
}

function fixBug(index) {
  bugReports[index].status = 'fixed';
  saveBugs();
  renderAdminBugs();
  if (currentTab === 'bugs') renderBugsTab();
  showToast('✅ Bug segnato come risolto');
}

function deleteBug(index) {
  bugReports.splice(index, 1);
  saveBugs();
  renderAdminBugs();
  if (currentTab === 'bugs') renderBugsTab();
  showToast('🗑️ Segnalazione eliminata');
}

function importFromEmail() {
  const text = document.getElementById('emailImportText').value;
  if (!text.trim()) {
    showToast('❌ Incolla prima il contenuto dell\'email', true);
    return;
  }
  
  let cleanText = text;
  if (!cleanText.includes('\n') || cleanText.split('\n').length < 3) {
    cleanText = cleanText.replace(/([👤✍️🔗💬🖼️📖🏷️])/g, '\n$1');
    cleanText = cleanText.replace(/(【\d+】)/g, '$1\n');
    cleanText = cleanText.replace(/\n\s*\n/g, '\n');
  }
  
  const lines = cleanText.split('\n');
  let currentRequest = {};
  let newRequests = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line === '') continue;
    
    if (line.match(/【\d+】/)) {
      if (currentRequest.title && currentRequest.requester) newRequests.push(currentRequest);
      currentRequest = {};
      const titleMatch = line.match(/】\s*(.+)/);
      if (titleMatch) currentRequest.title = titleMatch[1].trim();
    } else if (line.includes('👤') && line.includes('Richiedente:')) {
      let val = line.replace(/👤/, '').replace('Richiedente:', '').trim();
      if (val && val !== 'Non specificato') currentRequest.requester = val;
    } else if (line.includes('📖') && line.includes('Titolo:')) {
      let val = line.replace(/📖/, '').replace('Titolo:', '').trim();
      if (val && val !== 'Non specificato') currentRequest.title = val;
    } else if (line.includes('✍️') && line.includes('Autore:')) {
      let val = line.replace(/✍️/, '').replace('Autore:', '').trim();
      if (val && val !== 'Non specificato') currentRequest.author = val;
    } else if (line.includes('🔗') && line.includes('URL:')) {
      let val = line.replace(/🔗/, '').replace('URL:', '').trim();
      if (val && val !== 'Non specificato') currentRequest.url = val;
    } else if (line.includes('💬') && line.includes('Motivo:')) {
      let val = line.replace(/💬/, '').replace('Motivo:', '').trim();
      if (val && val !== 'Nessuno') currentRequest.reason = val;
    } else if (line.includes('🖼️') && line.includes('Cover:')) {
      let val = line.replace(/🖼️/, '').replace('Cover:', '').trim();
      if (val && val !== 'Non fornita') currentRequest.cover = val;
    }
  }
  
  if (currentRequest.title && currentRequest.requester) newRequests.push(currentRequest);
  
  if (newRequests.length === 0) {
    showToast('❌ Nessuna richiesta trovata', true);
    return;
  }
  
  let importate = 0;
  for (const req of newRequests) {
    mangaRequests.unshift({
      id: Date.now() + importate,
      title: req.title,
      author: req.author || '',
      cover: req.cover || null,
      url: req.url || '',
      reason: req.reason || '',
      requester: req.requester,
      date: new Date().toISOString(),
      status: 'pending'
    });
    importate++;
  }
  
  saveRequests();
  renderAdminRequests();
  if (currentTab === 'requests') renderRequestsTab();
  showToast(`✅ Importate ${importate} richieste!`);
  document.getElementById('emailImportText').value = '';
}

function addRequest() {
  const title = document.getElementById('reqTitle').value.trim();
  const author = document.getElementById('reqAuthor').value.trim();
  const cover = document.getElementById('reqCover').value.trim();
  const url = document.getElementById('reqUrl').value.trim();
  const reason = document.getElementById('reqReason').value.trim();
  const requester = document.getElementById('reqRequester').value.trim();
  
  if (!title || !requester) {
    showToast('❌ Titolo e nome richiedente sono obbligatori', true);
    return;
  }
  
  const newRequest = {
    id: Date.now(),
    title, author, cover: cover || null, url, reason, requester,
    date: new Date().toISOString(),
    status: 'pending'
  };
  
  mangaRequests.push(newRequest);
  saveRequests();
  
  const emailBody = `[1]📋 NUOVA RICHIESTA MANGA\n\n📅 Data: ${new Date().toLocaleString()}\n👤 Richiedente: ${requester}\n📖 Titolo: ${title}\n✍️ Autore: ${author || 'Non specificato'}\n🔗 URL: ${url || 'Non specificato'}\n💬 Motivo: ${reason || 'Nessuno'}\n🖼️ Cover: ${cover || 'Non fornita'}\n🏷️ Stato locale: ⏳ In attesa`;
  
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://formsubmit.co/${ADMIN_EMAIL}`;
  form.style.display = 'none';
  
  const inputMessage = document.createElement('input');
  inputMessage.name = 'message';
  inputMessage.value = emailBody;
  
  const inputSubject = document.createElement('input');
  inputSubject.name = '_subject';
  inputSubject.value = `📬 KitsuManga - Nuova richiesta: ${title}`;
  
  const inputFormat = document.createElement('input');
  inputFormat.name = '_format';
  inputFormat.value = 'text';
  
  const inputNext = document.createElement('input');
  inputNext.name = '_next';
  inputNext.value = window.location.href;
  
  form.appendChild(inputMessage);
  form.appendChild(inputSubject);
  form.appendChild(inputFormat);
  form.appendChild(inputNext);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  
  document.getElementById('reqTitle').value = '';
  document.getElementById('reqAuthor').value = '';
  document.getElementById('reqCover').value = '';
  document.getElementById('reqUrl').value = '';
  document.getElementById('reqReason').value = '';
  document.getElementById('reqRequester').value = '';
  coverPreview.classList.remove('show');
  
  requestModal.classList.remove('active');
  showToast('✅ Richiesta inviata!');
}

function addBug() {
  const type = document.getElementById('bugType').value;
  const title = document.getElementById('bugTitle').value.trim();
  const description = document.getElementById('bugDescription').value.trim();
  const page = document.getElementById('bugPage').value.trim();
  const reporter = document.getElementById('bugReporter').value.trim();
  
  if (!title || !description || !reporter) {
    showToast('❌ Titolo, descrizione e nome sono obbligatori', true);
    return;
  }
  
  const newBug = {
    id: Date.now(),
    type, title, description, page, reporter,
    date: new Date().toISOString(),
    status: 'pending'
  };
  
  bugReports.push(newBug);
  saveBugs();
  
  const tipoLabel = {
    'visual': '🎨 Problema visivo',
    'functional': '⚙️ Problema funzionale',
    'loading': '🔄 Problema di caricamento',
    'reader': '📖 Problema nel lettore',
    'other': '📝 Altro'
  };
  
  const emailBody = `🐛 NUOVA SEGNALAZIONE BUG\n\n📅 Data: ${new Date().toLocaleString()}\n👤 Segnalato da: ${reporter}\n🏷️ Tipo: ${tipoLabel[type] || type}\n📝 Titolo: ${title}\n📄 Descrizione: ${description}\n📍 Pagina: ${page || 'Non specificata'}\n🏷️ Stato locale: ⏳ In attesa`;
  
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://formsubmit.co/${ADMIN_EMAIL}`;
  form.style.display = 'none';
  
  const inputMessage = document.createElement('input');
  inputMessage.name = 'message';
  inputMessage.value = emailBody;
  
  const inputSubject = document.createElement('input');
  inputSubject.name = '_subject';
  inputSubject.value = `📬 KitsuManga - Nuovo bug: ${title}`;
  
  const inputFormat = document.createElement('input');
  inputFormat.name = '_format';
  inputFormat.value = 'text';
  
  const inputNext = document.createElement('input');
  inputNext.name = '_next';
  inputNext.value = window.location.href;
  
  form.appendChild(inputMessage);
  form.appendChild(inputSubject);
  form.appendChild(inputFormat);
  form.appendChild(inputNext);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  
  document.getElementById('bugType').value = 'visual';
  document.getElementById('bugTitle').value = '';
  document.getElementById('bugDescription').value = '';
  document.getElementById('bugPage').value = '';
  document.getElementById('bugReporter').value = '';
  
  bugModal.classList.remove('active');
  showToast('✅ Segnalazione inviata!');
}

function renderRequestsTab() {
  const existingBtn = document.getElementById('sendRequestsEmailBtn');
  if (!existingBtn) {
    const btnContainer = document.createElement('div');
    btnContainer.style.textAlign = 'center';
    btnContainer.style.margin = '20px 0';
    btnContainer.innerHTML = `<button id="sendRequestsEmailBtn" style="background: #10b981; border: none; color: white; padding: 12px 30px; border-radius: 30px; cursor: pointer; font-size: 1rem; font-weight: bold;">📧 Invia tutte le richieste all'amministratore</button>`;
    grid.parentNode.insertBefore(btnContainer, grid);
    document.getElementById('sendRequestsEmailBtn')?.addEventListener('click', inviaTutteLeRichieste);
  }
  
  if (mangaRequests.length === 0) {
    grid.innerHTML = '<div class="no-results">📭 Nessuna richiesta inviata.</div>';
    return;
  }
  
  grid.innerHTML = '';
  const pending = mangaRequests.filter(r => r.status === 'pending');
  const approved = mangaRequests.filter(r => r.status === 'approved');
  const rejected = mangaRequests.filter(r => r.status === 'rejected');
  
  pending.forEach(req => grid.appendChild(createRequestCard(req)));
  approved.forEach(req => grid.appendChild(createRequestCard(req)));
  rejected.forEach(req => grid.appendChild(createRequestCard(req)));
}

function renderBugsTab() {
  const existingBtn = document.getElementById('sendBugsEmailBtn');
  if (!existingBtn) {
    const btnContainer = document.createElement('div');
    btnContainer.style.textAlign = 'center';
    btnContainer.style.margin = '20px 0';
    btnContainer.innerHTML = `<button id="sendBugsEmailBtn" style="background: #10b981; border: none; color: white; padding: 12px 30px; border-radius: 30px; cursor: pointer; font-size: 1rem; font-weight: bold;">📧 Invia tutte le segnalazioni all'amministratore</button>`;
    grid.parentNode.insertBefore(btnContainer, grid);
    document.getElementById('sendBugsEmailBtn')?.addEventListener('click', inviaTuttiIBug);
  }
  
  if (bugReports.length === 0) {
    grid.innerHTML = '<div class="no-results">🐛 Nessuna segnalazione bug.</div>';
    return;
  }
  
  grid.innerHTML = '';
  const pending = bugReports.filter(b => b.status === 'pending');
  const fixed = bugReports.filter(b => b.status === 'fixed');
  
  pending.forEach(bug => grid.appendChild(createBugCard(bug)));
  fixed.forEach(bug => grid.appendChild(createBugCard(bug)));
}

function createRequestCard(req) {
  const card = document.createElement('div');
  card.className = 'card';
  
  let statusClass = '', statusLabel = '';
  if (req.status === 'pending') { statusClass = 'status-pending'; statusLabel = '⏳ In attesa'; }
  else if (req.status === 'approved') { statusClass = 'status-approved'; statusLabel = '✅ Approvata'; }
  else { statusClass = 'status-rejected'; statusLabel = '❌ Respinta'; }
  
  const coverUrl = req.cover?.startsWith('http') ? req.cover : `https://placehold.co/300x400/1a1a2e/a78bfa?text=${encodeURIComponent(req.title)}`;
  
  card.innerHTML = `
    <div class="request-badge">📋 RICHIESTO</div>
    <div class="status-badge ${statusClass}">${statusLabel}</div>
    <img src="${coverUrl}" alt="${req.title}" onerror="this.src='https://placehold.co/300x400/1a1a2e/a78bfa?text=${encodeURIComponent(req.title)}'">
    <div class="info">
      <div class="title">${escapeHtml(req.title)}</div>
      <div class="chapter">Richiesto da: ${escapeHtml(req.requester)}</div>
      ${req.author ? `<div class="chapter" style="font-size: 11px;">✍️ ${escapeHtml(req.author)}</div>` : ''}
    </div>
  `;
  return card;
}

function createBugCard(bug) {
  const card = document.createElement('div');
  card.className = 'card';
  
  const typeLabels = { 'visual': '🎨 Visivo', 'functional': '⚙️ Funzionale', 'loading': '🔄 Caricamento', 'reader': '📖 Lettore', 'other': '📝 Altro' };
  const statusClass = bug.status === 'fixed' ? 'status-approved' : 'status-pending';
  const statusLabel = bug.status === 'fixed' ? '✅ Risolto' : '⏳ In attesa';
  
  card.innerHTML = `
    <div class="bug-badge">🐛 ${typeLabels[bug.type] || bug.type}</div>
    <div class="status-badge ${statusClass}">${statusLabel}</div>
    <img src="https://placehold.co/300x400/1a1a2e/f59e0b?text=BUG" alt="Bug">
    <div class="info">
      <div class="title">${escapeHtml(bug.title)}</div>
      <div class="chapter">Segnalato da: ${escapeHtml(bug.reporter)}</div>
      <div class="chapter" style="font-size: 11px;">📅 ${new Date(bug.date).toLocaleDateString()}</div>
      <div class="chapter" style="font-size: 11px; margin-top: 5px;">💬 ${escapeHtml(bug.description.substring(0, 60))}${bug.description.length > 60 ? '...' : ''}</div>
    </div>
  `;
  return card;
}

async function loadLocalMangas() {
  try {
    const res = await fetch(`data/manga.json?t=${Date.now()}`);
    const data = await res.json();
    mangasLocal = data.map(m => ({ ...m, type: 'local' }));
  } catch (e) {
    mangasLocal = [];
  }
}

async function loadExternalMangas(forceReload = false) {
  try {
    const res = await fetch(`data/external.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      mangasExternal = data.map(m => ({ ...m, type: 'external' }));
      sessionStorage.setItem('externalMangas', JSON.stringify(mangasExternal));
      return true;
    }
  } catch (e) {}
  
  const cached = sessionStorage.getItem('externalMangas');
  mangasExternal = cached ? JSON.parse(cached) : [];
  return false;
}

function sortByTitle(a, b) { return a.title.localeCompare(b.title); }
function sortByTitleDesc(a, b) { return b.title.localeCompare(a.title); }
function sortByLatest(a, b) {
  const getNumber = (str) => { const match = str?.match(/\d+/); return match ? parseInt(match[0]) : 0; };
  return getNumber(b.latest) - getNumber(a.latest);
}
function sortByLatestDesc(a, b) {
  const getNumber = (str) => { const match = str?.match(/\d+/); return match ? parseInt(match[0]) : 0; };
  return getNumber(a.latest) - getNumber(b.latest);
}

function filterItems(items, searchTerm) {
  if (!searchTerm.trim()) return items;
  const term = searchTerm.toLowerCase().trim();
  return items.filter(item => {
    if (item.title?.toLowerCase().includes(term)) return true;
    if (item.requester?.toLowerCase().includes(term)) return true;
    if (item.reporter?.toLowerCase().includes(term)) return true;
    if (item.latest && item.latest.toLowerCase().includes(term)) return true;
    if (item.author) {
      if (Array.isArray(item.author)) {
        if (item.author.some(a => a.toLowerCase().includes(term))) return true;
      } else {
        if (item.author.toLowerCase().includes(term)) return true;
      }
    }
    if (item.genres && Array.isArray(item.genres)) {
      if (item.genres.some(g => g.toLowerCase().includes(term))) return true;
    }
    return false;
  });
}

function renderMangas(mangas) {
  if (mangas.length === 0) {
    grid.innerHTML = `<div class="no-results">😕 Nessun manga trovato.</div>`;
    return;
  }

  grid.innerHTML = "";
  mangas.forEach(m => {
    const card = document.createElement("div");
    card.className = "card";
    const externalBadge = m.type === 'external' ? '<div class="external-badge">🌐 ESTERNO</div>' : '';
    card.innerHTML = `
      ${externalBadge}
      <img src="${m.cover}" alt="${m.title}" onerror="this.src='https://placehold.co/300x400/1a1a2e/a78bfa?text=${encodeURIComponent(m.title)}'">
      <div class="info">
        <div class="title">${escapeHtml(m.title)}</div>
        <div class="chapter">${m.latest || 'Nessun capitolo'}</div>
        ${m.author ? `<div class="chapter" style="font-size: 11px;">✍️ ${Array.isArray(m.author) ? escapeHtml(m.author.join(', ')) : escapeHtml(m.author)}</div>` : ''}
      </div>
    `;
    card.onclick = function() {
      if (m.type === 'local') {
        window.location.href = 'pages/manga-detail.html?manga=' + encodeURIComponent(m.id) + '&title=' + encodeURIComponent(m.title);
      } else {
        window.location.href = `external-reader.html?url=${encodeURIComponent(m.externalUrl)}&title=${encodeURIComponent(m.title)}`;
      }
    };
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateResultsInfo(filteredCount, totalCount, searchTerm) {
  const tabLabels = { local: 'manga locali', external: 'manga esterni', requests: 'richieste', bugs: 'segnalazioni bug' };
  const tabLabel = tabLabels[currentTab] || 'manga';
  
  if (searchTerm?.trim()) {
    resultsInfo.innerHTML = `🔍 Trovati ${filteredCount} ${tabLabel} su ${totalCount} per "${escapeHtml(searchTerm.trim())}"`;
  } else {
    resultsInfo.innerHTML = `📚 Totale: ${totalCount} ${tabLabel}`;
  }
}

function getCurrentItems() {
  if (currentTab === 'local') return [...mangasLocal];
  if (currentTab === 'external') return [...mangasExternal];
  if (currentTab === 'requests') return [...mangaRequests];
  if (currentTab === 'bugs') return [...bugReports];
  if (currentTab === 'reading') return loadLists().reading;
  if (currentTab === 'plan') return loadLists().plan;
  if (currentTab === 'completed') return loadLists().completed;
  return [];
}

function renderRequestsTabContent(requests) {
  if (requests.length === 0) {
    grid.innerHTML = '<div class="no-results">📭 Nessuna richiesta trovata</div>';
    return;
  }
  grid.innerHTML = '';
  requests.forEach(req => grid.appendChild(createRequestCard(req)));
}

function renderBugsTabContent(bugs) {
  if (bugs.length === 0) {
    grid.innerHTML = '<div class="no-results">🐛 Nessuna segnalazione trovata</div>';
    return;
  }
  grid.innerHTML = '';
  bugs.forEach(bug => grid.appendChild(createBugCard(bug)));
}

function applySortAndFilter() {
  if (currentTab === 'requests' || currentTab === 'bugs') {
    const items = getCurrentItems();
    const filtered = filterItems(items, currentSearchTerm);
    if (currentTab === 'requests') renderRequestsTabContent(filtered);
    else renderBugsTabContent(filtered);
    updateResultsInfo(filtered.length, items.length, currentSearchTerm);
    return;
  }
  
  if (currentTab === 'reading' || currentTab === 'plan' || currentTab === 'completed') {
    renderListTab(currentTab);
    return;
  }
  
  const sortType = sortSelect.value;
  let mangas = getCurrentItems();
  const totalCount = mangas.length;
  let filtered = filterItems(mangas, currentSearchTerm);
  
  if (sortType === 'title') filtered.sort(sortByTitle);
  else if (sortType === 'title-desc') filtered.sort(sortByTitleDesc);
  else if (sortType === 'latest') filtered.sort(sortByLatest);
  else if (sortType === 'latest-desc') filtered.sort(sortByLatestDesc);
  
  renderMangas(filtered);
  updateResultsInfo(filtered.length, totalCount, currentSearchTerm);
}

function handleSearch() {
  currentSearchTerm = searchInput.value;
  searchClear.style.display = currentSearchTerm.length > 0 ? 'flex' : 'none';

  // Per MangaEsterni: NON fare ricerca in tempo reale, aspetta il bottone
  if (currentTab === 'external') {
    // Non fare nulla in tempo reale
    return;
  }
  applySortAndFilter();
}

function clearSearch() {
  searchInput.value = '';
  currentSearchTerm = '';
  searchClear.style.display = 'none';
  applySortAndFilter();
  searchInput.focus();
}

function updateAddButton() {
  const showButton = ['local', 'external', 'requests', 'bugs'].includes(currentTab);
  addMangaBtn.style.display = showButton ? 'flex' : 'none';
}

async function switchTab(tab) {
  currentTab = tab;
  tabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
  
  const isListTab = ['reading', 'plan', 'completed'].includes(tab);
  sortSelect.style.display = isListTab ? 'none' : 'block';

  // 🔽 MOSTRA/NASCONDI IL BOTTONE DI RICERCA
  if (tab === 'external') {
    searchSubmitBtn.style.display = 'block';
    searchInput.placeholder = '🔍 Cerca manga su MangaWorld...';
  } else {
    searchSubmitBtn.style.display = 'none';
    searchInput.placeholder = '🔍 Cerca manga per nome, autore o genere...';
  }
  
  if (tab === 'external') await loadExternalMangas(true);
  if (tab === 'requests') loadRequests();
  if (tab === 'bugs') loadBugs();
  if (isListTab) {
    setActiveList(tab);
    renderListTab(tab);
  } else {
    searchInput.value = '';
    currentSearchTerm = '';
    searchClear.style.display = 'none';
    updateAddButton();
    applySortAndFilter();
  }
}

async function reloadAllData() {
  showToast('🔄 Ricaricamento in corso...');
  await loadLocalMangas();
  await loadExternalMangas(true);
  loadRequests();
  loadBugs();
  updateListCounts();
  applySortAndFilter();
  showToast('✅ Dati ricaricati! Ricarico la pagina...');

  setTimeout(() => {
    window.location.reload(true);
  }, 1000);
}

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentAdminTab = btn.dataset.adminTab;
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (currentAdminTab === 'requests') {
      document.getElementById('adminRequestsList').style.display = 'block';
      document.getElementById('adminBugsList').style.display = 'none';
      renderAdminRequests();
    } else {
      document.getElementById('adminRequestsList').style.display = 'none';
      document.getElementById('adminBugsList').style.display = 'block';
      renderAdminBugs();
    }
  });
});

async function loadAllMangas() {
  await loadLocalMangas();
  await loadExternalMangas(true);
  loadRequests();
  loadBugs();
  initListsUI();
  updateAddButton();
  applySortAndFilter();
}

sortSelect.addEventListener('change', applySortAndFilter);
searchInput.addEventListener('input', handleSearch);
searchClear.addEventListener('click', clearSearch);
reloadBtn.addEventListener('click', reloadAllData);
adminBtn.addEventListener('click', authenticateAdmin);
bugBtn.addEventListener('click', () => bugModal.classList.add('active'));
closeAdmin.addEventListener('click', () => adminPanel.classList.remove('active'));

submitRequest.addEventListener('click', (e) => {
  e.preventDefault();
  addRequest();
});

submitBug.addEventListener('click', (e) => {
  e.preventDefault();
  addBug();
});

closeRequestModal.addEventListener('click', () => requestModal.classList.remove('active'));
closeBugModal.addEventListener('click', () => bugModal.classList.remove('active'));
document.getElementById('importFromEmailBtn')?.addEventListener('click', importFromEmail);

[requestModal, bugModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
});

tabs.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

addMangaBtn.onclick = () => {
  requestModal.classList.add('active');
};

// Inizializza il provider
const mangaWorldProvider = new MangaWorldProvider();
let isMangaWorldSearch = false;
let lastMangaWorldResults = [];

// Funzione per la ricerca su MangaWorld (chiamata dal bottone)
async function performMangaWorldSearch() {
  const searchTerm = searchInput.value.trim();
  
  if (!searchTerm) {
    showToast('📝 Inserisci un termine di ricerca', true);
    return;
  }
  
  if (currentTab !== 'external') {
    return;
  }
  
  // Mostra loading
  grid.innerHTML = `<div class="loading"><div class="spinner"></div><div>🔍 Cerco su MangaWorld: "${escapeHtml(searchTerm)}"...</div></div>`;
  resultsInfo.innerHTML = `🌐 Ricerca in corso su MangaWorld...`;
  
  const results = await mangaWorldProvider.searchManga(searchTerm);
  lastMangaWorldResults = results;
  
  if (results.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        😕 Nessun manga trovato su MangaWorld per "${escapeHtml(searchTerm)}"
        <br><br>
        <small>💡 Prova con un altro titolo</small>
      </div>
    `;
    resultsInfo.innerHTML = `❌ Nessun risultato su MangaWorld`;
    isMangaWorldSearch = false;
    return;
  }
  
  // Mostra i risultati
  grid.innerHTML = '';
  results.forEach(manga => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="external-badge">🌐 MANGAWORLD</div>
      <img src="${manga.cover}" alt="${manga.title}" onerror="this.src='https://placehold.co/300x400/1a1a2e/a78bfa?text=${encodeURIComponent(manga.title)}'">
      <div class="info">
        <div class="title">${escapeHtml(manga.title)}</div>
        <div class="chapter">📖 Fonte: MangaWorld</div>
      </div>
    `;
    
    card.onclick = () => {
      window.location.href = `pages/external-reader.html?url=${encodeURIComponent(manga.externalUrl)}&title=${encodeURIComponent(manga.title)}&source=mangaworld`;
    };
    
    grid.appendChild(card);
  });
  
  resultsInfo.innerHTML = `🌐 Trovati ${results.length} manga su MangaWorld per "${escapeHtml(searchTerm)}"`;
  isMangaWorldSearch = true;
  currentSearchTerm = searchTerm;
}

// Event listener per il bottone di ricerca (solo MangaWorld)
if (searchSubmitBtn) {
  searchSubmitBtn.addEventListener('click', performMangaWorldSearch);
}

// Premi INVIO nella barra di ricerca (solo per MangaWorld)
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && currentTab === 'external') {
    e.preventDefault();
    performMangaWorldSearch();
  }
});

console.log('✅ MangaWorld integrato! (ricerca manuale con bottone)');

loadAllMangas();