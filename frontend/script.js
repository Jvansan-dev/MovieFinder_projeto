// --- 1. CONFIGURAÇÃO DA API ---
const PROXY_URL = window.location.origin; // Usa o domínio atual
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'w1280';
const PROFILE_SIZE = 'w185';
const LOGO_SIZE = 'w92'; // Tamanho para os logos de streaming

// --- 2. SELETORES DOM ---
const movieGrid = document.getElementById('movieGrid');
const searchInput = document.getElementById('searchInput');
// ADICIONADO: Seletor de tipo (Filme/Série)
const searchType = document.getElementById('searchType');
const listTitle = document.getElementById('listTitle');
const statusMessage = document.getElementById('statusMessage');
const movieModal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModal');
const themeToggle = document.getElementById('themeToggle');
const body = document.querySelector('body');

// Variáveis de Estado
let searchTimeout;
let currentType = 'movie'; // Padrão: filme

// --- 3. FUNÇÕES DE UTILIDADE ---

/**
 * Cria o HTML para um card (filme ou série).
 */
function createMovieCardHTML(item) {
   if (!item) {
      return `
            <div class="movie-card skeleton-card">
                <div class="skeleton skeleton-poster"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-rating"></div>
            </div>
        `;
   }

   // LÓGICA ATUALIZADA: Título vs Nome
   const title = item.title || item.name;
   const posterPath = item.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${item.poster_path}` : 'placeholder.png';
   const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

   return `
        <div class="movie-card" data-id="${item.id}" data-type="${currentType}">
            <img class="movie-poster" src="${posterPath}" alt="Poster de ${title}" onerror="this.onerror=null;this.src='placeholder.png';">
            <div class="card-info">
                <h3 class="card-title">${title}</h3>
                <span class="card-rating">⭐ ${rating}</span>
            </div>
            <div class="card-overlay">
                <h4 class="overlay-title">${title}</h4>
                <p class="overlay-overview">${item.overview || 'Resumo não disponível.'}</p>
            </div>
        </div>
    `;
}

function showStatus(message) {
   movieGrid.innerHTML = '';
   statusMessage.textContent = message;
   statusMessage.style.display = 'block';
   listTitle.style.display = 'none';
}

function hideStatus() {
   statusMessage.style.display = 'none';
   listTitle.style.display = 'block';
}

function renderSkeletons(count = 10) {
   movieGrid.innerHTML = Array(count).fill(null).map(createMovieCardHTML).join('');
   hideStatus();
}

/**
 * Cria o HTML para a seção de elenco.
 */
function createCastHTML(cast) {
   if (!cast || cast.length === 0) return '<p>Elenco principal não encontrado.</p>';

   const castList = cast.slice(0, 10).map(member => {
      const profilePath = member.profile_path ? `${IMAGE_BASE_URL}${PROFILE_SIZE}${member.profile_path}` : 'placeholder_person.png';
      return `
            <div class="cast-member">
                <img class="cast-photo" src="${profilePath}" alt="${member.name}" onerror="this.onerror=null;this.src='placeholder_person.png';">
                <p>${member.name}</p>
                <small>(${member.character})</small>
            </div>
        `;
   }).join('');

   return `
        <div class="detail-section">
            <h3>Elenco Principal</h3>
            <div class="cast-list">${castList}</div>
        </div>
    `;
}

/**
 * Cria o HTML para a seção de recomendações.
 */
function createRecommendationsHTML(recommendations) {
   if (!recommendations || recommendations.length === 0) return '<p>Nenhuma recomendação disponível.</p>';

   const recommendationCards = recommendations.slice(0, 10).map(item => {
      const title = item.title || item.name;
      const posterPath = item.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${item.poster_path}` : 'placeholder.png';
      return `
            <div class="recommendation-card" data-id="${item.id}">
                <img class="recommendation-poster" src="${posterPath}" alt="${title}" onerror="this.onerror=null;this.src='placeholder.png';">
                <p>${title}</p>
            </div>
        `;
   }).join('');

   return `
        <div class="detail-section">
            <h3>Recomendações</h3>
            <div class="recommendations-grid">${recommendationCards}</div>
        </div>
    `;
}

/**
 * NOVO: Cria o HTML para a seção "Onde Assistir"
 */
function createProvidersHTML(providersData) {
   // Verifica se existem dados para o Brasil (BR)
   const brProviders = providersData?.results?.BR;

   if (!brProviders || !brProviders.flatrate) {
      return `
            <div class="detail-section providers-section">
                <h3>Onde Assistir</h3>
                <p>Não disponível em streaming no Brasil atualmente.</p>
            </div>
        `;
   }

   // Gera os ícones apenas para serviços de assinatura (flatrate)
   const providerIcons = brProviders.flatrate.map(provider => {
      return `
            <img src="${IMAGE_BASE_URL}${LOGO_SIZE}${provider.logo_path}" 
                 alt="${provider.provider_name}" 
                 title="${provider.provider_name}"
                 class="provider-logo"
                 style="border-radius: 8px; margin-right: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        `;
   }).join('');

   return `
        <div class="detail-section providers-section">
            <h3>Onde Assistir (Brasil)</h3>
            <div class="providers-list" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                ${providerIcons}
            </div>
        </div>
    `;
}

// --- 4. FUNÇÕES DE BUSCA/API ---

async function fetchProxy(endpoint, params = {}) {
   // Constrói a URL para o seu Proxy local
   const query = new URLSearchParams({
      endpoint: endpoint,
      ...params
   }).toString();

   const url = `${PROXY_URL}/api/movies?${query}`;

   const controller = new AbortController();
   const timeoutId = setTimeout(() => {
      controller.abort();
   }, 10000);

   try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
         const errorBody = await response.json();
         throw new Error(`Erro: ${response.status} - ${errorBody.error || 'Falha na requisição.'}`);
      }

      return await response.json();

   } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new Error('A requisição excedeu o tempo limite.');
      console.error('Erro no fetchProxy:', error);
      throw error;
   }
}

/**
 * Carrega a lista (Popular ou Busca) baseada no currentType (movie ou tv).
 */
async function loadItems(query = '') {
   renderSkeletons();

   let endpoint;
   let params = {};
   const typeLabel = currentType === 'movie' ? 'Filmes' : 'Séries';

   // Define endpoints dinamicamente com base no tipo
   if (query.trim()) {
      endpoint = `/search/${currentType}`;
      params.query = query;
      listTitle.textContent = `Resultados em ${typeLabel}: "${query}"`;
   } else {
      endpoint = `/${currentType}/popular`;
      listTitle.textContent = `${typeLabel} Populares Atuais`;
   }

   try {
      const data = await fetchProxy(endpoint, params);

      if (data.results && data.results.length > 0) {
         movieGrid.innerHTML = data.results.map(createMovieCardHTML).join('');
         hideStatus();
      } else {
         showStatus('Nenhum resultado encontrado.');
      }

   } catch (error) {
      showStatus(`Falha ao carregar. ${error.message}`);
   }
}

/**
 * Carrega detalhes, elenco, recomendações E Onde Assistir.
 */
async function loadDetails(itemId) {
   movieModal.style.display = 'block';

   try {
      // Agora busca 4 coisas em paralelo, usando currentType
      const [itemData, creditsData, recommendationsData, providersData] = await Promise.all([
         fetchProxy(`/${currentType}/${itemId}`),
         fetchProxy(`/${currentType}/${itemId}/credits`),
         fetchProxy(`/${currentType}/${itemId}/recommendations`),
         fetchProxy(`/${currentType}/${itemId}/watch/providers`) // NOVO
      ]);

      const item = itemData;
      const cast = creditsData.cast;
      const recommendations = recommendationsData.results;
      const providers = providersData;

      // Montagem do Modal
      const backdropPath = item.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${item.backdrop_path}` : 'placeholder_banner.png';
      const genres = item.genres.map(g => g.name).join(', ') || 'N/A';
      const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

      // Tratamento de diferenças Filme vs Série
      const title = item.title || item.name;
      const dateRaw = item.release_date || item.first_air_date;
      const date = dateRaw ? new Date(dateRaw).toLocaleDateString('pt-BR') : 'N/A';

      // Séries têm array de duração, filmes têm um número
      let runtime = 'N/A';
      if (item.runtime) runtime = `${item.runtime} min`;
      if (item.episode_run_time && item.episode_run_time.length > 0) runtime = `${item.episode_run_time[0]} min (aprox)`;

      modalBody.innerHTML = `
            <div class="modal-movie-header">
                <img class="modal-movie-banner" src="${backdropPath}" alt="Banner de ${title}" onerror="this.onerror=null;this.src='placeholder_banner.png';">
                <h2 class="modal-movie-title">${title}</h2>
            </div>
            
            <div class="modal-details-grid">
                <div class="detail-section">
                    <h3>Sinopse</h3>
                    <p>${item.overview || 'Sinopse não disponível.'}</p>
                    ${createProvidersHTML(providers)}
                </div>
                
                <div class="detail-section details-meta">
                    <h3>Detalhes</h3>
                    <p><strong>Nota:</strong> <span class="card-rating">⭐ ${rating}</span></p>
                    <p><strong>Gênero(s):</strong> ${genres}</p>
                    <p><strong>Lançamento:</strong> ${date}</p>
                    <p><strong>Duração:</strong> ${runtime}</p>
                    <p><strong>Tipo:</strong> ${currentType === 'movie' ? 'Filme' : 'Série'}</p>
                </div>
            </div>

            ${createCastHTML(cast)}
            ${createRecommendationsHTML(recommendations)}
        `;

      // Listeners para recomendações
      document.querySelectorAll('.recommendation-card').forEach(card => {
         card.addEventListener('click', (e) => {
            const newId = e.currentTarget.getAttribute('data-id');
            // Mantém o mesmo tipo para recomendação
            loadDetails(newId);
         });
      });

   } catch (error) {
      modalBody.innerHTML = `
            <div class="detail-section">
                <h3>Erro ao carregar detalhes</h3>
                <p>Não foi possível carregar os dados. ${error.message}</p>
            </div>
        `;
   }
}


// --- 5. EVENT LISTENERS ---

// Listener para a busca 'search on typing'
searchInput.addEventListener('input', (e) => {
   clearTimeout(searchTimeout);
   searchTimeout = setTimeout(() => {
      const query = e.target.value.trim();
      loadItems(query);
   }, 500);
});

// Seleciona todos os inputs de rádio com o nome 'searchType'
const typeRadios = document.querySelectorAll('input[name="searchType"]');

// Adiciona o evento de clique em cada um
typeRadios.forEach(radio => {
   radio.addEventListener('change', (e) => {
      // Atualiza a variável global currentType
      currentType = e.target.value;

      // Faz a busca novamente com o novo tipo
      const query = searchInput.value.trim();
      loadItems(query);

      // (Opcional) Feedback visual ou log
      console.log(`Tipo alterado para: ${currentType}`);
   });
});

// Listener para abrir o modal
movieGrid.addEventListener('click', (e) => {
   const card = e.target.closest('.movie-card');
   if (card && !card.classList.contains('skeleton-card')) {
      const id = card.getAttribute('data-id');
      loadDetails(id);
   }
});

// Listener para fechar modal (ESC)
window.addEventListener('keydown', (e) => {
   if (e.key === 'Escape') movieModal.style.display = 'none';
});

// Fechar modal (Clique fora)
window.addEventListener('click', (e) => {
   if (e.target === movieModal) movieModal.style.display = 'none';
});

// Listener Tema
themeToggle.addEventListener('click', () => {
   const currentTheme = document.documentElement.getAttribute('data-theme');
   const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
   document.documentElement.setAttribute('data-theme', newTheme);

   const icon = themeToggle.querySelector('i');
   icon.classList.toggle('fa-sun', newTheme === 'light');
   icon.classList.toggle('fa-moon', newTheme === 'dark');

   localStorage.setItem('theme', newTheme);
});


// --- 6. INICIALIZAÇÃO ---

function init() {
   const savedTheme = localStorage.getItem('theme') || 'dark';
   document.documentElement.setAttribute('data-theme', savedTheme);

   const icon = themeToggle.querySelector('i');
   if (savedTheme === 'dark') {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
   } else {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
   }

   // Carrega iniciais
   loadItems();
}

init();