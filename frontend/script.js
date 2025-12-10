// --- 1. CONFIGURAÇÃO DA API ---
const PROXY_URL = 'http://localhost:3000'; // MUDAR EM PRODUÇÃO!!!
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
 * @param {string} endpoint - O endpoint da API (ex: '/movie/popular').
 * @param {Object} params - Parâmetros de query adicionais.
 * @returns {Promise<Object>} - O objeto de resposta JSON da API.
 */
// /frontend/script.js (Função de requisição atualizada)
async function fetchProxy(endpoint, params = {}) {
    // Seu frontend envia os parâmetros para o seu backend
    const query = new URLSearchParams({
        // Note que NÃO passamos a API_KEY aqui!
        endpoint: endpoint, // Passamos o endpoint que queremos do TMDB
        ...params
    }).toString();

    // A URL agora aponta para o seu servidor proxy
    const url = `${PROXY_URL}/api/movies?${query}`;

    try {
        // ... (o código de timeout e fetch permanece o mesmo) ...
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        // ... (o tratamento de erro permanece o mesmo) ...
        if (!response.ok) {
            // Seu backend retornará um JSON de erro
            const errorBody = await response.json();
            throw new Error(`Erro: ${response.status} - ${errorBody.error || 'Falha na requisição.'}`);
        }

        return await response.json();

    } catch (error) {
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
// /frontend/script.js (Função loadMovieDetails atualizada)
/**
 * Loads detailed information for a movie and renders it into a modal.
 *
 * This asynchronous function performs three parallel API requests (using the
 * project's fetchProxy helper) to fetch:
 *  - movie details     -> endpoint: /movie/{movie_id}
 *  - movie credits     -> endpoint: /movie/{movie_id}/credits
 *  - movie recommendations -> endpoint: /movie/{movie_id}/recommendations
 *
 * After all requests resolve, it:
 *  - builds HTML for the modal (including banner, title, synopsis, meta info),
 *    using global constants IMAGE_BASE_URL and BACKDROP_SIZE for image URLs;
 *  - formats genres, release date (locale "pt-BR"), rating, budget and runtime;
 *  - injects HTML produced by helper functions createCastHTML(cast) and
 *    createRecommendationsHTML(recommendations) into the modalBody element;
 *  - adds click listeners to elements with class "recommendation-card" so that
 *    clicking a recommendation will re-open the modal for that recommendation
 *    by calling loadMovieDetails with the recommendation's data-movie-id.
 *
 * The function handles missing data gracefully (e.g. placeholder banner,
 * "N/A" fallbacks) and installs an image onerror fallback in the generated
 * markup. Network or parsing errors are caught and a user-friendly error
 * message is rendered inside the modal; the function itself resolves after
 * rendering the error (it does not rethrow).
 *
 * Expected shapes of the API responses (partial):
 *  - movieData: {
 *      id: number|string,
 *      title: string,
 *      overview?: string,
 *      backdrop_path?: string|null,
 *      genres?: Array<{ id: number, name: string }>,
 *      release_date?: string,     // ISO date
 *      vote_average?: number,
 *      runtime?: number,
 *      budget?: number
 *    }
 *  - creditsData: { cast: Array<Object> }
 *  - recommendationsData: { results: Array<{ id: number|string, ... }> }
 *
 * Side effects / globals required:
 *  - fetchProxy(pathTemplate, params) must exist and return parsed JSON.
 *  - IMAGE_BASE_URL, BACKDROP_SIZE constants for image URL composition.
 *  - modalBody is a DOM element whose innerHTML will be replaced.
 *  - createCastHTML(cast) and createRecommendationsHTML(recommendations)
 *    must return HTML strings for injection.
 *
 * @async
 * @function loadMovieDetails
 * @param {number|string} movieId - The movie identifier used to fetch details.
 * @returns {Promise<void>} Resolves after the modal is populated (or an error
 *   message is displayed). Errors from the fetch/processing are caught and
 *   rendered into the modal rather than being thrown.
 * @example
 * // Open the modal for movie id 550
 * await loadMovieDetails(550);
 */
async function loadMovieDetails(movieId) {
    // ... (resto do código) ...
    try {
        // Requisições em paralelo (o endpoint é o caminho que o backend irá buscar)
        const [movieData, creditsData, recommendationsData] = await Promise.all([
            fetchProxy('/movie/{movie_id}', { movie_id: movieId }), // Busca Detalhes
            fetchProxy('/movie/{movie_id}/credits', { movie_id: movieId }), // Busca Créditos
            fetchProxy('/movie/{movie_id}/recommendations', { movie_id: movieId }) // Busca Recomendações
        ]);
        // ... (resto do código) ...

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

// Listener para fechar o modal
closeModalBtn.addEventListener('click', () => {
    movieModal.style.display = 'none';
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
    // 1. Carrega o tema do localStorage ou usa o padrão 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Configura o ícone do botão
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-sun', savedTheme === 'light');
    icon.classList.toggle('fa-moon', savedTheme === 'dark');


    // 2. Carrega os filmes populares na inicialização
    loadMovies();
}

// Inicia a aplicação
init();