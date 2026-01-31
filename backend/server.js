// /backend/server.js
require('dotenv').config(); // Carrega as variáveis de ambiente
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path'); // ⬅️ NOVIDADE: Módulo para trabalhar com caminhos

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

// **********************************************
// **** INÍCIO DO CÓDIGO PARA SERVIR O FRONTEND ****
// **********************************************

// 1. Servir arquivos estáticos (CSS, JS, Imagens) da pasta 'frontend'
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. Definir a rota principal (/) para enviar o index.html
app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// **********************************************
// **** FIM DO CÓDIGO PARA SERVIR O FRONTEND ****
// **********************************************


/**
 * Rota para buscar filmes populares ou por termo de busca.
 * Exemplo de uso pelo Frontend: 
 * /api/movies?query=batman
 * /api/movies?endpoint=/movie/popular
 */
app.get('/api/movies', async (req, res) => {
   const { query, endpoint, movie_id } = req.query;
   // ... (o restante da rota permanece inalterado)
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

// Rota de busca (Atualizada para aceitar type)
app.get('/api/search', async (req, res) => {
   const { query, type } = req.query; // Recebe o tipo (movie ou tv)
   const searchType = type === 'tv' ? 'tv' : 'movie'; // Padrão é movie

   if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
   }

   try {
      const response = await axios.get(`${TMDB_BASE_URL}/search/${searchType}`, {
         params: {
            api_key: TMDB_API_KEY,
            query: query,
            language: 'pt-BR',
            page: 1,
            include_adult: false
         }
      });
      res.json(response.data);
   } catch (error) {
      console.error('Erro na busca:', error.message);
      res.status(500).json({ error: 'Erro ao buscar dados' });
   }
});

// Rota de detalhes (Atualizada para trazer onde assistir)
// Note que mudei a rota de /api/movie/:id para /api/details/:id para ficar mais genérico
app.get('/api/details/:id', async (req, res) => {
   const { id } = req.params;
   const { type } = req.query; // Recebe se é movie ou tv
   const detailsType = type === 'tv' ? 'tv' : 'movie';

   try {
      const response = await axios.get(`${TMDB_BASE_URL}/${detailsType}/${id}`, {
         params: {
            api_key: TMDB_API_KEY,
            language: 'pt-BR',
            // Adicionamos 'watch/providers' aqui
            append_to_response: 'credits,recommendations,watch/providers'
         }
      });
      res.json(response.data);
   } catch (error) {
      console.error('Erro nos detalhes:', error.message);
      res.status(500).json({ error: 'Erro ao buscar detalhes' });
   }
});

// Inicialização do Servidor
app.listen(PORT, () => {
   console.log(`Backend rodando em http://localhost:${PORT}`);
});