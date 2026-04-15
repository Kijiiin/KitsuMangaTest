// ============================================================
  // CONFIGURAZIONE IMAGEKIT
  // ============================================================
  const IMAGEKIT_BASE = 'https://cdn.jsdelivr.net/gh/Kijiiin/KitsuMangaUpload/manga';
  
  const urlParams = new URLSearchParams(window.location.search);
  const mangaId = urlParams.get('manga');
  const mangaTitle = decodeURIComponent(urlParams.get('title') || 'Manga');
  
  document.getElementById('mangaTitle').textContent = mangaTitle;
  document.getElementById('topBarTitle').textContent = mangaTitle;
  document.title = `${mangaTitle} - KitsuManga`;

  let contentType = null;
  let numbers = [];
  let mangaDetails = null;

  const contentDiv = document.getElementById('content');
  const typeBadge = document.getElementById('typeBadge');
  const heroBg = document.getElementById('heroBg');
  const coverImg = document.getElementById('coverImg');
  const genresContainer = document.getElementById('genresContainer');
  const descriptionContainer = document.getElementById('descriptionContainer');
  const readFirstBtn = document.getElementById('readFirstBtn');
  const continueBtn = document.getElementById('continueBtn');
  const statusBadge = document.getElementById('statusBadge');
  const yearBadge = document.getElementById('yearBadge');

  // ============================================================
  // GESTIONE PROGRESSO LETTURA (CONTINUA A LEGGERE)
  // ============================================================
  const PROGRESS_KEY = 'kitsumanga_reading_progress';
  
  function loadProgress() {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {
        return {};
      }
    }
    return {};
  }
  
  function saveProgress(mangaId, number, type) {
    const progress = loadProgress();
    progress[mangaId] = {
      number: number,
      type: type,
      timestamp: Date.now()
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }
  
  function getProgress(mangaId) {
    const progress = loadProgress();
    return progress[mangaId] || null;
  }
  
  function updateContinueButton() {
    const progress = getProgress(mangaId);
    
    if (progress && numbers.length > 0) {
      // Verifica che il numero salvato esista ancora nella lista
      const savedNumber = progress.number;
      const numberExists = numbers.includes(savedNumber);
      
      if (numberExists) {
        const label = contentType === 'volumes' ? 'Volume' : 'Capitolo';
        continueBtn.textContent = `▶ Continua da ${label} ${savedNumber}`;
        continueBtn.style.display = 'inline-block';
        continueBtn.href = `reader.html?manga=${encodeURIComponent(mangaId)}&title=${encodeURIComponent(mangaTitle)}&number=${savedNumber}&type=${progress.type}`;
        
        // Cambia il testo del primo pulsante
        readFirstBtn.textContent = `▶ Dal primo ${label.toLowerCase()}`;
        return;
      }
    }
    
    // Nessun progresso salvato o numero non più valido
    continueBtn.style.display = 'none';
    const label = contentType === 'volumes' ? 'Volume' : 'Capitolo';
    readFirstBtn.textContent = `▶ Inizia da ${label} 1`;
  }

  // ============================================================
  // GESTIONE LISTE PERSONALI
  // ============================================================
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
  
  function getCurrentList(mangaId) {
    const lists = loadLists();
    if (lists.reading.some(m => m.id === mangaId)) return 'reading';
    if (lists.plan.some(m => m.id === mangaId)) return 'plan';
    if (lists.completed.some(m => m.id === mangaId)) return 'completed';
    return null;
  }
  
  function getListName(type) {
    const names = { reading: 'Sto leggendo', plan: 'Da leggere', completed: 'Completato' };
    return names[type] || type;
  }
  
  function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }
  
  function addToList(listType) {
    const lists = loadLists();
    
    const manga = {
      id: mangaId,
      title: mangaTitle,
      cover: coverImg.src || `${IMAGEKIT_BASE}/${mangaId}/cover.jpg`,
      latest: mangaDetails?.latest || '',
      author: mangaDetails?.author ? (Array.isArray(mangaDetails.author) ? mangaDetails.author.join(', ') : mangaDetails.author) : ''
    };
    
    ['reading', 'plan', 'completed'].forEach(type => {
      lists[type] = lists[type].filter(m => m.id !== manga.id);
    });
    
    if (!lists[listType].some(m => m.id === manga.id)) {
      lists[listType].push(manga);
    }
    
    saveLists(lists);
    updateButtonStates(listType);
    showToast(`✅ Aggiunto a "${getListName(listType)}"`);
  }
  
  function updateButtonStates(activeList) {
    const buttons = document.querySelectorAll('.list-btn');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.list === activeList) {
        btn.classList.add('active');
      }
    });
  }
  
  function initListButtons() {
    const currentList = getCurrentList(mangaId);
    updateButtonStates(currentList);
    
    document.getElementById('readingBtn').addEventListener('click', () => addToList('reading'));
    document.getElementById('planBtn').addEventListener('click', () => addToList('plan'));
    document.getElementById('completedBtn').addEventListener('click', () => addToList('completed'));
  }

  async function loadMangaDetails() {
    try {
      const res = await fetch('../data/manga.json');
      if (res.ok) {
        const mangas = await res.json();
        const mangaData = mangas.find(m => m.id === mangaId);
        if (mangaData) {
          mangaDetails = mangaData;
          
          if (mangaDetails.cover) {
            coverImg.src = mangaDetails.cover;
            heroBg.style.backgroundImage = `url(${mangaDetails.cover})`;
          } else {
            coverImg.src = `${IMAGEKIT_BASE}/${mangaId}/cover.jpg`;
            heroBg.style.backgroundImage = `url(${IMAGEKIT_BASE}/${mangaId}/cover.jpg)`;
          }
          
          if (mangaDetails.description) {
            descriptionContainer.innerHTML = `<p>${escapeHtml(mangaDetails.description)}</p>`;
          } else {
            descriptionContainer.innerHTML = `<p>Nessuna descrizione disponibile per questo manga.</p>`;
          }
          
          if (mangaDetails.genres && mangaDetails.genres.length > 0) {
            genresContainer.innerHTML = mangaDetails.genres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');
          } else {
            genresContainer.innerHTML = '<span class="genre-tag">🎭 Generi non specificati</span>';
          }
          // Mostra l'autore
const authorContainer = document.getElementById('authorContainer');
if (authorContainer) {
  if (mangaDetails.author) {
    const authorText = Array.isArray(mangaDetails.author) ? mangaDetails.author.join(', ') : mangaDetails.author;
    authorContainer.innerHTML = `✍️ ${escapeHtml(authorText)}`;
  } else {
    authorContainer.innerHTML = '';
  }
}
          
          if (mangaDetails.status) {
            const statusMap = {
              'ongoing': '🟢 In corso',
              'completed': '✅ Completato',
              'hiatus': '⏸️ In pausa',
              'cancelled': '❌ Cancellato'
            };
            statusBadge.innerHTML = statusMap[mangaDetails.status] || `📌 ${mangaDetails.status}`;
          }
          
          if (mangaDetails.year) {
            yearBadge.innerHTML = `📅 ${mangaDetails.year}`;
          }
          
          initListButtons();
          
          return true;
        }
      }
    } catch(e) {
      console.log('Impossibile caricare dettagli manga');
    }
    
    coverImg.src = `${IMAGEKIT_BASE}/${mangaId}/cover.jpg`;
    heroBg.style.backgroundImage = `url(${IMAGEKIT_BASE}/${mangaId}/cover.jpg)`;
    descriptionContainer.innerHTML = `<p>Nessuna descrizione disponibile per questo manga.</p>`;
    genresContainer.innerHTML = '<span class="genre-tag">🎭 Generi non specificati</span>';
    
    initListButtons();
    
    return false;
  }

  async function loadFromManifest() {
    try {
      const manifestUrl = `${IMAGEKIT_BASE}/${mangaId}/manifest.json?t=${Date.now()}`;
      const res = await fetch(manifestUrl);
      if (res.ok) {
        const manifest = await res.json();
        contentType = manifest.type;
        numbers = manifest.numbers;
        
        if (contentType === 'volumes') {
          typeBadge.textContent = '📚 FORMATO VOLUMI';
        } else if (contentType === 'chapters') {
          typeBadge.textContent = '📖 FORMATO CAPITOLI';
        } else {
          throw new Error('Tipo non valido');
        }
        
        renderContent();
        return true;
      }
    } catch(e) {
      console.log('manifest.json non trovato su KitsuMangaUpload');
    }
    return false;
  }

  function showManifestGuide() {
    const exampleNumbers = contentType === 'volumes' ? '[1, 2, 3]' : '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]';
    const exampleType = contentType === 'volumes' ? 'volumes' : 'chapters';
    
    contentDiv.innerHTML = `
      <div class="empty">
        <h3>📝 File manifest.json mancante</h3>
        <p>Crea il file su KitsuMangaUpload:</p>
        <p><code style="background: #1a1a2e; padding: 2px 5px; border-radius: 3px;">${IMAGEKIT_BASE}/${mangaId}/manifest.json</code></p>
        <p>con questo contenuto:</p>
        <pre style="background: #1a1a2e; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: left; overflow-x: auto;">{
  "type": "${exampleType}",
  "numbers": ${exampleNumbers}
}</pre>
        <p><small>💡 I numeri sono l'elenco dei volumi/capitoli che hai</small></p>
        <button onclick="location.reload()" style="background: #8b5cf6; border: none; color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px;">↻ Ricarica dopo aver creato il file</button>
      </div>
    `;
  }

  function renderContent() {
    if (!contentType || numbers.length === 0) {
      contentDiv.innerHTML = '<div class="empty">📭 Nessun volume/capitolo trovato</div>';
      return;
    }
    
    const label = contentType === 'volumes' ? 'Volume' : 'Capitolo';
    const labelPlural = contentType === 'volumes' ? 'Volumi' : 'Capitoli';
    const gridClass = contentType === 'volumes' ? 'volumes-grid' : 'chapters-grid';
    
    // Ottieni il progresso per evidenziare il capitolo corrente
    const progress = getProgress(mangaId);
    const savedNumber = progress ? progress.number : null;
    
    let html = `
      <div class="stats fade-up">
        <div class="stat-card">
          <div class="stat-number">${numbers.length}</div>
          <div class="stat-label">${labelPlural} totali</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${contentType === 'volumes' ? '📚' : '📖'}</div>
          <div class="stat-label">Formato ${labelPlural}</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">🆕</div>
          <div class="stat-label">Ultimo ${label.toLowerCase()} ${numbers[numbers.length - 1]}</div>
        </div>
      </div>
      <h2 class="section-title fade-up">📚 ${labelPlural} disponibili</h2>
      <div class="${gridClass} fade-up" id="itemsGrid">
    `;
    
    numbers.forEach(num => {
      const isContinued = (num === savedNumber);
      const continuedClass = isContinued ? 'continued' : '';
      const continuedBadge = isContinued ? '<span class="continued-badge">📌 Qui</span>' : '';
      
      html += `
        <div class="${contentType === 'volumes' ? 'volume-card' : 'chapter-card'} ${continuedClass}" onclick="openReader(${num})">
          ${continuedBadge}
          <div class="${contentType === 'volumes' ? 'volume-number' : 'chapter-number'}">${num}</div>
          <div class="${contentType === 'volumes' ? 'volume-label' : 'chapter-label'}">${label} ${num}</div>
          <div class="read-chapter-btn">▶ Leggi</div>
        </div>
      `;
    });
    
    html += `</div>`;
    html += `<div class="info-manifest fade-up">📄 Basato su manifest.json da KitsuMangaUpload</div>`;
    contentDiv.innerHTML = html;
    
    const fadeElements = document.querySelectorAll('.fade-up');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    
    fadeElements.forEach(el => observer.observe(el));
    
    // Aggiorna i pulsanti di lettura
    if (numbers.length > 0) {
      readFirstBtn.href = `reader.html?manga=${encodeURIComponent(mangaId)}&title=${encodeURIComponent(mangaTitle)}&number=${numbers[0]}&type=${contentType}`;
      updateContinueButton();
    }
  }

  function openReader(number) {
    // Salva il progresso quando l'utente clicca su un capitolo/volume
    saveProgress(mangaId, number, contentType);
    
    window.location.href = `reader.html?manga=${encodeURIComponent(mangaId)}&title=${encodeURIComponent(mangaTitle)}&number=${number}&type=${contentType}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  async function init() {
    if (!mangaId) {
      contentDiv.innerHTML = '<div class="error">❌ Nessun manga specificato</div>';
      return;
    }
    
    await loadMangaDetails();
    const loaded = await loadFromManifest();
    
    if (!loaded) {
      showManifestGuide();
    }
  }

  window.openReader = openReader;
  
  init();