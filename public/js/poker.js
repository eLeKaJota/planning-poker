//------------------------------- INIT
const socket = io();
const name = document.getElementById('name');
const submitName = document.getElementById('submitName');
const room = document.getElementById('room');
const usersTopList = document.getElementById('usersTop');
const usersLeftList = document.getElementById('usersLeft');
const usersRightList = document.getElementById('usersRight');
const usersBottomList = document.getElementById('usersBottom');
const votesCount = document.getElementById('votesCount');
const votesAverage = document.getElementById('votesAverage');
const revealVotes = document.getElementById('revealVotes');
const resetVotes = document.getElementById('resetVotes');
const votesContainer = document.getElementById('votesContainer');
const divStats = document.getElementById('stats');
const copyUrlDiv = document.getElementById('copyUrlDiv');
const copyUrlInput = document.getElementById('copyUrlInput');
const copyUrlButton = document.getElementById('copyUrlButton');
const copyUrlInfo = document.getElementById('copyUrlInfo');
const modal = new bootstrap.Modal(document.getElementById('nameModal'), {
  backdrop: 'static',
  keyboard: false,
});
const buttons = document.getElementsByClassName('fibonacci-button');

let locationPath = window.location.pathname.split('/');
const roomName = window.location.pathname.split('/');
let usersArray = [];
let mySocketId = '';
let cardReveal = false;
let winner = true;
let highest = 0;
let admin = false;

joinRoom();
modal.show();
divStats.style.display = 'none';
votesContainer.style.display = 'flex';
room.textContent = formatLocationPath(locationPath[locationPath.length - 1]);

//------------------------------- UTILS
function getNearestFibonacci(number) {
  let a = 0;
  let b = 1;
  let temp;

  while (b < number) {
    temp = a;
    a = b;
    b = temp + b;
  }
  if (Math.abs(number - a) < Math.abs(b - number)) {
    return a;
  } else {
    return b;
  }
}

function truncate(str, n) {
  if (str.length <= n) {
    return str;
  } else {
    let subString = str.substr(0, n - 1); // the original check
    return subString.substr(0, subString.lastIndexOf(' ')) + '...';
  }
};

function formatLocationPath(string) {
  const replace = string.replace(/-/g, ' ');
  return replace.charAt(0).toUpperCase() + replace.slice(1);
};

//------------------------------- FUNCTIONS
function revealUserVotes() {
  const userVotes = document.getElementsByClassName('user-vote');
  for (let i = 0; i < userVotes.length; i++) {
    userVotes[i].classList.remove('user-vote-hide');
    userVotes[i].classList.remove('user-vote-hidden');
    userVotes[i].classList.add('user-vote-reveal');
  }

  renderVotesStats();
};

function getStats() {
  const votesRaw = {};
  let votesCountNumber = 0;
  let votesTotal = 0;
  let averageVotes = 0;
  usersArray.forEach(user => {
    if (user.vote !== '' && user.vote !== '🤨') {
      votesCountNumber++;
      votesTotal += parseInt(user.vote);
      if (votesRaw[user.vote]) {
        votesRaw[user.vote]++;
      } else {
        votesRaw[user.vote] = 1;
      }
    }
  });

  const votes = Object.entries(votesRaw).
      sort((a, b) => a[1] - b[1]).
      reverse();

  averageVotes = votesTotal / votesCountNumber;
  averageVotes = getNearestFibonacci(averageVotes);
  return {averageVotes, votes};
};

function adminCheck() {
  const adminUser = usersArray.find(user => user.admin === true);
  admin = adminUser?.id === mySocketId;
}

copyUrlButton.addEventListener('click', () => {
  copyUrlInput.select();
  copyUrlInput.setSelectionRange(0, 99999);
  document.execCommand('copy');
  copyUrlInfo.textContent = 'URL copiada';
  setTimeout(() => {
    copyUrlInfo.textContent = window.location.href;
  }, 2000);
});

//------------------------------- RENDERS
function updateUserList() {
  const usersTop = usersArray.filter(user => user.seat === 'top').sort();
  const usersLeft = usersArray.filter(user => user.seat === 'left').sort();
  const usersRight = usersArray.filter(user => user.seat === 'right').sort();
  const usersBottom = usersArray.filter(user => user.seat === 'bottom').sort();

  usersTopList.innerHTML = '';
  usersLeftList.innerHTML = '';
  usersRightList.innerHTML = '';
  usersBottomList.innerHTML = '';
  usersTop.forEach(user => {
    const li = document.createElement('li');
    const userContent = `<div class="user-table">
            <div id="userVoteCardTop" class="user-vote">${user.vote}</div>
            <div class="user-name" title="${user.user}">${truncate(user.user,
        20)} ${user.vote !== ''
        ? '<span class="vote-check">✓</span>'
        : ''}</div>
        </div>`;
    li.classList.add('list-group-item');
    li.innerHTML = userContent;

    const userVoteCard = li.querySelector('#userVoteCardTop');
    if (user.vote !== '' && !cardReveal) {
      userVoteCard.classList.add('user-vote-hidden');
    }
    usersTopList.appendChild(li);
  });
  usersLeft.forEach(user => {
    const li = document.createElement('li');
    const userContent = `<div class="user-table">
            <div id="userVoteCardLeft" class="user-vote">${user.vote}</div>
            <div class="user-name" title="${user.user}">${truncate(user.user,
        20)} ${user.vote !== ''
        ? '<span class="vote-check">✓</span>'
        : ''}</div>
        </div>`;
    li.classList.add('list-group-item');
    li.innerHTML = userContent;

    const userVoteCard = li.querySelector('#userVoteCardLeft');
    if (user.vote !== '' && !cardReveal) {
      userVoteCard.classList.add('user-vote-hidden');
    }
    usersLeftList.appendChild(li);
  });
  usersRight.forEach(user => {
    const li = document.createElement('li');
    const userContent = `<div class="user-table">
            <div id="userVoteCardRight" class="user-vote">${user.vote}</div>
            <div class="user-name" title="${user.user}">${truncate(user.user,
        20)} ${user.vote !== ''
        ? '<span class="vote-check">✓</span>'
        : ''}</div>
        </div>`;
    li.classList.add('list-group-item');
    li.innerHTML = userContent;

    const userVoteCard = li.querySelector('#userVoteCardRight');
    if (user.vote !== '' && !cardReveal) {
      userVoteCard.classList.add('user-vote-hidden');
    }
    usersRightList.appendChild(li);
  });
  usersBottom.forEach(user => {
    const li = document.createElement('li');
    const userContent = `<div class="user-table">
            <div id="userVoteCardBottom" class="user-vote">${user.vote}</div>
            <div class="user-name" title="${user.user}">${truncate(user.user,
        20)} ${user.vote !== ''
        ? '<span class="vote-check">✓</span>'
        : ''}</div>
        </div>`;
    li.classList.add('list-group-item');
    li.innerHTML = userContent;

    const userVoteCard = li.querySelector('#userVoteCardBottom');
    if (user.vote !== '' && !cardReveal) {
      userVoteCard.classList.add('user-vote-hidden');
    }
    usersBottomList.appendChild(li);
  });
};

function renderVoteWithCard(vote, count) {
  const voteCount = document.createElement('div');
  voteCount.classList.add('vote-count');
  const cardContent = document.createElement('div');
  cardContent.classList.add('user-vote');
  cardContent.textContent = vote;
  voteCount.appendChild(cardContent);
  const countContent = document.createElement('div');
  countContent.classList.add('vote-count');
  countContent.textContent = `${count} Votos`;
  voteCount.appendChild(countContent);
  if (winner || highest === count) {
    cardContent.classList.add('winner');
    highest = count;
    winner = false;
  }
  votesCount.appendChild(voteCount);
};

function renderVotesStats() {
  const {averageVotes, votes} = getStats();

  votes.map(([vote, count]) => renderVoteWithCard(vote, count));

  const votesAverageContent = `<div class="votes-average-content">
            <div class="user-vote average">${averageVotes}</div>
            <div class="vote-count">Media</div>
        </div>`;

  votesAverage.innerHTML = votesAverageContent;
};

//------------------------------- CHECK DISPLAY
function checkRevealButton() {
  const canReveal = usersArray.every(user => user.vote !== '') && !cardReveal;
  if (canReveal && admin) {
    revealVotes.style.display = 'block';
  } else {
    revealVotes.style.display = 'none';
  }
};

function checkResetButton() {
  if (cardReveal && admin) {
    resetVotes.style.display = 'block';
  } else {
    resetVotes.style.display = 'none';
  }
};

function checkDivStats() {
  if (cardReveal) {
    divStats.style.display = 'flex';
    votesContainer.style.display = 'none';
  } else {
    divStats.style.display = 'none';
    votesContainer.style.display = 'flex';
  }
};

function checkUrlCopyDiv() {
  const canReveal = usersArray.every(user => user.vote !== '');
  if (admin && !canReveal) {
    copyUrlDiv.style.display = 'block';
    copyUrlInput.value = window.location.href;
  } else {
    copyUrlDiv.style.display = 'none';
  }
}

//------------------------------- SOCKET OUT
revealVotes.addEventListener('click', () => {
  socket.emit('reveal', roomName[roomName.length - 1]);
});

resetVotes.addEventListener('click', () => {
  socket.emit('reset', roomName[roomName.length - 1]);
});

submitName.addEventListener('click', () => {
  if (!name.value || name.value === '' || name.value === ' ') {
    return;
  }
  socket.emit('newUser',
      {room: roomName[roomName.length - 1], user: name.value});
  modal.hide();
});

for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('click', () => {
    buttons[i].classList.add('fibonacci-button-selected');
    for (let j = 0; j < buttons.length; j++) {
      if (buttons[j] !== buttons[i]) {
        buttons[j].classList.remove('fibonacci-button-selected');
      }
    }
    socket.emit('vote',
        {room: roomName[roomName.length - 1], vote: buttons[i].textContent});
  });
}

function joinRoom() {
  socket.emit('joinRoom', roomName[roomName.length - 1]);
};

//------------------------------- SOCKET IN
socket.on('reset', ({users, reveal}) => {
  usersArray = [...users];
  updateUserList();
  cardReveal = reveal;
  revealVotes.textContent = 'Revelar cartas';
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('fibonacci-button-selected');
  }
  revealVotes.style.display = 'block';
  resetVotes.style.display = 'none';
  divStats.style.display = 'none';
  winner = true;
  highest = 0;
  votesCount.innerHTML = '';
  checkRevealButton();
  checkResetButton();
  checkUrlCopyDiv();
  checkDivStats();
});

socket.on('reveal', (reveal) => {
  cardReveal = reveal;
  if (cardReveal) {
    revealUserVotes();
    revealVotes.style.display = 'none';
  }
  checkResetButton();
  checkDivStats();
  checkUrlCopyDiv();
});

socket.on('users', ({users, reveal}) => {
  usersArray = [...users];
  cardReveal = reveal;
  updateUserList();
  adminCheck();
  checkRevealButton();
  checkResetButton();
  checkUrlCopyDiv();
  checkDivStats();
});

socket.on('connect', () => {
  console.log('Conectado. Disfruta de la partida.');
  mySocketId = socket.id;
});
