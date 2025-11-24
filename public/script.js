const API_KEY = '789e64b220614de7a6f1750426f2a67f'; 
const GAMES_API_URL = 'https://api.rawg.io/api/games';
const GENRES_API_URL = 'https://api.rawg.io/api/genres'; 
const LOCAL_API_URL = '/api/games'; 

const GAME_FORM = document.getElementById('gameForm');
const MY_GAME_LIST = document.getElementById('gameList');

const LIST_CONTAINER = document.getElementById('list-container');
const DETAIL_CONTAINER = document.getElementById('detail-container');
const GENRE_SELECT = document.getElementById('genre-select');
const YEAR_SELECT = document.getElementById('year-select');
const SEARCH_INPUT = document.getElementById('search-input');
const SEARCH_BUTTON = document.getElementById('search-button');
const LIVE_RESULTS_CONTAINER = document.getElementById('live-results');
const LOADING_MORE = document.getElementById('loading-more');

let nextPageUrl = null;
let debounceTimer;


async function quickAddGame(gameName) {
    if(!confirm(`Add "${gameName}" to your backlog?`)) return;

    const gameData = {
        gameTitle: gameName,
        status: 'Backlog',
        hoursPlayed: 0,
        userRating: 0,
        notes: 'Added from search result'
    };

    try {
        const response = await fetch(LOCAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameData)
        });

        if (response.ok) {
            if(confirm('✅ Saved! Go to profile to edit details?')) {
                window.location.href = 'user.html';
            }
        } else {
            alert('Error saving game.');
        }
    } catch (error) {
        console.error("Save error:", error);
    }
}

async function loadSavedGames() {
    if (!MY_GAME_LIST) return;

    try {
        const response = await fetch(LOCAL_API_URL);
        const games = await response.json();
        
        MY_GAME_LIST.innerHTML = ''; 

        if (games.length === 0) {
            MY_GAME_LIST.innerHTML = '<p style="text-align:center; color:#666;">No games saved yet.</p>';
            return;
        }

        games.forEach(game => {
            const div = document.createElement('div');
            div.className = 'game-item';
            div.innerHTML = `
                <div>
                    <h3>${game.gameTitle} <span class="tag ${game.status}">${game.status}</span></h3>
                    <p class="meta-info">⏳ ${game.hoursPlayed || 0}h | ⭐ ${game.userRating || '-'}/5 | 📝 ${game.notes || ''}</p>
                </div>
                <div class="actions">
                    <button class="btn-edit" onclick="populateForm('${game._id}', '${game.gameTitle.replace(/'/g, "\\'")}', '${game.status}', ${game.hoursPlayed}, ${game.userRating}, '${game.notes || ''}')">Edit</button>
                    <button class="btn-delete" onclick="deleteGame('${game._id}')">Delete</button>
                </div>
            `;
            MY_GAME_LIST.appendChild(div);
        });
    } catch (error) {
        console.error("Error loading saved games:", error);
    }
}

window.populateForm = function(id, title, status, hours, rating, notes) {
    document.getElementById('editId').value = id;
    document.getElementById('gameTitle').value = title;
    document.getElementById('status').value = status;
    document.getElementById('hours').value = hours;
    document.getElementById('rating').value = rating;
    document.getElementById('notes').value = notes;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.resetForm = function() {
    GAME_FORM.reset();
    document.getElementById('editId').value = '';
}

window.deleteGame = async function(id) {
    if(!confirm('Delete this record?')) return;
    await fetch(`${LOCAL_API_URL}/${id}`, { method: 'DELETE' });
    loadSavedGames();
}

if (GAME_FORM) {
    GAME_FORM.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('editId').value;
        const gameData = {
            gameTitle: document.getElementById('gameTitle').value,
            status: document.getElementById('status').value,
            hoursPlayed: document.getElementById('hours').value,
            userRating: document.getElementById('rating').value,
            notes: document.getElementById('notes').value
        };

        let method = 'POST';
        let url = LOCAL_API_URL;

        if (id) {
            method = 'PUT';
            url = `${LOCAL_API_URL}/${id}`;
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameData)
        });

        if (response.ok) {
            resetForm();
            loadSavedGames();
            alert(id ? 'Record Updated!' : 'Record Added!');
        }
    });
}


if (LIST_CONTAINER) {
    initProject1();
}

async function initProject1() {
    await populateGenres(); 
    populateYears();
    
    GENRE_SELECT.addEventListener('change', handleFilterChange);
    YEAR_SELECT.addEventListener('change', handleFilterChange);
    SEARCH_BUTTON.addEventListener('click', handleMainSearchClick);
    SEARCH_INPUT.addEventListener('input', handleLiveSearchInput);
    window.addEventListener('scroll', handleScroll);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            LIVE_RESULTS_CONTAINER.style.display = 'none';
        }
    });

    fetchList(`${GAMES_API_URL}?key=${API_KEY}&ordering=-rating&page_size=15`, false);
}

async function populateGenres() {
    const params = new URLSearchParams({ key: API_KEY, page_size: 40 });
    try {
        const response = await fetch(`${GENRES_API_URL}?${params.toString()}`);
        const data = await response.json();
        data.results.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.slug; 
            option.textContent = genre.name;
            GENRE_SELECT.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
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
    DETAIL_CONTAINER.style.display = 'none';
    LIST_CONTAINER.style.display = 'grid';
    
    if (!append) LIST_CONTAINER.innerHTML = '<p>Loading games...</p>';
    if (append) LOADING_MORE.style.display = 'block'; 

    try {
        const response = await fetch(url);
        const data = await response.json();
        nextPageUrl = data.next;
        
        if (!append) LIST_CONTAINER.innerHTML = ''; 
        displayGameList(data.results);
        LOADING_MORE.style.display = 'none';
    } catch (error) {
        LIST_CONTAINER.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

function displayGameList(games) {
    games.forEach(game => {
        const formattedDate = new Date(game.released).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const gameCardHTML = `
            <div class="game-card" onclick="fetchAndDisplayGameDetails(${game.id})">
                <img src="${game.background_image || 'placeholder.png'}" alt="${game.name}">
                <div class="game-info">
                    <h2>${game.name}</h2>
                    <p>Released: <span>${formattedDate}</span></p>
                    <p>Rating: <span class="rating">${game.rating}</span></p>
                </div>
            </div>
        `;
        LIST_CONTAINER.insertAdjacentHTML('beforeend', gameCardHTML);
    });
}

function handleFilterChange() {
    const filters = {
        genres: GENRE_SELECT.value,
        dates: YEAR_SELECT.value,
        ordering: '-rating',
        page_size: 15,
    };
    const params = new URLSearchParams({
        key: API_KEY,
        ...(filters.ordering && { ordering: filters.ordering }),
        ...(filters.page_size && { page_size: filters.page_size }),
        ...(filters.genres && filters.genres !== "" && { genres: filters.genres }),
        ...(filters.dates && filters.dates !== "" && { dates: filters.dates }),
    });
    fetchList(`${GAMES_API_URL}?${params.toString()}`, false);
}

async function fetchAndDisplayGameDetails(gameId) {
    LIST_CONTAINER.style.display = 'none';
    DETAIL_CONTAINER.style.display = 'block';
    DETAIL_CONTAINER.innerHTML = '<p>Loading...</p>';
    
    try {
        const response = await fetch(`${GAMES_API_URL}/${gameId}?key=${API_KEY}`);
        const game = await response.json();
        displayGameDetail(game);
    } catch (error) {
        DETAIL_CONTAINER.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

// ✅ UPDATED Detail View with Quick Add Button
function displayGameDetail(game) {
    const formattedDate = new Date(game.released).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const safeGameName = game.name.replace(/'/g, "\\'");

    DETAIL_CONTAINER.innerHTML = `
        <div class="detail-card">
            <div class="detail-image">
                <img src="${game.background_image || 'placeholder.png'}" alt="${game.name}">
            </div>
            <div class="detail-content">
                <h1>${game.name}</h1>
                <button onclick="quickAddGame('${safeGameName}')" style="background:#28a745;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;margin-bottom:15px;">
                    + Add to My Collection
                </button>
                <p><strong>Released:</strong> <span>${formattedDate}</span></p>
                <div class="description"><p>${game.description_raw ? game.description_raw.substring(0, 500) : ''}...</p></div>
                <button onclick="backToList()" style="margin-top:20px;">Back</button>
            </div>
        </div>
    `;
}

function backToList() { DETAIL_CONTAINER.style.display = 'none'; LIST_CONTAINER.style.display = 'grid'; }
function handleLiveSearchInput() {
    clearTimeout(debounceTimer);
    const searchTerm = SEARCH_INPUT.value.trim();
    if (searchTerm.length < 3) { LIVE_RESULTS_CONTAINER.style.display = 'none'; return; }
    debounceTimer = setTimeout(() => fetchLiveResults(searchTerm), 300);
}
async function fetchLiveResults(searchTerm) {
    const params = new URLSearchParams({ key: API_KEY, search: searchTerm, page_size: 5 });
    try {
        const response = await fetch(`${GAMES_API_URL}?${params.toString()}`);
        const data = await response.json();
        LIVE_RESULTS_CONTAINER.innerHTML = '';
        if(data.results.length === 0) { LIVE_RESULTS_CONTAINER.style.display = 'none'; return; }
        
        data.results.forEach(game => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<img src="${game.background_image}"><span class="result-name">${game.name}</span>`;
            div.onclick = () => { fetchAndDisplayGameDetails(game.id); LIVE_RESULTS_CONTAINER.style.display='none'; SEARCH_INPUT.value=game.name; };
            LIVE_RESULTS_CONTAINER.appendChild(div);
        });
        LIVE_RESULTS_CONTAINER.style.display = 'block';
    } catch(e) { console.error(e); }
}
function handleMainSearchClick() { fetchListForDetail(SEARCH_INPUT.value.trim()); }
async function fetchListForDetail(term) { /* Your existing search logic */ }
function handleScroll() {  }

if (MY_GAME_LIST) {
    loadSavedGames();
}