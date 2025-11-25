const API_KEY = '789e64b220614de7a6f1750426f2a67f'; 
const GAMES_API_URL = 'https://api.rawg.io/api/games';
const GENRES_API_URL = 'https://api.rawg.io/api/genres'; 
const LOCAL_API_URL = '/api/games';

const SEARCH_INPUT = document.getElementById('search-input');
const SEARCH_BUTTON = document.getElementById('search-button');
const LIVE_RESULTS = document.getElementById('live-results');
const LIST_CONTAINER = document.getElementById('list-container');
const DETAIL_CONTAINER = document.getElementById('detail-container');
const GENRE_SELECT = document.getElementById('genre-select');
const YEAR_SELECT = document.getElementById('year-select');
const LOADING_MORE = document.getElementById('loading-more');

const GAME_FORM = document.getElementById('gameForm');
const MY_GAME_LIST = document.getElementById('gameList');

let nextPageUrl = null;
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    if (LIST_CONTAINER) {
        console.log("Initializing Project 1 (Search)...");
        initSearchPage();
    }

    if (MY_GAME_LIST) {
        console.log("Initializing Project 2 (Database)...");
        initUserPage();
    }
});

async function initSearchPage() {
    if (SEARCH_BUTTON) SEARCH_BUTTON.addEventListener('click', handleMainSearchClick);
    if (SEARCH_INPUT) SEARCH_INPUT.addEventListener('input', handleLiveSearchInput);
    if (GENRE_SELECT) GENRE_SELECT.addEventListener('change', handleFilterChange);
    if (YEAR_SELECT) YEAR_SELECT.addEventListener('change', handleFilterChange);
    
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', (e) => {
        if (LIVE_RESULTS && !e.target.closest('.search-container')) {
            LIVE_RESULTS.style.display = 'none';
        }
    });

    await populateGenres(); 
    populateYears();
    fetchList(`${GAMES_API_URL}?key=${API_KEY}&ordering=-rating&page_size=15`);
}

async function populateGenres() {
    try {
        const response = await fetch(`${GENRES_API_URL}?key=${API_KEY}&page_size=40`);
        const data = await response.json();
        data.results.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.slug; 
            option.textContent = genre.name;
            GENRE_SELECT.appendChild(option);
        });
    } catch (e) { console.error("Genre Error:", e); }
}

function populateYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 10; year--) {
        const option = document.createElement('option');
        option.value = `${year}-01-01,${year}-12-31`; 
        option.textContent = year;
        YEAR_SELECT.appendChild(option);
    }
}

async function fetchList(url, append = false) {
    if (!url) return;
    
    if (DETAIL_CONTAINER) DETAIL_CONTAINER.style.display = 'none';
    if (LIST_CONTAINER) LIST_CONTAINER.style.display = 'grid';
    
    if (!append) LIST_CONTAINER.innerHTML = '<p>Loading games...</p>';
    if (LOADING_MORE) LOADING_MORE.style.display = 'block'; 

    try {
        const response = await fetch(url);
        const data = await response.json();
        nextPageUrl = data.next;
        
        if (!append) LIST_CONTAINER.innerHTML = ''; 
        displayGameList(data.results);
        if (LOADING_MORE) LOADING_MORE.style.display = 'none';
    } catch (error) {
        console.error(error);
        if (LIST_CONTAINER) LIST_CONTAINER.innerHTML = `<p class="error">Error loading games.</p>`;
    }
}

function displayGameList(games) {
    games.forEach(game => {
        const date = game.released || 'TBA';
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <img src="${game.background_image || 'placeholder.jpg'}" alt="${game.name}">
            <div class="game-info">
                <h2>${game.name}</h2>
                <p>Rating: <span class="rating">${game.rating}</span></p>
                <p>Released: ${date}</p>
            </div>
        `;
        card.onclick = () => fetchAndDisplayDetail(game.id);
        LIST_CONTAINER.appendChild(card);
    });
}

async function fetchAndDisplayDetail(id) {
    LIST_CONTAINER.style.display = 'none';
    DETAIL_CONTAINER.style.display = 'flex';
    DETAIL_CONTAINER.innerHTML = '<p>Loading details...</p>';

    try {
        const response = await fetch(`${GAMES_API_URL}/${id}?key=${API_KEY}`);
        const game = await response.json();
        
        const safeName = game.name.replace(/'/g, "\\'");

        DETAIL_CONTAINER.innerHTML = `
            <div class="detail-image">
                <img src="${game.background_image || 'placeholder.jpg'}" alt="${game.name}">
            </div>
            <div class="detail-content">
                <h1>${game.name}</h1>
                <span class="metascore">${game.metacritic || 'N/A'}</span>
                
                <div style="margin: 20px 0;">
                    <button onclick="quickAddGame('${safeName}')" style="background:#2ecc71; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold;">
                        + Add to My Records
                    </button>
                </div>

                <p class="description">${game.description_raw ? game.description_raw.slice(0, 500) + '...' : 'No description.'}</p>
                <button onclick="backToList()" style="background:#34495e; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-top:20px;">Back to List</button>
            </div>
        `;
    } catch (e) {
        DETAIL_CONTAINER.innerHTML = '<p>Error loading details.</p>';
    }
}

function handleLiveSearchInput() {
    clearTimeout(debounceTimer);
    const term = SEARCH_INPUT.value.trim();
    if (term.length < 3) {
        if(LIVE_RESULTS) LIVE_RESULTS.style.display = 'none';
        return;
    }
    debounceTimer = setTimeout(() => fetchLiveResults(term), 300);
}

async function fetchLiveResults(term) {
    if (!LIVE_RESULTS) return;
    try {
        const res = await fetch(`${GAMES_API_URL}?key=${API_KEY}&search=${term}&page_size=5`);
        const data = await res.json();
        
        LIVE_RESULTS.innerHTML = '';
        if (data.results.length > 0) {
            LIVE_RESULTS.style.display = 'block';
            data.results.forEach(g => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `<img src="${g.background_image}" style="width:40px;height:40px;object-fit:cover;margin-right:10px;"> ${g.name}`;
                div.onclick = () => {
                    SEARCH_INPUT.value = g.name;
                    LIVE_RESULTS.style.display = 'none';
                    fetchAndDisplayDetail(g.id);
                };
                LIVE_RESULTS.appendChild(div);
            });
        } else {
            LIVE_RESULTS.style.display = 'none';
        }
    } catch(e) { console.error(e); }
}

function handleMainSearchClick() {
    const term = SEARCH_INPUT.value.trim();
    if(term) fetchList(`${GAMES_API_URL}?key=${API_KEY}&search=${term}&page_size=20`);
}

function handleFilterChange() {
    const genre = GENRE_SELECT.value;
    const dates = YEAR_SELECT.value;
    let url = `${GAMES_API_URL}?key=${API_KEY}&ordering=-rating&page_size=15`;
    if (genre) url += `&genres=${genre}`;
    if (dates) url += `&dates=${dates}`;
    fetchList(url);
}

function handleScroll() {
    if (LIST_CONTAINER && LIST_CONTAINER.style.display !== 'none' && nextPageUrl) {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (LOADING_MORE.style.display !== 'block') {
                fetchList(nextPageUrl, true);
            }
        }
    }
}

window.backToList = function() {
    DETAIL_CONTAINER.style.display = 'none';
    LIST_CONTAINER.style.display = 'grid';
}


let currentAction = '';
let targetData = null;

function openModal(type, data) {
    const modal = document.getElementById('customModal');
    const title = document.getElementById('modalTitle');
    const text = document.getElementById('modalText');
    const defaultBtns = document.getElementById('modalActionsDefault');
    const successBtns = document.getElementById('modalActionsSuccess');
    
    if (!modal) {
        if(type === 'delete') {
            if(confirm('Delete record?')) performDelete(data);
        } else if(type === 'add') {
            if(confirm('Add game?')) performAdd(data);
        }
        return;
    }

    if(defaultBtns) defaultBtns.style.display = 'flex';
    if(successBtns) successBtns.style.display = 'none';

    if (type === 'add') {
        currentAction = 'add';
        targetData = data;
        title.textContent = 'Track this game?';
        text.innerHTML = `Do you want to add <span style="color:#2980b9;font-weight:bold;">${data}</span> to your backlog?`;
    } 
    else if (type === 'delete') {
        currentAction = 'delete';
        targetData = data;
        title.textContent = 'Delete this record?';
        text.innerHTML = 'Are you sure? This action cannot be undone. ';
    }

    modal.style.display = 'flex';
}

window.closeModal = function() {
    const modal = document.getElementById('customModal');
    if(modal) modal.style.display = 'none';
    currentAction = '';
    targetData = null;
}

window.quickAddGame = function(gameName) {
    openModal('add', gameName);
}

window.deleteGame = function(id) {
    openModal('delete', id);
}

const confirmBtn = document.getElementById('confirmAddBtn') || document.getElementById('confirmActionBtn');

if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
        if (!targetData) return;

        const title = document.getElementById('modalTitle');
        const text = document.getElementById('modalText');
        const defaultBtns = document.getElementById('modalActionsDefault');
        const successBtns = document.getElementById('modalActionsSuccess');
        
        const stayBtn = successBtns ? successBtns.querySelector('button:first-child') : null;
        const profileBtn = successBtns ? successBtns.querySelector('button:last-child') : null;

        if (currentAction === 'add') {
            try {
                const response = await fetch(LOCAL_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameTitle: targetData,
                        status: 'Backlog',
                        hoursPlayed: 0,
                        userRating: null,
                        notes: 'Added from search'
                    })
                });

                if (response.ok) {
                    if(title) title.textContent = 'Saved!';
                    if(text) text.textContent = 'Game added successfully.';
                    
                    if(stayBtn) stayBtn.textContent = 'Keep Browsing';
                    if(profileBtn) profileBtn.style.display = 'inline-block';

                    if(defaultBtns) defaultBtns.style.display = 'none';
                    if(successBtns) successBtns.style.display = 'flex';
                } else {
                    const err = await response.json();
                    if(title) title.textContent = 'Opps?!';
                    if(text) text.textContent = err.error || 'Failed to save.';
                    
                    if(profileBtn) profileBtn.style.display = 'none';
                    if(stayBtn) stayBtn.textContent = 'Close';

                    if(defaultBtns) defaultBtns.style.display = 'none';
                    if(successBtns) successBtns.style.display = 'flex';
                }
            } catch (e) {
                alert('Connection Error');
                closeModal();
            }
        } 
        
        else if (currentAction === 'delete') {
            try {
                await fetch(`${LOCAL_API_URL}/${targetData}`, { method: 'DELETE' });
                closeModal();
                loadSavedGames();
            } catch (e) {
                alert('Delete failed');
                closeModal();
            }
        }
    });
}

function initUserPage() {
    loadSavedGames();

    if (GAME_FORM) {
        GAME_FORM.addEventListener('submit', handleFormSubmit);
    }
}

async function loadSavedGames() {
    try {
        const res = await fetch(LOCAL_API_URL);
        const games = await res.json();
        
        MY_GAME_LIST.innerHTML = '';
        if (games.length === 0) {
            MY_GAME_LIST.innerHTML = '<p style="text-align:center; padding:20px;">No records found.</p>';
            return;
        }

        games.forEach(game => {
            const div = document.createElement('div');
            div.className = 'game-item';
            div.innerHTML = `
                <div style="flex-grow:1;">
                    <h3>${game.gameTitle} <span style="font-size:0.8em; background:#ecf0f1; padding:2px 6px; border-radius:4px;">${game.status}</span></h3>
                    <p style="font-size:0.9em; color:#666;">⏳ ${game.hoursPlayed || 0}h | ⭐ ${game.userRating || '-'}/5 | 📝 ${game.notes || ''}</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="editGame('${game._id}', '${game.gameTitle.replace(/'/g, "\\'")}', '${game.status}', ${game.hoursPlayed}, ${game.userRating}, '${game.notes || ''}')" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Edit</button>
                    <button onclick="deleteGame('${game._id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Delete</button>
                </div>
            `;
            MY_GAME_LIST.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        MY_GAME_LIST.innerHTML = '<p>Error loading database.</p>';
    }
}

window.editGame = function(id, title, status, hours, rating, notes) {
    document.getElementById('editId').value = id;
    document.getElementById('gameTitle').value = title;
    document.getElementById('status').value = status;
    document.getElementById('hours').value = hours;
    document.getElementById('rating').value = rating;
    document.getElementById('notes').value = notes;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const payload = {
        gameTitle: document.getElementById('gameTitle').value,
        status: document.getElementById('status').value,
        hoursPlayed: document.getElementById('hours').value,
        userRating: document.getElementById('rating').value,
        notes: document.getElementById('notes').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${LOCAL_API_URL}/${id}` : LOCAL_API_URL;

    const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Saved!');
        GAME_FORM.reset();
        document.getElementById('editId').value = '';
        loadSavedGames();
    }
}
