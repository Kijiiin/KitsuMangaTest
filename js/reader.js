<script>
  // ============================================================
  // CONFIGURAZIONE IMAGEKIT
  // ============================================================
  const IMAGEKIT_BASE = 'https://cdn.jsdelivr.net/gh/Kijiiin/KitsuMangaUpload/manga';
  const IMAGEKIT_OPTIONS = 'tr=w-1200,q-80,f-auto';
  
  // ============================================================
  // GESTIONE PROGRESSO LETTURA
  // ============================================================
  const PROGRESS_KEY = 'kitsumanga_reading_progress';
  
  function saveReadingProgress() {
    if (!mangaId || !contentType) return;
    
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    progress[mangaId] = {
      number: currentNumber,
      type: contentType,
      page: currentPageIndex,
      totalPages: totalPages,
      timestamp: Date.now()
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }
  
  function getSavedPage() {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    const saved = progress[mangaId];
    
    if (saved && saved.number === currentNumber && saved.page !== undefined) {
      return Math.min(saved.page, totalPages - 1);
    }
    return 0;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const mangaId = urlParams.get('manga');
  const mangaTitle = decodeURIComponent(urlParams.get('title') || 'Manga');
  const preloadNumber = urlParams.get('number');
  const preloadType = urlParams.get('type');
  
  document.getElementById('mangaTitle').textContent = mangaTitle;
  document.title = `${mangaTitle} - KitsuManga`;

  let contentType = preloadType || null;
  let currentNumber = preloadNumber ? parseInt(preloadNumber) : 1;
  let totalPages = 0;
  let allNumbers = [];
  let currentPageIndex = 0;
  let isLoadingChapter = false;
  let isFullscreenActive = false;
  let currentBasePath = '';
  let currentPageFiles = [];
  let hasRestoredPage = false;

  // Variabili per zoom
  let currentZoom = 1;
  let isZoomed = false;
  let panX = 0, panY = 0;
  let startPanX = 0, startPanY = 0;
  let isPanning = false;
  let initialDistance = 0;
  let initialZoom = 1;
  let currentZoomedImg = null;

  let startX = 0, currentX = 0, isDragging = false, dragStartTime = 0;
  const SWIPE_THRESHOLD = 50, SWIPE_MAX_TIME = 300;

  const topBar = document.getElementById('topBar');
  const desktopHud = document.getElementById('desktopHud');
  const readerContainer = document.getElementById('readerContainer');
  const readerWrapper = document.getElementById('readerWrapper');
  const chapterSelect = document.getElementById('chapterSelect');
  const typeBadge = document.getElementById('typeBadge');
  const selectorLabel = document.getElementById('selectorLabel');
  const pageIndicator = document.getElementById('pageIndicator');
  const mobilePageIndicator = document.getElementById('mobilePageIndicator');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const mobilePrevBtn = document.getElementById('mobilePrevBtn');
  const mobileNextBtn = document.getElementById('mobileNextBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const fullscreenBtnMobile = document.getElementById('fullscreenBtnMobile');
  const fullscreenExitBtn = document.getElementById('fullscreenExitBtn');
  const exitFullscreenMobile = document.getElementById('exitFullscreenMobile');

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }

  function toggleFullscreen() {
    isFullscreen() ? exitFullscreen() : enterFullscreen();
  }

  function updateFullscreenState() {
    const fs = isFullscreen();
    isFullscreenActive = fs;
    
    if (fs) {
      if (window.innerWidth > 768) {
        topBar.style.display = 'none';
        fullscreenExitBtn.style.display = 'flex';
      } else {
        fullscreenBtnMobile.style.display = 'none';
        exitFullscreenMobile.style.display = 'flex';
      }
    } else {
      if (window.innerWidth > 768) {
        topBar.style.display = '';
        desktopHud.style.display = '';
        fullscreenExitBtn.style.display = 'none';
      } else {
        fullscreenBtnMobile.style.display = 'flex';
        exitFullscreenMobile.style.display = 'none';
      }
    }
  }

  document.addEventListener('fullscreenchange', updateFullscreenState);
  document.addEventListener('webkitfullscreenchange', updateFullscreenState);

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  fullscreenBtnMobile.addEventListener('click', enterFullscreen);
  fullscreenExitBtn.addEventListener('click', exitFullscreen);
  exitFullscreenMobile.addEventListener('click', exitFullscreen);

  function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // ============================================================
  // ZOOM E PAN
  // ============================================================
  function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function resetZoom(img) {
    currentZoom = 1;
    isZoomed = false;
    panX = 0;
    panY = 0;
    img.style.transform = '';
    img.classList.remove('zoomed');
    currentZoomedImg = null;
  }

  function applyTransform(img) {
    if (isZoomed) {
      img.style.transform = `scale(${currentZoom}) translate(${panX}px, ${panY}px)`;
    } else {
      img.style.transform = '';
    }
  }

  function handleTouchStart(e) {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance = getDistance(e.touches);
      initialZoom = currentZoom;
      currentZoomedImg = img;
    } else if (e.touches.length === 1 && isZoomed) {
      e.preventDefault();
      isPanning = true;
      startPanX = e.touches[0].clientX - panX;
      startPanY = e.touches[0].clientY - panY;
    }
  }

  function handleTouchMove(e) {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / initialDistance;
      currentZoom = Math.min(Math.max(initialZoom * scale, 1), 4);
      isZoomed = currentZoom > 1;
      applyTransform(img);
      img.classList.toggle('zoomed', isZoomed);
    } else if (e.touches.length === 1 && isPanning && isZoomed) {
      e.preventDefault();
      panX = e.touches[0].clientX - startPanX;
      panY = e.touches[0].clientY - startPanY;
      applyTransform(img);
    }
  }

  function handleTouchEnd(e) {
    if (e.touches.length < 2) {
      initialDistance = 0;
    }
    if (e.touches.length === 0) {
      isPanning = false;
    }
  }

  function handleWheel(e) {
    e.preventDefault();
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    currentZoom = Math.min(Math.max(currentZoom * delta, 1), 4);
    isZoomed = currentZoom > 1;
    applyTransform(img);
    img.classList.toggle('zoomed', isZoomed);
    currentZoomedImg = img;
  }

  function handleDoubleClick(e) {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    
    if (isZoomed) {
      resetZoom(img);
    } else {
      currentZoom = 2;
      isZoomed = true;
      applyTransform(img);
      img.classList.add('zoomed');
      currentZoomedImg = img;
    }
  }

  function handleMouseDown(e) {
    const img = e.target;
    if (img.tagName !== 'IMG' || !isZoomed) return;
    
    e.preventDefault();
    isPanning = true;
    startPanX = e.clientX - panX;
    startPanY = e.clientY - panY;
    
    function onMouseMove(e) {
      if (!isPanning) return;
      panX = e.clientX - startPanX;
      panY = e.clientY - startPanY;
      applyTransform(img);
    }
    
    function onMouseUp() {
      isPanning = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function enableZoom(img) {
    img.removeEventListener('touchstart', handleTouchStart);
    img.removeEventListener('touchmove', handleTouchMove);
    img.removeEventListener('touchend', handleTouchEnd);
    img.removeEventListener('wheel', handleWheel);
    img.removeEventListener('dblclick', handleDoubleClick);
    img.removeEventListener('mousedown', handleMouseDown);
    
    img.addEventListener('touchstart', handleTouchStart, { passive: false });
    img.addEventListener('touchmove', handleTouchMove, { passive: false });
    img.addEventListener('touchend', handleTouchEnd);
    img.addEventListener('wheel', handleWheel, { passive: false });
    img.addEventListener('dblclick', handleDoubleClick);
    img.addEventListener('mousedown', handleMouseDown);
    
    resetZoom(img);
  }

  // ============================================================
  // SWIPE
  // ============================================================
  function initSwipe() {
    const wrapper = readerWrapper;
    
    wrapper.addEventListener('touchstart', (e) => {
      if (isZoomed) return;
      startX = e.touches[0].clientX;
      currentX = startX;
      isDragging = true;
      dragStartTime = Date.now();
      wrapper.style.transition = 'none';
    });
    
    wrapper.addEventListener('touchmove', (e) => {
      if (!isDragging || isZoomed) return;
      e.preventDefault();
      currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;
      const translateX = -currentPageIndex * readerContainer.clientWidth + deltaX;
      wrapper.style.transform = `translateX(${translateX}px)`;
    });
    
    wrapper.addEventListener('touchend', (e) => {
      if (!isDragging || isZoomed) return;
      isDragging = false;
      
      const deltaX = currentX - startX;
      const deltaTime = Date.now() - dragStartTime;
      const containerWidth = readerContainer.clientWidth;
      
      let shouldChange = false, goNext = false;
      
      if (deltaTime < SWIPE_MAX_TIME && Math.abs(deltaX) > 30) {
        shouldChange = true; goNext = deltaX < 0;
      } else if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        shouldChange = true; goNext = deltaX < 0;
      }
      
      if (shouldChange) {
        if (goNext && currentPageIndex < totalPages - 1) goToPage(currentPageIndex + 1);
        else if (!goNext && currentPageIndex > 0) goToPage(currentPageIndex - 1);
        else if (goNext) nextChapter();
        else prevChapter();
      } else {
        wrapper.style.transition = 'transform 0.2s ease-out';
        wrapper.style.transform = `translateX(${-currentPageIndex * containerWidth}px)`;
      }
      
      startX = currentX = 0;
    });
  }
  
  function goToPage(index) {
    if (index < 0 || index >= totalPages) return;
    currentPageIndex = index;
    readerWrapper.style.transition = 'transform 0.2s ease-out';
    readerWrapper.style.transform = `translateX(${-currentPageIndex * readerContainer.clientWidth}px)`;
    updateUI();
    saveReadingProgress();
  }
  
  function updateWrapperPosition() {
    readerWrapper.style.transition = 'none';
    readerWrapper.style.transform = `translateX(${-currentPageIndex * readerContainer.clientWidth}px)`;
  }

  async function loadManifest() {
    try {
      const res = await fetch(`${IMAGEKIT_BASE}/${mangaId}/manifest.json?t=${Date.now()}`);
      if (res.ok) {
        const manifest = await res.json();
        contentType = manifest.type;
        allNumbers = manifest.numbers;
        
        typeBadge.textContent = contentType === 'volumes' ? '📚 VOLUMI' : '📖 CAPITOLI';
        selectorLabel.textContent = contentType === 'volumes' ? 'Volume:' : 'Capitolo:';
        
        const label = contentType === 'volumes' ? 'Volume' : 'Capitolo';
        chapterSelect.innerHTML = allNumbers.map(n => `<option value="${n}" ${n == currentNumber ? 'selected' : ''}>${label} ${n}</option>`).join('');
        chapterSelect.disabled = false;
        
        chapterSelect.onchange = async (e) => {
          if (isLoadingChapter) return;
          currentNumber = parseInt(e.target.value);
          hasRestoredPage = false;
          await loadChapter();
        };
        return true;
      }
    } catch(e) {}
    return false;
  }

  async function changeChapter(newNumber) {
    if (isLoadingChapter || !allNumbers.includes(newNumber)) return false;
    isLoadingChapter = true;
    currentNumber = newNumber;
    chapterSelect.value = currentNumber;
    hasRestoredPage = false;
    await loadChapter();
    isLoadingChapter = false;
    return true;
  }

  async function nextChapter() {
    const idx = allNumbers.indexOf(currentNumber);
    if (idx < allNumbers.length - 1) {
      showToast(`${contentType === 'volumes' ? 'Volume' : 'Capitolo'} ${allNumbers[idx + 1]}`);
      await changeChapter(allNumbers[idx + 1]);
    } else {
      showToast(`🏁 Ultimo`);
    }
  }

  async function prevChapter() {
    const idx = allNumbers.indexOf(currentNumber);
    if (idx > 0) {
      showToast(`${contentType === 'volumes' ? 'Volume' : 'Capitolo'} ${allNumbers[idx - 1]}`);
      await changeChapter(allNumbers[idx - 1]);
    } else {
      showToast(`🏁 Primo`);
    }
  }

  async function loadChapter() {
    readerWrapper.innerHTML = '<div class="initial-loading"><div class="spinner"></div><div>Caricamento pagine...</div></div>';
    
    currentBasePath = `${IMAGEKIT_BASE}/${mangaId}/${currentNumber}`;
    
    let pageFiles = [];
    try {
      const res = await fetch(`${currentBasePath}/manifest.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          pageFiles = data;
        } else if (data.pages && Array.isArray(data.pages)) {
          pageFiles = data.pages.map(p => typeof p === 'string' ? p : p.file);
        }
      }
    } catch(e) {}
    
    if (pageFiles.length === 0) {
      let pageCount = 0;
      let found = true;
      while (found && pageCount < 200) {
        pageCount++;
        try {
          const testRes = await fetch(`${currentBasePath}/${pageCount}.jpg`, { method: 'HEAD' });
          if (!testRes.ok) {
            found = false;
            pageCount--;
          }
        } catch(e) {
          found = false;
          pageCount--;
        }
      }
      
      if (pageCount === 0) {
        readerWrapper.innerHTML = '<div class="empty">😕 Nessuna pagina trovata</div>';
        updateUI();
        return;
      }
      
      for (let i = 1; i <= pageCount; i++) {
        pageFiles.push(`${i}.jpg`);
      }
    }
    
    totalPages = pageFiles.length;
    currentPageFiles = pageFiles;
    
    renderPages(currentBasePath, pageFiles);
  }

  function renderPages(basePath, pageFiles) {
    readerWrapper.innerHTML = '';
    readerWrapper.style.transform = 'translateX(0px)';
    
    for (let i = 0; i < pageFiles.length; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      
      const img = document.createElement('img');
      img.src = `${basePath}/${pageFiles[i]}?${IMAGEKIT_OPTIONS}`;
      img.alt = `Pagina ${i + 1}`;
      img.loading = i < 3 ? 'eager' : 'lazy';
      img.fetchpriority = i < 3 ? 'high' : 'low';
      
      img.onload = () => img.classList.add('loaded');
      
      img.onerror = () => {
        img.src = `${basePath}/${pageFiles[i]}`;
      };
      
      enableZoom(img);
      
      pageDiv.appendChild(img);
      readerWrapper.appendChild(pageDiv);
    }
    
    let startPage = 0;
    
    if (!hasRestoredPage) {
      const savedPage = getSavedPage();
      if (savedPage > 0) {
        startPage = savedPage;
        hasRestoredPage = true;
        showToast(`📖 Ripreso da pagina ${startPage + 1}`);
      }
    }
    
    currentPageIndex = startPage;
    updateWrapperPosition();
    setTimeout(() => initSwipe(), 100);
    updateUI();
    
    saveReadingProgress();
  }

  async function nextPage() {
    if (currentPageIndex < totalPages - 1) goToPage(currentPageIndex + 1);
    else await nextChapter();
  }

  async function prevPage() {
    if (currentPageIndex > 0) goToPage(currentPageIndex - 1);
    else await prevChapter();
  }

  function updateUI() {
    if (totalPages > 0) {
      const text = `${currentPageIndex + 1} / ${totalPages}`;
      pageIndicator.textContent = text;
      mobilePageIndicator.textContent = text;
    }
  }

  window.addEventListener('resize', updateWrapperPosition);
  
  window.addEventListener('beforeunload', () => {
    saveReadingProgress();
  });
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveReadingProgress();
    }
  });

  document.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault(); await nextPage();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); await prevPage();
    }
  });

  prevBtn.onclick = prevPage;
  nextBtn.onclick = nextPage;
  mobilePrevBtn.onclick = prevPage;
  mobileNextBtn.onclick = nextPage;

  async function init() {
    if (!mangaId) {
      readerWrapper.innerHTML = '<div class="error">❌ Nessun manga specificato</div>';
      return;
    }
    
    const hasManifest = await loadManifest();
    
    if (!hasManifest) {
      readerWrapper.innerHTML = `
        <div class="empty">
          <h3>📝 File manifest.json mancante</h3>
          <p>Percorso: ${IMAGEKIT_BASE}/${mangaId}/manifest.json</p>
        </div>
      `;
      return;
    }
    
    if (!allNumbers.includes(currentNumber) && allNumbers.length > 0) {
      currentNumber = allNumbers[0];
      chapterSelect.value = currentNumber;
    }
    
    await loadChapter();
  }

  init();
</script>