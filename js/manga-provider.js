// js/manga-provider.js
// Provider per MangaWorld

class MangaWorldProvider {
  constructor() {
    this.api = 'https://www.mangaworld.cx';
    this.corsProxy = 'https://api.allorigins.win/raw?url=';
  }

  async searchManga(query) {
    if (!query || query.trim() === '') {
      return [];
    }
    
    const url = `${this.api}/archive?keyword=${encodeURIComponent(query.toLowerCase())}`;
    const proxyUrl = `${this.corsProxy}${encodeURIComponent(url)}`;
    
    try {
      // Prova prima senza proxy, se fallisce usa il proxy
      let response;
      try {
        response = await fetch(url);
        if (!response.ok) throw new Error('CORS error');
      } catch(e) {
        console.log('Usando proxy CORS...');
        response = await fetch(this.corsProxy + url);
      }
      
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
        const mangaUrl = entry.querySelector('a.thumb')?.getAttribute('href') || '';
        const mangaId = mangaUrl.split('manga/')[1]?.split('/')[0] || '';
        
        if (title && mangaId) {
          results.push({
            id: mangaId,
            title: title,
            cover: thumbnailUrl,
            type: 'external',
            source: 'mangaworld',
            externalUrl: `${this.api}/manga/${mangaId}`,
            latest: '📖 MangaWorld'
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Errore ricerca su MangaWorld:', error);
      return [];
    }
  }
}

window.MangaWorldProvider = MangaWorldProvider;