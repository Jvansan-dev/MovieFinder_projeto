// /backend/server.js
require('dotenv').config(); // Carrega as variáveis de ambiente
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Middleware
// Configura o CORS para permitir requisições apenas do seu domínio (ou * para testes)
app.use(cors({
    origin: '*' // Em produção, mude para: 'https://seuusuario.github.io'
}));
app.use(express.json());

/**
 * Rota para buscar filmes populares ou por termo de busca.
 * Exemplo de uso pelo Frontend: 
 * /api/movies?query=batman
 * /api/movies?endpoint=/movie/popular
 */
app.get('/api/movies', async (req, res) => {
    const { query, endpoint, movie_id } = req.query;

    // Determina qual endpoint do TMDB usar
    let tmdbEndpoint = '/movie/popular'; // Padrão
    let params = { api_key: TMDB_API_KEY, language: 'pt-BR' };

    if (query) {
        tmdbEndpoint = '/search/movie';
        params.query = query;
    } else if (endpoint) {
        tmdbEndpoint = endpoint; // Para detalhes, créditos, recomendações

        // Se for um endpoint que precisa de ID (detalhes, créditos, etc.)
        if (movie_id) {
            tmdbEndpoint = tmdbEndpoint.replace('{movie_id}', movie_id);
        }
    }

    const url = `${TMDB_BASE_URL}${tmdbEndpoint}?${new URLSearchParams(params)}`;

    try {
        const response = await require('node-fetch')(url);
        if (!response.ok) {
            console.error(`Erro da API TMDB: ${response.status}`);
            return res.status(response.status).json({ error: 'Falha ao buscar dados do TMDB.' });
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erro no proxy:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`);
});