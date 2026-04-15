// js/manga-world-api.js
// API per MangaWorld - Versione robusta

class MangaWorldAPI {
  constructor() {
    this.api = 'https://www.mangaworld.cx';
    this.corsProxy = 'https://api.allorigins.win/raw?url=';
  }

  // Cerca manga
  async searchManga(query) {
    const queryParam = query.toLowerCase();
    const url = `${this.api}/archive?keyword=${encodeURIComponent(queryParam)}`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);
    
    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const mangaEntries = doc.querySelectorAll('div.comics-grid > div.entry');
      const results = [];
      
      for (const entry of mangaEntries) {
        const titleLink = entry.querySelector('a.manga-title');
        const title = titleLink?.getAttribute('title') || '';
        const thumbImg = entry.querySelector('a.thumb img');
        const thumbnailUrl = thumbImg?.getAttribute('src') || '';
        const mangaLink = entry.querySelector('a.thumb')?.getAttribute('href') || '';
        const mangaId = mangaLink.split('manga/')[1]?.split('/')[0] || '';
        
        if (title && mangaId) {
          results.push({
            id: mangaId,
            title: title,
            cover: thumbnailUrl,
            type: 'external',
            source: 'mangaworld'
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Errore ricerca:', error);
      return [];
    }
  }

  // Trova capitoli - Versione con MULTIPLI SELETTORI
  async findChapters(mangaId) {
    const url = `${this.api}/manga/${mangaId}`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);
    
    console.log('🔍 Caricamento pagina:', proxyUrl);
    
    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();
      
      // DEBUG: Salva HTML per analisi
      console.log('HTML ricevuto, lunghezza:', html.length);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const chapters = [];
      
      // Prova diversi selettori (MangaWorld può cambiare struttura)
      const selectors = [
        // Selettori dal provider originale
        'div.chapters-wrapper div.chapter a',
        'div.chapters-wrapper div.volume-chapters div a',
        'div.chapter a',
        'a[href*="/read/"]',
        // Selettori aggiuntivi
        '.chapter-list a',
        '.chapternumber a',
        'li.chapter a',
        'div[class*="chapter"] a'
      ];
      
      let links = [];
      let usedSelector = '';
      
      for (const selector of selectors) {
        links = doc.querySelectorAll(selector);
        if (links.length > 0) {
          usedSelector = selector;
          console.log(`✅ Selettore trovato: "${selector}" -> ${links.length} link`);
          break;
        }
      }
      
      // Se nessun selettore funziona, cerca TUTTI i link che contengono "/read/"
      if (links.length === 0) {
        links = doc.querySelectorAll('a[href*="/read/"]');
        usedSelector = 'a[href*="/read/"]';
        console.log(`🔍 Link con /read/ trovati: ${links.length}`);
      }
      
      // Se ancora niente, cerca qualsiasi link con "capitolo" nel testo
      if (links.length === 0) {
        const allLinks = doc.querySelectorAll('a');
        links = Array.from(allLinks).filter(a => 
          a.textContent.toLowerCase().includes('capitolo') ||
          a.textContent.toLowerCase().includes('chapter')
        );
        console.log(`🔍 Link con testo "capitolo" trovati: ${links.length}`);
      }
      
      for (const link of links) {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        
        if (href && href.includes('/read/')) {
          // Estrai l'ID del capitolo
          let chapterId = href.split('/read/')[1]?.split('/')[0] || href.split('/read/')[1];
          if (chapterId.includes('?')) chapterId = chapterId.split('?')[0];
          
          // Estrai il numero del capitolo
          let chapterNum = text.match(/\d+(?:\.\d+)?/);
          let chapterNumber = chapterNum ? chapterNum[0] : '?';
          
          // Costruisci URL completo
          let fullUrl = href.startsWith('http') ? href : `${this.api}${href}`;
          if (!fullUrl.includes('?style=list')) {
            fullUrl = fullUrl + '?style=list';
          }
          
          chapters.push({
            id: chapterId,
            url: fullUrl,
            title: text,
            chapter: chapterNumber,
            index: parseFloat(chapterNumber)
          });
        }
      }
      
      // Rimuovi duplicati per ID
      const uniqueChapters = [];
      const seenIds = new Set();
      for (const chap of chapters) {
        if (!seenIds.has(chap.id)) {
          seenIds.add(chap.id);
          uniqueChapters.push(chap);
        }
      }
      
      // Ordina per numero di capitolo (dal più vecchio al più recente)
      uniqueChapters.sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));
      
      console.log(`📚 Trovati ${uniqueChapters.length} capitoli unici per ${mangaId}`);
      if (uniqueChapters.length > 0) {
        console.log(`Primo capitolo: ${uniqueChapters[0].chapter}, Ultimo: ${uniqueChapters[uniqueChapters.length-1].chapter}`);
      }
      
      return uniqueChapters;
      
    } catch (error) {
      console.error('❌ Errore findChapters:', error);
      return [];
    }
  }

  // Trova le pagine di un capitolo
  async findChapterPages(chapterId) {
    const url = `${this.api}/manga/${chapterId}?style=list`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);
    
    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const pages = [];
      const images = doc.querySelectorAll('div#page img, .reading-content img, img[src*="mangaworld"]');
      
      images.forEach((img, index) => {
        const imgUrl = img.getAttribute('src');
        if (imgUrl && imgUrl.startsWith('http')) {
          pages.push({
            url: imgUrl,
            index: index
          });
        }
      });
      
      console.log(`📖 Trovate ${pages.length} pagine per capitolo ${chapterId}`);
      return pages;
    } catch (error) {
      console.error('Errore findChapterPages:', error);
      return [];
    }
  }
}

window.MangaWorldAPI = MangaWorldAPI;