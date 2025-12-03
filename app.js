'use strict';
const api={base:'https://api.themoviedb.org/3',img:'https://image.tmdb.org/t/p/w500'};
const els={
  keyWarning:document.getElementById('keyWarning'),
  openKeyModal:document.getElementById('openKeyModal'),
  openKeyModalInline:document.getElementById('openKeyModalInline'),
  keyModal:document.getElementById('keyModal'),
  keyForm:document.getElementById('keyForm'),
  apiKeyInput:document.getElementById('apiKey'),
  closeKeyModal:document.getElementById('closeKeyModal'),
  searchForm:document.getElementById('searchForm'),
  query:document.getElementById('query'),
  genre:document.getElementById('genre'),
  yearMin:document.getElementById('yearMin'),
  yearMax:document.getElementById('yearMax'),
  ratingMin:document.getElementById('ratingMin'),
  sortBy:document.getElementById('sortBy'),
  results:document.getElementById('results'),
  detailsModal:document.getElementById('detailsModal'),
  detailsContent:document.getElementById('detailsContent'),
  closeDetails:document.getElementById('closeDetails')
};
let state={apiKey:localStorage.getItem('tmdbApiKey')||'',genres:[],lastQuery:'',results:[]};
function show(el){el.hidden=false}
function hide(el){el.hidden=true}
function ensureKey(){if(!state.apiKey){show(els.keyWarning)}else{hide(els.keyWarning)}}
function openKey(){show(els.keyModal);els.apiKeyInput.value=state.apiKey||''}
function closeKey(){hide(els.keyModal)}
els.openKeyModal.addEventListener('click',openKey);
els.openKeyModalInline.addEventListener('click',openKey);
els.closeKeyModal.addEventListener('click',closeKey);
els.keyForm.addEventListener('submit',e=>{e.preventDefault();const k=els.apiKeyInput.value.trim();if(k){state.apiKey=k;localStorage.setItem('tmdbApiKey',k);ensureKey();loadGenres()}closeKey()});
ensureKey();
function url(path,params){const q=new URLSearchParams({...params,api_key:state.apiKey});return `${api.base}${path}?${q.toString()}`}
async function loadGenres(){if(!state.apiKey)return;const r=await fetch(url('/genre/movie/list',{language:'pt-BR'}));if(!r.ok)return;const j=await r.json();state.genres=j.genres||[];renderGenres()}
function renderGenres(){const s=els.genre;const v=s.value;s.innerHTML='<option value="">Todos</option>'+state.genres.map(g=>`<option value="${g.id}">${g.name}</option>`).join('');s.value=v}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
els.query.addEventListener('input',debounce(()=>search(),400));
els.searchForm.addEventListener('submit',e=>{e.preventDefault();search()});
['genre','yearMin','yearMax','ratingMin','sortBy'].forEach(id=>els[id].addEventListener('change',()=>applyFiltersAndRender()));
async function search(){if(!state.apiKey)return;const q=els.query.value.trim();state.lastQuery=q;if(!q){state.results=[];renderResults([]);return}const r=await fetch(url('/search/movie',{query:q,language:'pt-BR',include_adult:false,page:1}));if(!r.ok){state.results=[];renderResults([]);return}const j=await r.json();state.results=j.results||[];applyFiltersAndRender()}
function applyFiltersAndRender(){const g=els.genre.value?Number(els.genre.value):null;const ymin=els.yearMin.value?Number(els.yearMin.value):null;const ymax=els.yearMax.value?Number(els.yearMax.value):null;const rmin=els.ratingMin.value?Number(els.ratingMin.value):0;const sort=els.sortBy.value;let list=state.results.slice();if(g)list=list.filter(m=>Array.isArray(m.genre_ids)&&m.genre_ids.includes(g));if(ymin)list=list.filter(m=>m.release_date&&Number(m.release_date.slice(0,4))>=ymin);if(ymax)list=list.filter(m=>m.release_date&&Number(m.release_date.slice(0,4))<=ymax);if(rmin)list=list.filter(m=>Number(m.vote_average)>=rmin);list=list.sort((a,b)=>{
  if(sort==='vote_average.desc')return Number(b.vote_average)-Number(a.vote_average);
  if(sort==='release_date.desc')return String(b.release_date).localeCompare(String(a.release_date));
  return Number(b.popularity)-Number(a.popularity);
});
renderResults(list)}
function renderResults(list){els.results.innerHTML=list.map(m=>cardHtml(m)).join('');attachCardHandlers(list)}
function cardHtml(m){const img=m.poster_path?`${api.img}${m.poster_path}`:'';const year=m.release_date?m.release_date.slice(0,4):'';const score=(m.vote_average||0).toFixed(1);return `
  <article class="card" data-id="${m.id}">
    <img class="poster" src="${img}" alt="Poster de ${escapeHtml(m.title||'')}" onerror="this.style.display='none'">
    <div class="card-body">
      <div class="title">${escapeHtml(m.title||'')}</div>
      <div class="meta"><span>${year}</span><span>${genresLabel(m.genre_ids)}</span></div>
      <div class="rating"><span class="score">${score}</span><span>TMDB</span></div>
      <div class="actions-row">
        <button class="view-btn" data-view="${m.id}">Ver detalhes</button>
      </div>
    </div>
  </article>
`}
function genresLabel(ids){if(!ids||!ids.length)return '';const names=ids.map(id=>{const g=state.genres.find(x=>x.id===id);return g?g.name:null}).filter(Boolean);return names.join(', ')}
function attachCardHandlers(list){els.results.querySelectorAll('.view-btn').forEach(b=>b.addEventListener('click',()=>openDetails(Number(b.dataset.view))))}
async function openDetails(id){const d=await fetch(url(`/movie/${id}`,{language:'pt-BR'}));if(!d.ok)return;const movie=await d.json();const c=await fetch(url(`/movie/${id}/credits`,{language:'pt-BR'}));let credits={cast:[]};if(c.ok)credits=await c.json();renderDetails(movie,credits.cast||[]);show(els.detailsModal)}
function renderDetails(m,cast){const img=m.poster_path?`${api.img}${m.poster_path}`:'';const year=m.release_date?m.release_date.slice(0,4):'';const score=(m.vote_average||0).toFixed(1);const genres=(m.genres||[]).map(g=>g.name).join(', ');const topCast=cast.slice(0,12);els.detailsContent.innerHTML=`
  <div class="details-grid">
    <img class="details-poster" src="${img}" alt="Poster de ${escapeHtml(m.title||'')}" onerror="this.style.display='none'">
    <div>
      <div class="details-title">${escapeHtml(m.title||'')}</div>
      <div class="details-sub"><span>${year}</span><span>${genres}</span><span>Nota ${score}</span></div>
      <div class="details-overview">${escapeHtml(m.overview||'')}</div>
      <div class="cast-grid">
        ${topCast.map(c=>castCard(c)).join('')}
      </div>
    </div>
  </div>
`}
function castCard(c){const img=c.profile_path?`${api.img}${c.profile_path}`:'';return `
  <div class="cast-card">
    <img class="cast-avatar" src="${img}" alt="${escapeHtml(c.name||'')}" onerror="this.style.display='none'">
    <div>
      <div class="cast-name">${escapeHtml(c.name||'')}</div>
      <div class="cast-role">${escapeHtml(c.character||'')}</div>
    </div>
  </div>
`}
els.closeDetails.addEventListener('click',()=>hide(els.detailsModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape')hide(els.detailsModal)});
function escapeHtml(s){return String(s).replace(/[&<>"]+/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[a]))}
loadGenres();
