const demoVideos = [
  { id: 'v1', title: 'Ace clutch no último round! 🔥', game: 'Valorant', date: 'Hoje', duration: '08:42', kind: 'valorant', symbol: 'V', description: 'Aquela virada que ninguém esperava.' },
  { id: 'v2', title: 'Construindo nosso cantinho 🏡', game: 'Minecraft', date: 'Ontem', duration: '14:16', kind: 'minecraft', symbol: '◇', description: 'Um passeio tranquilo pelo nosso mundo.' },
  { id: 'v3', title: 'Vitória royale com a galera 🏆', game: 'Fortnite', date: 'Há 3 dias', duration: '11:03', kind: 'fortnite', symbol: 'F', description: 'A última partida da noite foi especial.' }
];
function readDeletedVideos() { try { return JSON.parse(localStorage.getItem('replay-deleted-videos') || '[]'); } catch { return []; } }
const state = { videos: demoVideos.filter(video => !readDeletedVideos().includes(video.id)), games: readGames(), filter: 'Todos', search: '', favoritesOnly: false };
state.cloud = false; state.cloudLikes = {}; state.cloudLikeCounts = {}; state.cloudComments = {};
const grid = document.querySelector('#videoGrid');
const emptyState = document.querySelector('#emptyState');
const installButton = document.querySelector('#installButton');
let toastTimer;
let editingVideoId = null;
let editCoverFile;
let editCaptionFile;
let activeVideoId = null;
const DB_NAME = 'replay-local-library';
function readGames() {
  try {
    const stored = JSON.parse(localStorage.getItem('replay-games'));
    return Array.isArray(stored) && stored.length ? stored : ['Valorant', 'Minecraft', 'Fortnite', 'Outros'];
  } catch { return ['Valorant', 'Minecraft', 'Fortnite', 'Outros']; }
}
function persistGames() { localStorage.setItem('replay-games', JSON.stringify(state.games)); }
function renderGameControls() {
  const icon = { Valorant: 'V', Minecraft: '◇', Fortnite: 'F', Outros: '✧' };
  const color = { Valorant: 'red', Minecraft: 'green', Fortnite: 'blue', Outros: 'yellow' };
  document.querySelector('#gameNav').innerHTML = `<button class="game-link" data-filter="Todos"><span class="game-icon game-icon-purple">✦</span>Todos os jogos</button>${state.games.map(game => `<button class="game-link" data-filter="${escapeHtml(game)}"><span class="game-icon game-icon-${color[game] || 'yellow'}">${icon[game] || '✦'}</span>${escapeHtml(game)}</button>`).join('')}`;
  document.querySelector('#filterRow').innerHTML = `<button class="filter-chip ${state.filter === 'Todos' ? 'selected' : ''}" data-filter="Todos">Todos <span id="allFilterCount">${state.videos.length}</span></button>${state.games.map(game => `<button class="filter-chip ${state.filter === game ? 'selected' : ''}" data-filter="${escapeHtml(game)}">${escapeHtml(game)}</button>`).join('')}<span class="sort-label">Mais recentes <span>⌄</span></span>`;
}
function renderGamesManager() {
  document.querySelector('#gamesList').innerHTML = state.games.map(game => `<div class="games-list-row"><span class="game-icon game-icon-${({Valorant:'red',Minecraft:'green',Fortnite:'blue',Outros:'yellow'})[game] || 'yellow'}">${({Valorant:'V',Minecraft:'◇',Fortnite:'F',Outros:'✧'})[game] || '✦'}</span><span>${escapeHtml(game)}</span><button class="delete-button" data-delete-game="${escapeHtml(game)}" aria-label="Remover jogo ${escapeHtml(game)}" title="Remover jogo">✕</button></div>`).join('');
}
function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('videos')) request.result.createObjectStore('videos', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('edits')) request.result.createObjectStore('edits', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function restoreVideos() {
  if (await refreshCloud()) return;
  try {
    const db = await openLibrary();
    const saved = await new Promise((resolve, reject) => {
      const request = db.transaction('videos').objectStore('videos').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const changes = await new Promise((resolve, reject) => {
      const request = db.transaction('edits').objectStore('edits').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const edits = new Map(changes.map(change => [change.id, change]));
    state.videos = state.videos.map(video => applySavedEdit(video, edits.get(video.id)));
    state.videos.unshift(...saved.map(({ file, ...video }) => applySavedEdit({ ...video, url: URL.createObjectURL(file) }, edits.get(video.id))));
    db.close(); render();
  } catch { showToast('Não foi possível acessar os vídeos salvos neste navegador.'); }
}
function applySavedEdit(video, edit) {
  if (!edit) return video;
  return { ...video, title: edit.title, game: edit.game || video.game, coverBlob: edit.coverBlob || null, coverUrl: edit.coverBlob ? URL.createObjectURL(edit.coverBlob) : '', captionBlob: edit.captionBlob || null, captionUrl: edit.captionBlob ? URL.createObjectURL(edit.captionBlob) : '' };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function getFavorites() { try { return JSON.parse(localStorage.getItem('replay-favorites') || '[]'); } catch { return []; } }
function saveFavorites(ids) { localStorage.setItem('replay-favorites', JSON.stringify(ids)); }
function getLikes() { if (state.cloud) return state.cloudLikes; try { return JSON.parse(localStorage.getItem('replay-likes') || '{}'); } catch { return {}; } }
function getComments() { if (state.cloud) return state.cloudComments; try { return JSON.parse(localStorage.getItem('replay-comments') || '{}'); } catch { return {}; } }
async function apiRequest(path, options = {}) {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', cache: 'no-store', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Falha ao acessar o servidor (${response.status}).`);
  return data;
}
async function uploadCloudAsset(videoId, type, file) {
  const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (localHost) {
    if (file.size > 100 * 1024 * 1024) throw new Error('No modo local, o envio é limitado a 100 MB. Na versão publicada, o arquivo vai direto para o R2.');
    await apiRequest(`videos/${encodeURIComponent(videoId)}/asset?type=${type}`, { method: 'PUT', headers: { 'content-type': type === 'caption' ? 'text/vtt' : file.type }, body: file });
    return;
  }
  const signed = await apiRequest(`upload-url?videoId=${encodeURIComponent(videoId)}&type=${type}`, {
    method: 'POST', headers: { 'content-type': type === 'caption' ? 'text/vtt' : file.type }
  });
  const response = await fetch(signed.url, { method: 'PUT', mode: 'cors', credentials: 'omit', headers: { 'content-type': signed.contentType }, body: file });
  if (!response.ok) throw new Error(`O armazenamento recusou o arquivo (${response.status}). Confira as permissões e o CORS do R2.`);
  await apiRequest(`upload-confirm?videoId=${encodeURIComponent(videoId)}&type=${type}`, { method: 'POST' });
}
async function refreshCloud() {
  try {
    const library = await apiRequest('library');
    if (!Array.isArray(library.videos) || !Array.isArray(library.games)) return false;
    state.cloud = true; state.videos = library.videos; state.games = library.games;
    state.cloudLikes = library.likes || {}; state.cloudLikeCounts = library.likeCounts || {}; state.cloudComments = library.comments || {};
    render(); return true;
  } catch (error) {
    if (location.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) {
      state.cloud = true; state.videos = []; state.games = ['Outros']; state.cloudLikes = {}; state.cloudLikeCounts = {}; state.cloudComments = {};
      render(); showToast('Não foi possível conectar à biblioteca online. Tente atualizar a página.'); return true;
    }
    state.cloud = false; return false;
  }
}
function renderSocial(video) {
  if (!video) return;
  const likes = getLikes();
  const modalLike = document.querySelector('#modalLike');
  modalLike.dataset.like = video.id;
  modalLike.classList.toggle('liked', Boolean(likes[video.id]));
  document.querySelector('#modalLikeText').textContent = likes[video.id] ? 'Curtido' : 'Curtir';
  document.querySelector('#modalLikeCount').textContent = String(state.cloud ? (state.cloudLikeCounts[video.id] || 0) : (likes[video.id] ? 1 : 0));
  document.querySelector('#commentsList').innerHTML = (getComments()[video.id] || []).map(comment => `<article class="comment-item"><div class="comment-item-head"><span>${escapeHtml(comment.email || 'Vocês')} · ${escapeHtml(comment.date || 'Agora')}</span><button data-delete-comment="${escapeHtml(video.id)}:${escapeHtml(comment.id)}" aria-label="Apagar comentário">Apagar</button></div><p>${escapeHtml(comment.text)}</p></article>`).join('') || '<p class="no-comments">Ainda não tem comentário. Comece a conversa! 💬</p>';
}
function render() {
  renderGameControls();
  const favorites = getFavorites();
  const matching = state.videos.filter(video => {
    const matchesFilter = state.filter === 'Todos' || video.game === state.filter;
    const text = `${video.title} ${video.game}`.toLocaleLowerCase('pt-BR');
    return matchesFilter && text.includes(state.search.toLocaleLowerCase('pt-BR')) && (!state.favoritesOnly || favorites.includes(video.id));
  });
  grid.innerHTML = matching.map(video => {
    const gameKey = ['Valorant','Minecraft','Fortnite'].includes(video.game) ? video.game.toLowerCase() : 'outros';
    const thumb = video.url ? `<video src="${escapeHtml(video.url)}" muted preload="metadata"></video>` : `<div class="thumb-pattern"></div><div class="thumb-art">${escapeHtml(video.symbol || '✦')}</div>`;
    const cover = video.coverUrl ? `<img class="custom-cover" src="${escapeHtml(video.coverUrl)}" alt="Capa: ${escapeHtml(video.title)}" />` : '';
    const likes = getLikes();
    const likeCount = state.cloud ? (state.cloudLikeCounts[video.id] || 0) : (likes[video.id] ? 1 : 0);
    return `<article class="video-card" data-id="${escapeHtml(video.id)}" tabindex="0" role="button" aria-label="Assistir ${escapeHtml(video.title)}"><div class="thumbnail thumb-${gameKey}">${thumb}${cover}<span class="thumb-play">▶</span><span class="thumb-time">${escapeHtml(video.duration || 'Vídeo')}</span></div><div class="video-info"><div class="card-topline"><span class="game-badge ${gameKey}">${escapeHtml(video.game)}</span><span class="card-actions"><button class="edit-button" data-edit="${escapeHtml(video.id)}" aria-label="Editar ${escapeHtml(video.title)}" title="Editar vídeo">✎</button><button class="delete-button" data-delete-video="${escapeHtml(video.id)}" aria-label="Apagar ${escapeHtml(video.title)}" title="Apagar vídeo">✕</button><button class="like-button ${likes[video.id] ? 'liked' : ''}" data-like="${escapeHtml(video.id)}" aria-label="Curtir vídeo">👍 <b>${likeCount}</b></button><button class="favorite-button ${favorites.includes(video.id) ? 'liked' : ''}" data-favorite="${escapeHtml(video.id)}" aria-label="${favorites.includes(video.id) ? 'Remover dos' : 'Adicionar aos'} favoritos">${favorites.includes(video.id) ? '♥' : '♡'}</button></span></div><h3>${escapeHtml(video.title)}</h3><div class="video-meta"><span>Meu canal</span><span class="dot">•</span><span>${escapeHtml(video.date || 'Agora')}</span></div></div></article>`;
  }).join('');
  emptyState.hidden = matching.length > 0;
  document.querySelector('#videoCount').textContent = String(state.videos.length).padStart(2, '0');
  document.querySelector('#favoriteCount').textContent = String(favorites.length).padStart(2, '0');
  document.querySelector('#allFilterCount').textContent = String(state.videos.length);
  renderGamesManager();
  const selectedGame = document.querySelector('#editGame');
  if (selectedGame && !document.querySelector('#editModal').hidden) selectedGame.innerHTML = state.games.map(game => `<option value="${escapeHtml(game)}">${escapeHtml(game)}</option>`).join('');
}
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function openVideo(video) {
  activeVideoId = video.id;
  const modal = document.querySelector('#videoModal');
  document.querySelector('#modalTitle').textContent = video.title;
  document.querySelector('#modalGame').textContent = video.game;
  document.querySelector('#modalMeta').textContent = `${video.description || 'Um momento especial do canal.'} · ${video.date || 'Agora'}`;
  const player = document.querySelector('#modalPlayer');
  if (video.url) player.innerHTML = `<video src="${escapeHtml(video.url)}" controls autoplay playsinline>${video.captionUrl ? `<track kind="subtitles" src="${escapeHtml(video.captionUrl)}" srclang="pt-BR" label="Português" default>` : ''}</video>`;
  else player.innerHTML = `<div class="modal-placeholder"><div><span>▶</span><p>Adicione um vídeo pelo botão <b>Enviar vídeo</b><br>para assistir a sua gameplay aqui.</p></div></div>`;
  modal.hidden = false; document.body.style.overflow = 'hidden'; renderSocial(video);
}
function closeModal() { document.querySelector('#videoModal').hidden = true; document.querySelector('#modalPlayer').innerHTML = ''; document.body.style.overflow = ''; activeVideoId = null; }
function openEdit(video) {
  editingVideoId = video.id; editCoverFile = undefined; editCaptionFile = undefined;
  document.querySelector('#editTitle').value = video.title;
  document.querySelector('#editGame').innerHTML = state.games.map(game => `<option value="${escapeHtml(game)}">${escapeHtml(game)}</option>`).join('');
  document.querySelector('#editGame').value = state.games.includes(video.game) ? video.game : 'Outros';
  const preview = document.querySelector('#coverPreview');
  preview.hidden = !video.coverUrl; preview.src = video.coverUrl || '';
  document.querySelector('#coverPrompt').textContent = video.coverUrl ? 'Trocar imagem da capa' : 'Escolher uma imagem';
  document.querySelector('#captionStatus').textContent = video.captionUrl ? 'Legenda atual carregada · selecione outra para trocar' : 'Nenhuma legenda adicionada';
  document.querySelector('#captionInput').value = '';
  document.querySelector('#editModal').hidden = false; document.body.style.overflow = 'hidden';
}
function closeEdit() { document.querySelector('#editModal').hidden = true; document.body.style.overflow = ''; document.querySelector('#coverInput').value = ''; document.querySelector('#captionInput').value = ''; }
async function deleteVideo(video) {
  if (!window.confirm(`Apagar “${video.title}” do canal?`)) return;
  if (state.cloud) {
    try { await apiRequest(`videos/${encodeURIComponent(video.id)}`, { method: 'DELETE' }); await refreshCloud(); showToast('Vídeo apagado da biblioteca compartilhada.'); }
    catch (error) { showToast(error.message); }
    return;
  }
  try {
    const db = await openLibrary();
    const transaction = db.transaction(['videos', 'edits'], 'readwrite');
    transaction.objectStore('videos').delete(video.id); transaction.objectStore('edits').delete(video.id);
    await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); });
    db.close();
  } catch { showToast('Não foi possível apagar este vídeo do armazenamento local.'); return; }
  if (video.url) URL.revokeObjectURL(video.url);
  if (video.coverUrl) URL.revokeObjectURL(video.coverUrl);
  state.videos = state.videos.filter(item => item.id !== video.id);
  const deleted = readDeletedVideos(); if (!deleted.includes(video.id)) deleted.push(video.id);
  localStorage.setItem('replay-deleted-videos', JSON.stringify(deleted));
  saveFavorites(getFavorites().filter(id => id !== video.id));
  const likes = getLikes(); delete likes[video.id]; localStorage.setItem('replay-likes', JSON.stringify(likes));
  const comments = getComments(); delete comments[video.id]; localStorage.setItem('replay-comments', JSON.stringify(comments));
  render(); showToast('Vídeo apagado.');
}
async function deleteGame(game) {
  if (game === 'Outros') { showToast('“Outros” é a categoria padrão e não pode ser removida.'); return; }
  const affected = state.videos.filter(video => video.game === game);
  if (!window.confirm(`Remover o jogo “${game}”? ${affected.length ? `${affected.length} vídeo(s) vão passar para Outros.` : ''}`)) return;
  if (state.cloud) {
    try { await apiRequest(`games/${encodeURIComponent(game)}`, { method: 'DELETE' }); if (state.filter === game) state.filter = 'Todos'; await refreshCloud(); showToast(`Jogo “${game}” removido.`); }
    catch (error) { showToast(error.message); }
    return;
  }
  try {
    const db = await openLibrary();
    const transaction = db.transaction('edits', 'readwrite');
    const store = transaction.objectStore('edits');
    for (const video of affected) store.put({ id: video.id, title: video.title, game: 'Outros', coverBlob: video.coverBlob || null, captionBlob: video.captionBlob || null });
    await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); });
    db.close();
  } catch { showToast('Não foi possível salvar as alterações dos vídeos.'); return; }
  for (const video of affected) video.game = 'Outros';
  state.games = state.games.filter(item => item !== game);
  if (state.filter === game) state.filter = 'Todos';
  persistGames(); render(); showToast(`Jogo “${game}” removido.`);
}
function openFilePicker() { document.querySelector('#fileInput').click(); }
function formatDuration(seconds) { if (!Number.isFinite(seconds)) return 'Vídeo'; const mins = Math.floor(seconds / 60); return `${String(mins).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`; }
async function addVideo(file) {
  if (!file) return;
  if (!file.type.startsWith('video/')) { showToast('Escolha um arquivo de vídeo.'); return; }
  if (state.cloud) {
    showToast('Enviando vídeo para a biblioteca compartilhada…');
    let createdId = null;
    try {
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      const created = await apiRequest('videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, game: 'Outros' }) });
      createdId = created.id;
      await uploadCloudAsset(created.id, 'video', file);
      await refreshCloud(); state.filter = 'Todos'; state.search = ''; state.favoritesOnly = false; document.querySelector('#searchInput').value = '';
      document.querySelector('#videos').scrollIntoView({ behavior: 'smooth' }); showToast('Vídeo enviado. Ele já aparece nos aparelhos autorizados.');
    } catch (error) { if (createdId) await apiRequest(`videos/${encodeURIComponent(createdId)}`, { method: 'DELETE' }).catch(() => {}); showToast(error.message); }
    return;
  }
  const video = { id: `local-${Date.now()}`, title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), game: 'Outros', date: 'Agora', duration: 'Vídeo', kind: 'other', symbol: '✦', url: URL.createObjectURL(file), description: 'Vídeo enviado agora' };
  state.videos.unshift(video);
  const probe = document.createElement('video'); probe.preload = 'metadata'; probe.src = video.url;
  probe.onloadedmetadata = () => { video.duration = formatDuration(probe.duration); render(); probe.removeAttribute('src'); };
  try {
    const db = await openLibrary();
    await new Promise((resolve, reject) => {
      const request = db.transaction('videos', 'readwrite').objectStore('videos').put({ ...video, file });
      request.onsuccess = resolve; request.onerror = () => reject(request.error);
    });
    db.close();
  } catch { showToast('O vídeo entrou na lista, mas não foi possível salvá-lo neste navegador.'); }
  state.filter = 'Todos'; state.search = ''; state.favoritesOnly = false; document.querySelector('#searchInput').value = ''; render();
  document.querySelector('#videos').scrollIntoView({ behavior: 'smooth' }); showToast('Vídeo salvo neste navegador.');
}

document.addEventListener('click', event => {
  const commentDelete = event.target.closest('[data-delete-comment]');
  if (commentDelete) {
    const [videoId, commentId] = commentDelete.dataset.deleteComment.split(':');
    if (state.cloud) { apiRequest(`comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }).then(refreshCloud).then(() => renderSocial(state.videos.find(video => video.id === videoId))).catch(error => showToast(error.message)); return; }
    const comments = getComments(); comments[videoId] = (comments[videoId] || []).filter(comment => String(comment.id) !== commentId);
    localStorage.setItem('replay-comments', JSON.stringify(comments));
    renderSocial(state.videos.find(video => video.id === videoId)); return;
  }
  const likeButton = event.target.closest('[data-like]');
  if (likeButton) {
    event.stopPropagation(); const id = likeButton.dataset.like; const likes = getLikes();
    if (state.cloud) { apiRequest(`videos/${encodeURIComponent(id)}/like`, { method: 'POST' }).then(refreshCloud).then(() => { if (activeVideoId === id) renderSocial(state.videos.find(video => video.id === id)); }).catch(error => showToast(error.message)); return; }
    if (likes[id]) delete likes[id]; else likes[id] = true;
    localStorage.setItem('replay-likes', JSON.stringify(likes)); render();
    if (activeVideoId === id) renderSocial(state.videos.find(video => video.id === id));
    return;
  }
  const deleteGameButton = event.target.closest('[data-delete-game]');
  if (deleteGameButton) { deleteGame(deleteGameButton.dataset.deleteGame); return; }
  const deleteButton = event.target.closest('[data-delete-video]');
  if (deleteButton) { event.stopPropagation(); const video = state.videos.find(item => item.id === deleteButton.dataset.deleteVideo); if (video) deleteVideo(video); return; }
  const editButton = event.target.closest('[data-edit]');
  if (editButton) { event.stopPropagation(); const video = state.videos.find(item => item.id === editButton.dataset.edit); if (video) openEdit(video); return; }
  const favoriteButton = event.target.closest('[data-favorite]');
  if (favoriteButton) {
    event.stopPropagation(); const id = favoriteButton.dataset.favorite; const favorites = getFavorites();
    saveFavorites(favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id]); render(); return;
  }
  const card = event.target.closest('.video-card');
  if (card) { const video = state.videos.find(item => item.id === card.dataset.id); if (video) openVideo(video); }
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) { state.filter = filterButton.dataset.filter; state.favoritesOnly = false; render(); }
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#searchInput').focus(); }
  if (event.key === 'Escape') { closeModal(); if (!document.querySelector('#editModal').hidden) closeEdit(); if (!document.querySelector('#gamesModal').hidden) { document.querySelector('#gamesModal').hidden = true; document.body.style.overflow = ''; } }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.video-card')) { event.preventDefault(); const video = state.videos.find(item => item.id === event.target.dataset.id); if (video) openVideo(video); }
});
document.querySelector('#searchInput').addEventListener('input', event => { state.search = event.target.value.trim(); render(); });
document.querySelector('#uploadButton').addEventListener('click', openFilePicker);
document.querySelector('#heroUpload').addEventListener('click', openFilePicker);
document.querySelector('#fileInput').addEventListener('change', event => { addVideo(event.target.files[0]); event.target.value = ''; });
document.querySelector('#modalClose').addEventListener('click', closeModal);
document.querySelector('#videoModal').addEventListener('click', event => { if (event.target.id === 'videoModal') closeModal(); });
document.querySelector('#editClose').addEventListener('click', closeEdit);
document.querySelector('#editModal').addEventListener('click', event => { if (event.target.id === 'editModal') closeEdit(); });
document.querySelector('#coverInput').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Escolha um arquivo de imagem.'); return; }
  editCoverFile = file;
  const preview = document.querySelector('#coverPreview'); preview.src = URL.createObjectURL(file); preview.hidden = false;
  document.querySelector('#coverPrompt').textContent = 'Trocar imagem da capa';
});
document.querySelector('#captionInput').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  if (!file.name.toLowerCase().endsWith('.vtt')) { showToast('A legenda precisa estar no formato .vtt.'); event.target.value = ''; return; }
  editCaptionFile = file; document.querySelector('#captionStatus').textContent = file.name;
});
document.querySelector('#removeCaption').addEventListener('click', () => {
  editCaptionFile = null; document.querySelector('#captionInput').value = '';
  document.querySelector('#captionStatus').textContent = 'Legenda será removida';
});
document.querySelector('#removeCover').addEventListener('click', () => {
  editCoverFile = null;
  const preview = document.querySelector('#coverPreview'); preview.src = ''; preview.hidden = true;
  document.querySelector('#coverPrompt').textContent = 'Escolher uma imagem';
});
document.querySelector('#editForm').addEventListener('submit', async event => {
  event.preventDefault();
  const video = state.videos.find(item => item.id === editingVideoId); if (!video) return;
  video.title = document.querySelector('#editTitle').value.trim();
  video.game = document.querySelector('#editGame').value;
  if (state.cloud) {
    try {
      await apiRequest(`videos/${encodeURIComponent(video.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: video.title, game: video.game }) });
      for (const [type, file] of [['cover', editCoverFile], ['caption', editCaptionFile]]) {
        if (file === undefined) continue;
        const assetPath = `videos/${encodeURIComponent(video.id)}/asset?type=${type}`;
        if (file === null) await apiRequest(assetPath, { method: 'DELETE' });
        else await uploadCloudAsset(video.id, type, file);
      }
      closeEdit(); await refreshCloud(); showToast('Vídeo atualizado na biblioteca compartilhada!');
    } catch (error) { showToast(error.message); }
    return;
  }
  if (editCoverFile !== undefined) { video.coverBlob = editCoverFile; video.coverUrl = editCoverFile ? URL.createObjectURL(editCoverFile) : ''; }
  if (editCaptionFile !== undefined) { video.captionBlob = editCaptionFile; video.captionUrl = editCaptionFile ? URL.createObjectURL(editCaptionFile) : ''; }
  try {
    const db = await openLibrary();
    await new Promise((resolve, reject) => {
      const request = db.transaction('edits', 'readwrite').objectStore('edits').put({ id: video.id, title: video.title, game: video.game, coverBlob: video.coverBlob || null, captionBlob: video.captionBlob || null });
      request.onsuccess = resolve; request.onerror = () => reject(request.error);
    });
    db.close();
  } catch { showToast('Alterações aplicadas, mas não foi possível salvá-las neste navegador.'); }
  closeEdit(); render(); showToast('Vídeo atualizado!');
});
document.querySelector('#commentForm').addEventListener('submit', async event => {
  event.preventDefault(); if (!activeVideoId) return;
  const input = document.querySelector('#commentInput'); const text = input.value.trim(); if (!text) return;
  if (state.cloud) { try { await apiRequest(`videos/${encodeURIComponent(activeVideoId)}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }); input.value = ''; await refreshCloud(); renderSocial(state.videos.find(video => video.id === activeVideoId)); } catch (error) { showToast(error.message); } return; }
  const comments = getComments(); comments[activeVideoId] ||= [];
  comments[activeVideoId].push({ id: String(Date.now()), text, date: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date()) });
  localStorage.setItem('replay-comments', JSON.stringify(comments)); input.value = '';
  renderSocial(state.videos.find(video => video.id === activeVideoId));
});
document.querySelector('#manageGamesButton').addEventListener('click', () => { renderGamesManager(); document.querySelector('#gamesModal').hidden = false; document.body.style.overflow = 'hidden'; });
document.querySelector('#gamesClose').addEventListener('click', () => { document.querySelector('#gamesModal').hidden = true; document.body.style.overflow = ''; });
document.querySelector('#gamesModal').addEventListener('click', event => { if (event.target.id === 'gamesModal') { event.currentTarget.hidden = true; document.body.style.overflow = ''; } });
document.querySelector('#addGameForm').addEventListener('submit', async event => {
  event.preventDefault(); const name = document.querySelector('#newGameName').value.trim();
  if (!name) return;
  if (state.games.some(game => game.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) { showToast('Esse jogo já está na lista.'); return; }
  if (state.cloud) { try { await apiRequest('games', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }); event.currentTarget.reset(); await refreshCloud(); document.querySelector('#gamesModal').hidden = false; document.body.style.overflow = 'hidden'; showToast(`Jogo “${name}” adicionado.`); } catch (error) { showToast(error.message); } return; }
  state.games.push(name); persistGames(); event.currentTarget.reset(); render();
  document.querySelector('#gamesModal').hidden = false; document.body.style.overflow = 'hidden'; showToast(`Jogo “${name}” adicionado.`);
});
document.querySelector('#likedNav').addEventListener('click', () => { state.favoritesOnly = !state.favoritesOnly; state.filter = 'Todos'; document.querySelector('#videos').scrollIntoView({ behavior: 'smooth' }); render(); });
document.querySelector('#viewAll').addEventListener('click', () => { state.filter = 'Todos'; state.favoritesOnly = false; document.querySelector('#searchInput').value = ''; state.search = ''; render(); });
document.querySelector('#themeButton').addEventListener('click', () => { document.body.classList.toggle('light-mode'); showToast(document.body.classList.contains('light-mode') ? 'Tema claro ativado.' : 'Tema escuro ativado.'); });
document.querySelector('#menuToggle').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-link[href^="#"]').forEach(link => link.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active')); link.classList.add('active'); document.querySelector('#sidebar').classList.remove('open'); }));
let deferredInstallPrompt = null;
const isInstalledApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
installButton.hidden = isInstalledApp;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); deferredInstallPrompt = event; installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) {
    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    showToast(isAppleMobile ? 'No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.' : 'Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.');
    return;
  }
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null; installButton.hidden = true;
  if (result.outcome === 'accepted') showToast('Replay instalado no seu aparelho!');
});
window.addEventListener('appinstalled', () => { installButton.hidden = true; showToast('Replay instalado no seu aparelho!'); });
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}
render();
restoreVideos();
