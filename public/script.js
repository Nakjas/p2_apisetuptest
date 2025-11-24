const API_KEY = '789e64b220614de7a6f1750426f2a67f'; 
const GAMES_API_URL = 'https://api.rawg.io/api/games';
const GENRES_API_URL = 'https://api.rawg.io/api/genres'; 

const LOCAL_API_URL = '/api/games';

const LIST_CONTAINER = document.getElementById('list-container');
const DETAIL_CONTAINER = document.getElementById('detail-container');
const GENRE_SELECT = document.getElementById('genre-select');
const YEAR_SELECT = document.getElementById('year-select');
const SEARCH_INPUT = document.getElementById('search-input');
const SEARCH_BUTTON = document.getElementById('search-button');
const LIVE_RESULTS_CONTAINER = document.getElementById('live-results');
const LOADING_MORE = document.getElementById('loading-more');

const GAME_FORM = document.getElementById('gameForm');
const MY_GAME_LIST = document.getElementById('gameList');

let nextPageUrl = null;
let currentFilters = {};
let debounceTimer;


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
        console.error("Error populating genres:", error);
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
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}. Check API Key.`);
        
        const data = await response.json();
        nextPageUrl = data.next;
        
        if (!append) LIST_CONTAINER.innerHTML = ''; 
        displayGameList(data.results);
        LOADING_MORE.style.display = 'none';
    } catch (error) {
        console.error("List Fetch Error:", error);
        LIST_CONTAINER.innerHTML = `<p class="error">Failed to load games: ${error.message}.</p>`;
        LOADING_MORE.style.display = 'none';
    }
}

function displayGameList(games) {
    games.forEach(game => {
        const formattedDate = new Date(game.released).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const platformNames = game.platforms 
            ? game.platforms.map(p => p.platform.name).slice(0, 3).join(', ') 
            : 'N/A';
        
        const gameCardHTML = `
            <div class="game-card" onclick="fetchAndDisplayGameDetails(${game.id})">
                <img src="${game.background_image || 'placeholder.png'}" alt="${game.name}">
                <div class="game-info">
                    <h2>${game.name}</h2>
                    <p>Released: <span>${formattedDate}</span></p>
                    <p>Rating: <span class="rating">${game.rating} / 5.0</span></p>
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
    currentFilters = filters;

    const params = new URLSearchParams({
        key: API_KEY,
        ...(filters.ordering && { ordering: filters.ordering }),
        ...(filters.page_size && { page_size: filters.page_size }),
        ...(filters.genres && filters.genres !== "" && { genres: filters.genres }),
        ...(filters.dates && filters.dates !== "" && { dates: filters.dates }),
    });
    
    const initialUrl = `${GAMES_API_URL}?${params.toString()}`;
    fetchList(initialUrl, false);
}

async function fetchAndDisplayGameDetails(gameId) {
    LIST_CONTAINER.style.display = 'none';
    DETAIL_CONTAINER.style.display = 'block';
    DETAIL_CONTAINER.innerHTML = '<p>Loading game details...</p>';
    
    const requestUrl = `${GAMES_API_URL}/${gameId}?key=${API_KEY}`;

    try {
        const response = await fetch(requestUrl);
        if (!response.ok) throw new Error(`Failed to fetch details for ID: ${gameId}`);
        const game = await response.json();
        displayGameDetail(game);
    } catch (error) {
        console.error("Detail Fetch Error:", error);
        DETAIL_CONTAINER.innerHTML = `<p class="error">Could not load game details: ${error.message}.</p>`;
    }
}


function displayGameDetail(game) {
    const formattedDate = new Date(game.released).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const genreNames = game.genres ? game.genres.map(g => g.name).join(', ') : 'N/A';
    const developerNames = game.developers ? game.developers.map(d => d.name).join(', ') : 'N/A';
    const matescore = game.metacritic ? `<span class="metascore">${game.metacritic}</span>` : 'N/A';

    const safeGameName = game.name.replace(/'/g, "\\'");

    DETAIL_CONTAINER.innerHTML = `
        <div class="detail-card">
            <div class="detail-image">
                <img src="${game.background_image || 'placeholder.png'}" alt="${game.name} cover">
            </div>
            <div class="detail-content">
                <h1>${game.name}</h1>
                
                <button onclick="fillForm('${safeGameName}')" style="background-color: #28a745; color: white; padding: 10px 20px; border: none; cursor: pointer; margin-bottom: 20px; border-radius: 5px;">
                    + Add to My Tracker
                </button>

                <p class="developers">Developed by: ${developerNames}</p>
                <p><strong>Released:</strong> <span>${formattedDate}</span></p>
                <p><strong>Genres:</strong> <span>${genreNames}</span></p>
                <p><strong>Metascore:</strong> ${matescore}</p>
                <div class="description">
                    <h3>Game Description</h3>
                    <p>${game.description_raw ? game.description_raw.substring(0, 800) + '...' : 'No description available.'}</p>
                </div>
                <button onclick="backToList()" style="margin-top:20px;">Back to Search</button>
            </div>
        </div>
    `;
}

function backToList() {
    DETAIL_CONTAINER.style.display = 'none';
    LIST_CONTAINER.style.display = 'grid';
}

function handleLiveSearchInput() {
    clearTimeout(debounceTimer);
    const searchTerm = SEARCH_INPUT.value.trim();
    if (searchTerm.length < 3) {
        LIVE_RESULTS_CONTAINER.style.display = 'none';
        LIVE_RESULTS_CONTAINER.innerHTML = '';
        return;
    }
    debounceTimer = setTimeout(() => {
        fetchLiveResults(searchTerm);
    }, 300);
}

async function fetchLiveResults(searchTerm) {
    const params = new URLSearchParams({
        key: API_KEY,
        search: searchTerm,
        page_size: 7,      
    });
    try {
        const response = await fetch(`${GAMES_API_URL}?${params.toString()}`);
        if (!response.ok) throw new Error("API failed to return live results.");
        const data = await response.json();
        LIVE_RESULTS_CONTAINER.innerHTML = '';
        if (data.results.length === 0) {
             LIVE_RESULTS_CONTAINER.style.display = 'none';
             return;
        }
        data.results.forEach(game => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('result-item');
            resultItem.innerHTML = `<img src="${game.background_image || 'placeholder.png'}"><span class="result-name">${game.name}</span>`;
            resultItem.addEventListener('click', () => {
                SEARCH_INPUT.value = game.name;
                LIVE_RESULTS_CONTAINER.style.display = 'none';
                fetchAndDisplayGameDetails(game.id); 
            });
            LIVE_RESULTS_CONTAINER.appendChild(resultItem);
        });
        LIVE_RESULTS_CONTAINER.style.display = 'block';
    } catch (error) {
        console.error("Live Search Error:", error);
    }
}

function handleMainSearchClick() {
    const searchTerm = SEARCH_INPUT.value.trim();
    LIVE_RESULTS_CONTAINER.style.display = 'none';
    if (searchTerm.length < 3) {
        alert("Please enter a game title to search.");
        return;
    }
    fetchListForDetail(searchTerm); 
}

async function fetchListForDetail(searchTerm) {
    LIST_CONTAINER.style.display = 'none';
    DETAIL_CONTAINER.innerHTML = '<p>Searching for best match...</p>';
    DETAIL_CONTAINER.style.display = 'block';
    const params = new URLSearchParams({
        key: API_KEY,
        search: searchTerm,
        page_size: 1, 
    });
    try {
        const response = await fetch(`${GAMES_API_URL}?${params.toString()}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            fetchAndDisplayGameDetails(data.results[0].id);
        } else {
            DETAIL_CONTAINER.innerHTML = `<p class="error">No exact match found for "${searchTerm}". Try browsing instead.</p>`;
        }
    } catch (error) {
        DETAIL_CONTAINER.innerHTML = `<p class="error">Search failed.</p>`;
    }
}

function handleScroll() {
    if (LIST_CONTAINER.style.display === 'grid' && nextPageUrl) { 
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            if (LOADING_MORE.style.display === 'block') return; 
            fetchList(nextPageUrl, true);
        }
    }
}

function fillForm(gameName) {
    const titleInput = document.getElementById('gameTitle');
    if (titleInput) {
        titleInput.value = gameName;
        document.getElementById('gameForm').scrollIntoView({ behavior: 'smooth' });
        alert(`" ${gameName} " added to form below. Please fill in details and Save!`);
    } else {
        console.error("Form input 'gameTitle' not found!");
    }
}

async function loadSavedGames() {
    if (!MY_GAME_LIST) return;

    try {
        const response = await fetch(LOCAL_API_URL);
        const games = await response.json();
        
        MY_GAME_LIST.innerHTML = '';

        if (games.length === 0) {
            MY_GAME_LIST.innerHTML = '<p>No records in database yet.</p>';
            return;
        }

        games.forEach(game => {
            const div = document.createElement('div');
            div.className = 'game-item';
            div.style.border = "1px solid #ccc";
            div.style.padding = "10px";
            div.style.margin = "10px 0";
            
            div.innerHTML = `
                <h3>${game.gameTitle} <span style="font-size:0.8em; background:#eee; padding:2px 5px;">${game.status}</span></h3>
                <p>⏳ ${game.hoursPlayed || 0} hours | ⭐ ${game.userRating || '-'}/5</p>
                <p>📝 ${game.notes || ''}</p>
                <button onclick="deleteGame('${game._id}')" style="background:red;color:white;border:none;padding:5px 10px;cursor:pointer;">Delete</button>
            `;
            MY_GAME_LIST.appendChild(div);
        });
    } catch (error) {
        console.error("Error loading saved games:", error);
    }
}

if (GAME_FORM) {
    GAME_FORM.addEventListener('submit', async (e) => {
        e.preventDefault();

        const gameData = {
            gameTitle: document.getElementById('gameTitle').value,
            status: document.getElementById('status').value,
            hoursPlayed: document.getElementById('hours').value,
            userRating: document.getElementById('rating').value,
            notes: document.getElementById('notes').value
        };

        try {
            const response = await fetch(LOCAL_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData)
            });

            if (response.ok) {
                alert('Saved to Database! ✅');
                GAME_FORM.reset();
                loadSavedGames();
            } else {
                alert('Error saving game ❌');
            }
        } catch (error) {
            console.error("Save error:", error);
        }
    });
}

async function deleteGame(id) {
    if(!confirm('Delete this record?')) return;
    try {
        await fetch(`${LOCAL_API_URL}/${id}`, { method: 'DELETE' });
        loadSavedGames();
    } catch (error) {
        console.error("Delete error:", error);
    }
}


async function init() {
    await populateGenres(); 
    populateYears();
    
    loadSavedGames();
    
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

    const initialUrl = `${GAMES_API_URL}?key=${API_KEY}&ordering=-rating&page_size=15`;
    fetchList(initialUrl, false);
}

init();