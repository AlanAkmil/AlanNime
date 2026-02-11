// Konfigurasi API
const API_BASE_URL = 'https://www.sankavollerei.com';
const OTAKU_ENDPOINT = '/anime/otaku';

class AlanNimeAPI {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.rateLimit = {
            requests: 0,
            lastReset: Date.now(),
            maxRequests: 70,
            resetTime: 60000 // 1 menit
        };
    }

    async fetchData(endpoint) {
        // Cek rate limit
        const now = Date.now();
        if (now - this.rateLimit.lastReset > this.rateLimit.resetTime) {
            this.rateLimit.requests = 0;
            this.rateLimit.lastReset = now;
        }

        if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
            throw new Error('Rate limit exceeded. Please wait 1 minute.');
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            this.rateLimit.requests++;
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return data.data;
            } else {
                throw new Error(data.message || 'API request failed');
            }
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Home endpoints
    async getHome() {
        return this.fetchData(`${OTAKU_ENDPOINT}/home`);
    }

    async getOngoing(page = 1) {
        return this.fetchData(`${OTAKU_ENDPOINT}/ongoing?page=${page}`);
    }

    async getCompleted(page = 1) {
        return this.fetchData(`${OTAKU_ENDPOINT}/complete?page=${page}`);
    }

    async getSchedule(day = '') {
        const dayParam = day ? `?scheduled_day=${day.toLowerCase()}` : '';
        return this.fetchData(`${OTAKU_ENDPOINT}/schedule${dayParam}`);
    }

    // Search
    async searchAnime(query) {
        return this.fetchData(`${OTAKU_ENDPOINT}/search/${encodeURIComponent(query)}`);
    }

    // Detail
    async getAnimeDetail(id) {
        return this.fetchData(`${OTAKU_ENDPOINT}/anime/${id}`);
    }

    async getEpisodeDetail(episodeId) {
        return this.fetchData(`${OTAKU_ENDPOINT}/episode/${episodeId}`);
    }

    // Genre
    async getGenres() {
        return this.fetchData(`${OTAKU_ENDPOINT}/genre`);
    }

    async getAnimeByGenre(genre, page = 1) {
        return this.fetchData(`${OTAKU_ENDPOINT}/genre/${genre}?page=${page}`);
    }
}

class UI {
    constructor() {
        this.api = new AlanNimeAPI();
        this.currentPage = 1;
        this.animeData = {};
    }

    // Render anime grid
    renderAnimeGrid(containerId, animeList, showEpisode = true) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!animeList || animeList.length === 0) {
            container.innerHTML = '<div class="loading">Tidak ada anime ditemukan.</div>';
            return;
        }

        container.innerHTML = animeList.map(anime => `
            <div class="anime-card" onclick="ui.showAnimeDetail('${anime.animeId}')">
                <img src="${anime.poster}" alt="${anime.title}" class="anime-poster" loading="lazy">
                <div class="anime-info">
                    <h3 class="anime-title" title="${anime.title}">${anime.title}</h3>
                    <div class="anime-meta">
                        ${showEpisode ? `<span class="anime-episode">${anime.episodes || anime.latestReleaseDate || ''}</span>` : ''}
                        ${anime.score ? `<span>⭐ ${anime.score}</span>` : ''}
                        ${anime.releaseDay ? `<span>📅 ${anime.releaseDay}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Render schedule
    renderSchedulePreview(containerId, scheduleData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!scheduleData || !Array.isArray(scheduleData)) {
            container.innerHTML = '<div class="loading">Tidak ada jadwal tersedia.</div>';
            return;
        }

        // Ambil hanya 3 hari pertama untuk preview
        const previewDays = scheduleData.slice(0, 3);
        
        container.innerHTML = previewDays.map(day => `
            <div class="day-schedule">
                <h3 class="day-title">${day.day}</h3>
                <div class="day-anime-list">
                    ${day.anime_list.slice(0, 3).map(anime => `
                        <div class="schedule-item" onclick="ui.showAnimeDetail('${anime.slug}')">
                            <img src="${anime.poster}" alt="${anime.title}" class="schedule-poster">
                            <div class="schedule-info">
                                <h4 title="${anime.title}">${anime.title}</h4>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Load homepage data
    async loadHomeData() {
        try {
            const homeData = await this.api.getHome();
            
            if (homeData.ongoing?.animeList) {
                this.renderAnimeGrid('ongoingContainer', homeData.ongoing.animeList.slice(0, 8), true);
            }
            
            if (homeData.completed?.animeList) {
                this.renderAnimeGrid('completedContainer', homeData.completed.animeList.slice(0, 8), false);
            }
        } catch (error) {
            console.error('Error loading home data:', error);
            this.showError('Gagal memuat data homepage. Silakan refresh halaman.');
        }
    }

    // Load schedule preview
    async loadSchedulePreview() {
        try {
            const scheduleData = await this.api.getSchedule();
            this.renderSchedulePreview('schedulePreview', scheduleData);
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    }

    // Show anime detail modal/page
    async showAnimeDetail(animeId) {
        try {
            // Redirect ke halaman detail (bisa dibuat terpisah)
            window.location.href = `details.html?id=${animeId}`;
        } catch (error) {
            console.error('Error loading anime detail:', error);
            this.showError('Gagal memuat detail anime.');
        }
    }

    // Setup search functionality
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchInput && searchBtn) {
            const performSearch = () => {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                }
            };

            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
    }

    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="background-color: #ff4757; color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Error:</strong> ${message}
            </div>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.prepend(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }

    // Initialize
    init() {
        if (document.getElementById('ongoingContainer')) {
            this.loadHomeData();
        }
        
        if (document.getElementById('schedulePreview')) {
            this.loadSchedulePreview();
        }
        
        this.setupSearch();
        
        // Handle back to top
        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            if (scrollTop > 300) {
                document.body.classList.add('scrolled');
            } else {
                document.body.classList.remove('scrolled');
            }
        });
    }
}

// Initialize UI
const ui = new UI();

// Wait for DOM to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ui.init());
} else {
    ui.init();
}

// Global function for pagination
function loadMore(pageType) {
    ui.currentPage++;
    if (pageType === 'ongoing') {
        ui.loadOngoingPage(ui.currentPage);
    } else if (pageType === 'completed') {
        ui.loadCompletedPage(ui.currentPage);
    }
}

// Export for use in other pages
window.AlanNimeAPI = AlanNimeAPI;
window.ui = ui;