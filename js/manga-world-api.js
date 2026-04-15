// js/manga-world-api.js
// Adattato dal provider Seanime per KitsuManga

class MangaWorldAPI {
  constructor() {
    this.api = 'https://www.mangaworld.cx';
    this.corsProxy = 'https://corsproxy.io/?url=';
  }

  // 1. Cerca manga
  async searchManga(query) {
    const queryParam = query.toLowerCase();
    const url = `${this.api}/archive?keyword=${encodeURIComponent(queryParam)}`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);
    
    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();
      
      // Parsing HTML nel browser
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

  // 2. Trova capitoli (ADATTATO DAL CODICE ORIGINALE)
  async findChapters(mangaId) {
    const url = `${this.api}/manga/${mangaId}`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);
    
    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const chapters = [];
      
      // CERCA IL WRAPPER DEI CAPITOLI (come nel codice originale)
      const chaptersWrapper = doc.querySelector('div.chapters-wrapper');
      if (!chaptersWrapper) {
        console.warn('Nessun wrapper capitoli trovato');
        return [];
      }
      
      // CONTROLLA SE CI SONO VOLUMI (come nel codice originale)
      const volumesContainer = chaptersWrapper.querySelector('div.volume-element');
      
      if (volumesContainer) {
        // CON VOLUMI
        const volumes = chaptersWrapper.querySelectorAll('div.volume-element');
        for (const volume of volumes) {
          const volumeChapters = volume.querySelectorAll('div.volume-chapters div');
          for (const chap of volumeChapters) {
            const link = chap.querySelector('a');
            if (link) {
              const href = link.getAttribute('href');
              const id = href.split('manga/')[1]?.split('?')[0] || '';
              const url = href.split('?')[0];
              const titleSpan = chap.querySelector('span');
              const title = titleSpan?.textContent || '';
              const chapter = title.split(' ')[1] || '0';
              
              chapters.push({
                id: id,
                url: url.startsWith('http') ? url : `${this.api}${url}`,
                title: title,
                chapter: chapter,
                index: parseFloat(chapter)
              });
            }
          }
        }
      } else {
        // SENZA VOLUMI (come nel codice originale)
        const chapterElements = chaptersWrapper.querySelectorAll('div.chapter');
        for (const chap of chapterElements) {
          const link = chap.querySelector('a');
          if (link) {
            const href = link.getAttribute('href');
            const id = href.split('manga/')[1]?.split('?')[0] || '';
            const url = href.split('?')[0];
            const titleSpan = chap.querySelector('span.d-inline-block');
            const title = titleSpan?.textContent || '';
            const chapter = title.split(' ')[1] || '0';
            
            chapters.push({
              id: id,
              url: url.startsWith('http') ? url : `${this.api}${url}`,
              title: title,
              chapter: chapter,
              index: parseFloat(chapter)
            });
          }
        }
      }
      
      // Inverte l'ordine (dal più recente al più vecchio, come nell'originale)
      chapters.reverse();
      console.log(`Trovati ${chapters.length} capitoli per ${mangaId}`);
      return chapters;
      
    } catch (error) {
      console.error('Errore findChapters:', error);
      return [];
    }
  }

  // 3. Trova le pagine di un capitolo
  async findChapterPages(chapterId) {
    const url = `${this.api}/manga/${chapterId}?style=list`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);
    
    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const pages = [];
      const images = doc.querySelectorAll('div#page img');
      
      images.forEach((img, index) => {
        const imgUrl = img.getAttribute('src');
        if (imgUrl) {
          pages.push({
            url: imgUrl,
            index: index
          });
        }
      });
      
      return pages;
    } catch (error) {
      console.error('Errore findChapterPages:', error);
      return [];
    }
  }
}

window.MangaWorldAPI = MangaWorldAPI;