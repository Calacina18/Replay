const videos = Array.isArray(window.REPLAY_VIDEOS) ? window.REPLAY_VIDEOS : [];
const games = [...new Set([...(Array.isArray(window.REPLAY_GAMES) ? window.REPLAY_GAMES : []), ...videos.map(video => video.game).filter(Boolean), 'Outros'])];
const state = { filter: 'Todos', search: '', favoritesOnly: false };
const grid = document.querySelector('#videoGrid');
const emptyState = document.querySelector('#emptyState');
const installButton = document.querySelector('#installButton');
let toastTimer;
let activeVideoId = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function readStore(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function getFavorites() { return readStore('replay-favorites', []); }
function getLikes() { return readStore('replay-likes', {}); }
function getComments() { return readStore('replay-comments', {}); }
function renderGameControls() {
  const icon = { Valorant: 'V', Minecraft: '◇', Fortnite: 'F', Outros: '✧' };
  const color = { Valorant: 'red', Minecraft: 'green', Fortnite: 'blue', Outros: 'yellow' };
  document.querySelector('#gameNav').innerHTML = `<button class="game-link" data-filter="Todos"><span class="game-icon game-icon-purple">✦</span>Todos os jogos</button>${games.map(game => `<button class="game-link" data-filter="${escapeHtml(game)}"><span class="game-icon game-icon-${color[game] || 'yellow'}">${icon[game] || '✦'}</span>${escapeHtml(game)}</button>`).join('')}`;
  document.querySelector('#filterRow').innerHTML = `<button class="filter-chip ${state.filter === 'Todos' ? 'selected' : ''}" data-filter="Todos">Todos <span id="allFilterCount">${videos.length}</span></button>${games.map(game => `<button class="filter-chip ${state.filter === game ? 'selected' : ''}" data-filter="${escapeHtml(game)}">${escapeHtml(game)}</button>`).join('')}<span class="sort-label">Mais recentes <span>⌄</span></span>`;
}
function renderSocial(video) {
  if (!video) return;
  const likes = getLikes();
  const modalLike = document.querySelector('#modalLike');
  modalLike.dataset.like = video.id;
  modalLike.classList.toggle('liked', Boolean(likes[video.id]));
  document.querySelector('#modalLikeText').textContent = likes[video.id] ? 'Curtido' : 'Curtir';
  document.querySelector('#modalLikeCount').textContent = likes[video.id] ? '1' : '0';
  document.querySelector('#commentsList').innerHTML = (getComments()[video.id] || []).map(comment => `<article class="comment-item"><div class="comment-item-head"><span>${escapeHtml(comment.email || 'Vocês')} · ${escapeHtml(comment.date || 'Agora')}</span><button data-delete-comment="${escapeHtml(video.id)}:${escapeHtml(comment.id)}" aria-label="Apagar comentário">Apagar</button></div><p>${escapeHtml(comment.text)}</p></article>`).join('') || '<p class="no-comments">Ainda não tem comentário. Comece a conversa! 💬</p>';
}
function render() {
  renderGameControls();
  const favorites = getFavorites();
  const likes = getLikes();
  const matching = videos.filter(video => {
    const matchesFilter = state.filter === 'Todos' || video.game === state.filter;
    const text = `${video.title} ${video.game}`.toLocaleLowerCase('pt-BR');
    return matchesFilter && text.includes(state.search.toLocaleLowerCase('pt-BR')) && (!state.favoritesOnly || favorites.includes(video.id));
  });
  grid.innerHTML = matching.map(video => {
    const gameKey = ['Valorant', 'Minecraft', 'Fortnite'].includes(video.game) ? video.game.toLowerCase() : 'outros';
    const thumb = video.url ? `<video src="${escapeHtml(video.url)}" muted preload="metadata"></video>` : `<div class="thumb-pattern"></div><div class="thumb-art">${escapeHtml(video.symbol || '✦')}</div>`;
    const cover = video.coverUrl ? `<img class="custom-cover" src="${escapeHtml(video.coverUrl)}" alt="Capa: ${escapeHtml(video.title)}" />` : '';
    const favorite = favorites.includes(video.id);
    return `<article class="video-card" data-id="${escapeHtml(video.id)}" tabindex="0" role="button" aria-label="Assistir ${escapeHtml(video.title)}"><div class="thumbnail thumb-${gameKey}">${thumb}${cover}<span class="thumb-play">▶</span><span class="thumb-time">${escapeHtml(video.duration || 'Vídeo')}</span></div><div class="video-info"><div class="card-topline"><span class="game-badge ${gameKey}">${escapeHtml(video.game || 'Outros')}</span><span class="card-actions"><button class="like-button ${likes[video.id] ? 'liked' : ''}" data-like="${escapeHtml(video.id)}" aria-label="Curtir vídeo">👍 <b>${likes[video.id] ? 1 : 0}</b></button><button class="favorite-button ${favorite ? 'liked' : ''}" data-favorite="${escapeHtml(video.id)}" aria-label="${favorite ? 'Remover dos' : 'Adicionar aos'} favoritos">${favorite ? '♥' : '♡'}</button></span></div><h3>${escapeHtml(video.title)}</h3><div class="video-meta"><span>Meu canal</span><span class="dot">•</span><span>${escapeHtml(video.date || 'Agora')}</span></div></div></article>`;
  }).join('');
  emptyState.hidden = matching.length > 0;
  document.querySelector('#videoCount').textContent = String(videos.length).padStart(2, '0');
  document.querySelector('#favoriteCount').textContent = String(favorites.length).padStart(2, '0');
  document.querySelector('#allFilterCount').textContent = String(videos.length);
}
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function openVideo(video) {
  activeVideoId = video.id;
  document.querySelector('#modalTitle').textContent = video.title;
  document.querySelector('#modalGame').textContent = video.game || 'Outros';
  document.querySelector('#modalMeta').textContent = `${video.description || 'Um momento especial do canal.'} · ${video.date || 'Agora'}`;
  const player = document.querySelector('#modalPlayer');
  if (video.url) player.innerHTML = `<video src="${escapeHtml(video.url)}" controls autoplay playsinline>${video.captionUrl ? `<track kind="subtitles" src="${escapeHtml(video.captionUrl)}" srclang="pt-BR" label="Português" default>` : ''}</video>`;
  else player.innerHTML = '<div class="modal-placeholder"><div><span>▶</span><p>O arquivo desta gameplay ainda não foi cadastrado no catálogo.</p></div></div>';
  document.querySelector('#videoModal').hidden = false; document.body.style.overflow = 'hidden'; renderSocial(video);
}
function closeModal() { document.querySelector('#videoModal').hidden = true; document.querySelector('#modalPlayer').innerHTML = ''; document.body.style.overflow = ''; activeVideoId = null; }

document.addEventListener('click', event => {
  const commentDelete = event.target.closest('[data-delete-comment]');
  if (commentDelete) {
    const [videoId, commentId] = commentDelete.dataset.deleteComment.split(':');
    const comments = getComments(); comments[videoId] = (comments[videoId] || []).filter(comment => String(comment.id) !== commentId);
    localStorage.setItem('replay-comments', JSON.stringify(comments)); renderSocial(videos.find(video => video.id === videoId)); return;
  }
  const likeButton = event.target.closest('[data-like]');
  if (likeButton) {
    event.stopPropagation(); const id = likeButton.dataset.like; const likes = getLikes();
    if (likes[id]) delete likes[id]; else likes[id] = true;
    localStorage.setItem('replay-likes', JSON.stringify(likes)); render();
    if (activeVideoId === id) renderSocial(videos.find(video => video.id === id));
    return;
  }
  const favoriteButton = event.target.closest('[data-favorite]');
  if (favoriteButton) {
    event.stopPropagation(); const id = favoriteButton.dataset.favorite; const favorites = getFavorites();
    localStorage.setItem('replay-favorites', JSON.stringify(favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id])); render(); return;
  }
  const card = event.target.closest('.video-card');
  if (card) { const video = videos.find(item => item.id === card.dataset.id); if (video) openVideo(video); return; }
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) { state.filter = filterButton.dataset.filter; state.favoritesOnly = false; render(); }
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#searchInput').focus(); }
  if (event.key === 'Escape') closeModal();
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.video-card')) { event.preventDefault(); const video = videos.find(item => item.id === event.target.dataset.id); if (video) openVideo(video); }
});
document.querySelector('#searchInput').addEventListener('input', event => { state.search = event.target.value.trim(); render(); });
document.querySelector('#modalClose').addEventListener('click', closeModal);
document.querySelector('#videoModal').addEventListener('click', event => { if (event.target.id === 'videoModal') closeModal(); });
document.querySelector('#commentForm').addEventListener('submit', event => {
  event.preventDefault(); if (!activeVideoId) return;
  const input = document.querySelector('#commentInput'); const text = input.value.trim(); if (!text) return;
  const comments = getComments(); comments[activeVideoId] ||= [];
  comments[activeVideoId].push({ id: String(Date.now()), text, date: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) });
  localStorage.setItem('replay-comments', JSON.stringify(comments)); input.value = ''; renderSocial(videos.find(video => video.id === activeVideoId));
});
document.querySelector('#likedNav').addEventListener('click', () => { state.favoritesOnly = !state.favoritesOnly; state.filter = 'Todos'; document.querySelector('#videos').scrollIntoView({ behavior: 'smooth' }); render(); });
document.querySelector('#viewAll').addEventListener('click', () => { state.filter = 'Todos'; state.favoritesOnly = false; document.querySelector('#searchInput').value = ''; state.search = ''; render(); });
document.querySelector('#themeButton').addEventListener('click', () => { document.body.classList.toggle('light-mode'); showToast(document.body.classList.contains('light-mode') ? 'Tema claro ativado.' : 'Tema escuro ativado.'); });
document.querySelector('#menuToggle').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-link[href^="#"]').forEach(link => link.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active')); link.classList.add('active'); document.querySelector('#sidebar').classList.remove('open'); }));

let deferredInstallPrompt = null;
const isInstalledApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
installButton.hidden = isInstalledApp;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; installButton.hidden = false; });
installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) {
    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    showToast(isAppleMobile ? 'No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.' : 'Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.'); return;
  }
  deferredInstallPrompt.prompt(); const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null; installButton.hidden = true;
  if (result.outcome === 'accepted') showToast('Replay instalado no seu aparelho!');
});
window.addEventListener('appinstalled', () => { installButton.hidden = true; showToast('Replay instalado no seu aparelho!'); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
render();
