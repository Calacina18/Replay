// Jogos disponíveis nos filtros. Altere esta lista para adicionar ou remover jogos.
window.REPLAY_GAMES = ['Minecraft', "that's not my neighbor"];

// Catálogo fixo do site. Para adicionar um vídeo, copie um item e altere os dados.
// Coloque o arquivo em videos/ e use caminhos relativos, por exemplo: videos/valorant-ace.mp4
window.REPLAY_VIDEOS = [
  {
    id: 'v1',
    title: "Jogando that's not my neighbor",
    game: "that's not my neighbor",
    date: 'Hoje',
    duration: '21:57',
    kind: 'other',
    symbol: '✦',
    description: 'Gameplay de That’s Not My Neighbor.',
    url: 'videos/thats-not-my-neighbor.mp4',
    coverUrl: 'videos/capas/thats-not-my-neighbor.png'
  },


  // EXEMPLO: copie este bloco, tire as barras // e troque os dados e caminhos.
  // {
  //   id: 'v4', // cada vídeo precisa de um id diferente
  //   title: 'Minha nova gameplay',
  //   game: 'Minecraft',
  //   date: '26 de outubro',
  //   duration: '12:30',
  //   kind: 'minecraft',
  //   symbol: '◇',
  //   description: 'Uma partida para rever.',
  //   url: 'videos/minha-gameplay.mp4',
  //   coverUrl: 'videos/capas/minha-gameplay.jpg',
  //   captionUrl: 'videos/legendas/minha-gameplay.vtt'
  // }
];
