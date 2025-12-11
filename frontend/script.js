// --- 1. CONFIGURAÇÃO DA API ---
const PROXY_URL = window.location.origin; // Usa o domínio atual (https://movieproxy.onrender.com)
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'w1280';
const PROFILE_SIZE = 'w185';

// --- 2. SELETORES DOM ---
const movieGrid = document.getElementById('movieGrid');
const searchInput = document.getElementById('searchInput');
const listTitle = document.getElementById('listTitle');
const statusMessage = document.getElementById('statusMessage');
const movieModal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModal');
const themeToggle = document.getElementById('themeToggle');
const body = document.querySelector('body');

// Variável para armazenar o timeout do 'search on typing'
let searchTimeout;

// --- 3. FUNÇÕES DE UTILIDADE ---

/**
 * Cria o HTML para um card de filme ou um esqueleto de carregamento.
 * @param {Object} movie - Objeto do filme da API.
 * @returns {string} - HTML do card.
 */
function createMovieCardHTML(movie) {
    if (!movie) {
        // Retorna o HTML do Loading Skeleton
        return `
            <div class="movie-card skeleton-card">
                <div class="skeleton skeleton-poster"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-rating"></div>
            </div>
        `;
    }

    const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}` : 'placeholder.png';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    return `
        <div class="movie-card" data-movie-id="${movie.id}">
            <img class="movie-poster" src="${posterPath}" alt="Poster de ${movie.title}" onerror="this.onerror=null;this.src='placeholder.png';">
            <div class="card-info">
                <h3 class="card-title">${movie.title}</h3>
                <span class="card-rating">⭐ ${rating}</span>
            </div>
            <div class="card-overlay">
                <h4 class="overlay-title">${movie.title}</h4>
                <p class="overlay-overview">${movie.overview || 'Resumo não disponível.'}</p>
            </div>
        </div>
    `;
}

/**
 * Exibe a mensagem de status (erro, não encontrado etc.) e limpa a grid.
 * @param {string} message - A mensagem a ser exibida.
 */
function showStatus(message) {
    movieGrid.innerHTML = '';
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    listTitle.style.display = 'none';
}

/**
 * Oculta a mensagem de status.
 */
function hideStatus() {
    statusMessage.style.display = 'none';
    listTitle.style.display = 'block';
}

/**
 * Renderiza os skeletons de carregamento.
 * @param {number} count - Número de skeletons a renderizar.
 */
function renderSkeletons(count = 10) {
    movieGrid.innerHTML = Array(count).fill(null).map(createMovieCardHTML).join('');
    hideStatus();
}

/**
 * Cria o HTML para a seção de elenco (cast).
 * @param {Array} cast - Lista de membros do elenco.
 * @returns {string} - HTML da lista de elenco.
 */
function createCastHTML(cast) {
    if (!cast || cast.length === 0) return '<p>Elenco principal não encontrado.</p>';

    const castList = cast.slice(0, 10).map(member => { // Limita aos 10 primeiros
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
 * @param {Array} recommendations - Lista de filmes recomendados.
 * @returns {string} - HTML da lista de recomendações.
 */
function createRecommendationsHTML(recommendations) {
    if (!recommendations || recommendations.length === 0) return '<p>Nenhuma recomendação disponível.</p>';

    const recommendationCards = recommendations.slice(0, 10).map(movie => {
        const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}` : 'placeholder.png';
        return `
            <div class="recommendation-card" data-movie-id="${movie.id}">
                <img class="recommendation-poster" src="${posterPath}" alt="${movie.title}" onerror="this.onerror=null;this.src='placeholder.png';">
                <p>${movie.title}</p>
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

// --- 4. FUNÇÕES DE BUSCA/API ---

/**
 * Função genérica para fazer requisições à API do TMDB.
 * (CORRIGIDO: Incluída declaração do AbortController e Timeout)
 * @param {string} endpoint - O endpoint da API (ex: '/movie/popular').
 * @param {Object} params - Parâmetros de query adicionais.
 * @returns {Promise<Object>} - O objeto de resposta JSON da API.
 */
async function fetchProxy(endpoint, params = {}) {
    const query = new URLSearchParams({
        endpoint: endpoint,
        ...params
    }).toString();

    const url = `${PROXY_URL}/api/movies?${query}`;

    // === CORREÇÃO: DECLARAÇÃO DO ABORTCONTROLLER E TIMEOUT ===
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 10000); // Cancela a requisição após 10 segundos
    // =======================================================

    try {
        const response = await fetch(url, { signal: controller.signal });

        // CORREÇÃO: Limpa o timeout no sucesso
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Erro: ${response.status} - ${errorBody.error || 'Falha na requisição.'}`);
        }

        return await response.json();

    } catch (error) {
        // CORREÇÃO: Limpa o timeout no erro
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('A requisição excedeu o tempo limite.');
        }
        console.error('Erro no fetchProxy:', error);
        throw error;
    }
}

/**
 * Carrega a lista de filmes (popular ou de busca).
 * @param {string} query - O termo de busca. Se vazio, carrega populares.
 */
async function loadMovies(query = '') {
    renderSkeletons();

    let endpoint;
    let params = {};

    if (query.trim()) {
        endpoint = '/search/movie';
        params.query = query;
        listTitle.textContent = `Resultados da busca por: "${query}"`;
    } else {
        endpoint = '/movie/popular';
        listTitle.textContent = 'Filmes Populares Atuais';
    }

    try {
        const data = await fetchProxy(endpoint, params);

        if (data.results && data.results.length > 0) {
            movieGrid.innerHTML = data.results.map(createMovieCardHTML).join('');
            hideStatus();
        } else {
            showStatus('Nenhum filme encontrado com este termo.');
        }

    } catch (error) {
        showStatus(`Falha ao carregar os filmes. ${error.message}`);
    }
}

/**
 * Carrega os detalhes do filme, elenco e recomendações.
 * @param {number} movieId - O ID do filme.
 */
async function loadMovieDetails(movieId) {
    movieModal.style.display = 'block';

    try {
        // Requisições em paralelo
        const [movieData, creditsData, recommendationsData] = await Promise.all([
            fetchProxy('/movie/{movie_id}', { movie_id: movieId }),
            fetchProxy('/movie/{movie_id}/credits', { movie_id: movieId }),
            fetchProxy('/movie/{movie_id}/recommendations', { movie_id: movieId })
        ]);

        const movie = movieData;
        const cast = creditsData.cast;
        const recommendations = recommendationsData.results;

        // 3. Monta o HTML final do modal
        const backdropPath = movie.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${movie.backdrop_path}` : 'placeholder_banner.png';
        const genres = movie.genres.map(g => g.name).join(', ') || 'N/A';
        const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString('pt-BR') : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

        modalBody.innerHTML = `
            <div class="modal-movie-header">
                <img class="modal-movie-banner" src="${backdropPath}" alt="Banner de ${movie.title}" onerror="this.onerror=null;this.src='placeholder_banner.png';">
                <h2 class="modal-movie-title">${movie.title}</h2>
            </div>
            
            <div class="modal-details-grid">
                <div class="detail-section">
                    <h3>Sinopse</h3>
                    <p>${movie.overview || 'Sinopse não disponível.'}</p>
                </div>
                
                <div class="detail-section details-meta">
                    <h3>Detalhes</h3>
                    <p><strong>Nota:</strong> <span class="card-rating">⭐ ${rating}</span></p>
                    <p><strong>Gênero(s):</strong> ${genres}</p>
                    <p><strong>Lançamento:</strong> ${releaseDate}</p>
                    <p><strong>Duração:</strong> ${movie.runtime} min</p>
                    <p><strong>Orçamento:</strong> ${movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A'}</p>
                </div>
            </div>

            ${createCastHTML(cast)}
            ${createRecommendationsHTML(recommendations)}
        `;

        // Adiciona listeners aos cards de recomendação recém-criados
        document.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Ao clicar em uma recomendação, recarrega o modal com o novo filme
                const newId = e.currentTarget.getAttribute('data-movie-id');
                loadMovieDetails(newId);
            });
        });

    } catch (error) {
        modalBody.innerHTML = `
            <div class="detail-section">
                <h3>Erro ao carregar detalhes</h3>
                <p>Não foi possível carregar os detalhes do filme. ${error.message}</p>
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
        loadMovies(query);
    }, 500); // 500ms de debounce
});

// Listener para abrir o modal ao clicar em um card de filme
movieGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.movie-card');
    if (card && !card.classList.contains('skeleton-card')) {
        const movieId = card.getAttribute('data-movie-id');
        loadMovieDetails(movieId);
    }
});

// Listener para fechar o modal com a tecla ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        movieModal.style.display = 'none';
    }
});

// Fechar o modal ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target === movieModal) {
        movieModal.style.display = 'none';
    }
});

// Listener para alternar o modo claro/escuro
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);

    // Atualiza o ícone
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-sun', newTheme === 'light');
    icon.classList.toggle('fa-moon', newTheme === 'dark');

    // Salva a preferência
    localStorage.setItem('theme', newTheme);
});


// --- 6. INICIALIZAÇÃO ---

/**
 * Função de inicialização do site.
 */
function init() {
    // 1. Carrega o tema do localStorage ou usa o padrão 'dark' (para o estilo futurista)
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Padrão 'dark' para o visual futurista
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Configura o ícone do botão
    const icon = themeToggle.querySelector('i');
    // Garante que o ícone inicial esteja correto (no HTML é fa-sun)
    if (savedTheme === 'dark') {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    // 2. Carrega os filmes populares na inicialização
    loadMovies();
}

// Inicia a aplicação
init();