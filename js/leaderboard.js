// Таблица лидеров для Активчиков
let currentSeason = 'season_spring2026';

const seasons = {
    season_winter2025: { name: '❄️ Зима 2025', emoji: '⛄' },
    season_spring2026: { name: '🌸 Весна 2026', emoji: '🌷' },
    season_summer2026: { name: '☀️ Лето 2026', emoji: '🏖️' },
    season_autumn2026: { name: '🍂 Осень 2026', emoji: '🍁' }
};

// Стили рамок - уникальные для каждой
function getFrameStyle(frameId) {
    switch(frameId) {
        case 'bronze_frame':
            return 'border: 3px solid #CD7F32; box-shadow: 0 0 10px rgba(205,127,50,0.5);';
        case 'silver_frame':
            return 'border: 3px solid #C0C0C0; box-shadow: 0 0 10px rgba(192,192,192,0.5);';
        case 'gold_frame':
            return 'border: 3px solid #FFD700; box-shadow: 0 0 15px rgba(255,215,0,0.5); animation: borderPulse 2s infinite;';
        case 'rainbow_frame':
            return 'border: 3px solid; animation: borderRainbow 3s linear infinite;';
        case 'legend_frame':
            return 'border: 3px solid #FF00FF; box-shadow: 0 0 15px #FF00FF; animation: borderGlow 1.5s infinite;';
        case 'diamond_frame':
            return 'border: 3px solid #00FFFF; box-shadow: 0 0 10px #00FFFF;';
        case 'emerald_frame':
            return 'border: 3px solid #00FF88; box-shadow: 0 0 10px #00FF88;';
        case 'fire_frame':
            return 'border: 3px solid #FF4500; box-shadow: 0 0 10px #FF4500; animation: borderPulse 1s infinite;';
        case 'ice_frame':
            return 'border: 3px solid #00BFFF; box-shadow: 0 0 10px #00BFFF; background: rgba(0,191,255,0.05);';
        default:
            return 'border: 2px solid rgba(255,255,255,0.2);';
    }
}

// Цвета фонов
const bgOptionsMap = {
    default: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
    cosmic: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    sunset: 'linear-gradient(135deg, #FF6B6B, #FFE66D)',
    magic: 'linear-gradient(135deg, #A855F7, #7C3AED)',
    forest: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
    ocean: 'linear-gradient(135deg, #0288D1, #01579B)',
    desert: 'linear-gradient(135deg, #F4A460, #D2691E)',
    mountains: 'linear-gradient(135deg, #556B2F, #8B4513)',
    city: 'linear-gradient(135deg, #2C3E50, #1A252F)',
    sakura: 'linear-gradient(135deg, #FFB7C5, #FF6B9D)',
    aurora: 'linear-gradient(135deg, #00B4DB, #0083B0)'
};

// Функция для получения анимации скина
function getSkinAnimation(avatar) {
    const animatedSkins = {
        '⭐': 'skin-animate-pulse',
        '⚡': 'skin-animate-float',
        '🔥': 'skin-animate-pulse',
        '🌈': 'skin-animate-float',
        '🦄': 'skin-animate-bounce',
        '🐉': 'skin-animate-spin',
        '👑': 'skin-animate-pulse',
        '🦉': 'skin-animate-float',
        '🐼': 'skin-animate-bounce'
    };
    return animatedSkins[avatar] || '';
}

function renderLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    const topThreeContainer = document.getElementById('topThreeContainer');
    
    if (!tbody) return;
    
    // Получаем пользователей из authManager
    const users = window.authManager?.users || [];
    
    // Фильтруем администраторов - они не должны отображаться в рейтинге
    const regularUsers = users.filter(u => !u.isAdmin);
    
    console.log('Все пользователи:', users.length);
    console.log('Обычные пользователи:', regularUsers.length);
    
    // Сортируем по очкам в текущем сезоне
    const sorted = [...regularUsers].sort((a, b) => {
        const pointsA = a.seasonPoints?.[currentSeason] || 0;
        const pointsB = b.seasonPoints?.[currentSeason] || 0;
        return pointsB - pointsA;
    });
    
    // Если нет пользователей, показываем сообщение
    if (sorted.length === 0) {
        if (topThreeContainer) topThreeContainer.innerHTML = '<div class="empty-leaderboard">✨ Пока нет участников. Зарегистрируйся первым!</div>';
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">✨ Нет участников в рейтинге</td></tr>';
        return;
    }
    
    // Топ 3 в правильном порядке: 2 место слева, 1 место в центре выше, 3 место справа
    const top3 = sorted.slice(0, 3);
    const first = top3[0];
    const second = top3[1];
    const third = top3[2];
    
    if (topThreeContainer && top3.length > 0) {
        // Функция для получения стиля фона
        const getBgStyle = (user) => {
            if (!user) return bgOptionsMap.default;
            const bg = user?.bgColor || 'default';
            return bgOptionsMap[bg] || bgOptionsMap.default;
        };
        
        topThreeContainer.innerHTML = `
            <div class="top-card rank-2">
                <div class="rank-medal">🥈</div>
                <div class="top-avatar ${getSkinAnimation(second?.avatar)}" style="background: ${getBgStyle(second)}; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 50px; ${getFrameStyle(second?.frame)}">${second?.avatar || '🎮'}</div>
                <div class="top-name">${second?.username || '-'}</div>
                <div class="top-points">⭐ ${second?.seasonPoints?.[currentSeason] || 0}</div>
                <div class="top-events">🎯 ${second?.seasonEvents?.[currentSeason] || 0}</div>
                <div class="top-title">${second?.title || 'Новичок'}</div>
            </div>
            <div class="top-card rank-1">
                <div class="rank-medal">🥇</div>
                <div class="top-avatar ${getSkinAnimation(first?.avatar)}" style="background: ${getBgStyle(first)}; border-radius: 50%; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 55px; ${getFrameStyle(first?.frame)}">${first?.avatar || '🎮'}</div>
                <div class="top-name">${first?.username || '-'}</div>
                <div class="top-points">⭐ ${first?.seasonPoints?.[currentSeason] || 0}</div>
                <div class="top-events">🎯 ${first?.seasonEvents?.[currentSeason] || 0}</div>
                <div class="top-title">${first?.title || 'Новичок'}</div>
            </div>
            <div class="top-card rank-3">
                <div class="rank-medal">🥉</div>
                <div class="top-avatar ${getSkinAnimation(third?.avatar)}" style="background: ${getBgStyle(third)}; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 50px; ${getFrameStyle(third?.frame)}">${third?.avatar || '🎮'}</div>
                <div class="top-name">${third?.username || '-'}</div>
                <div class="top-points">⭐ ${third?.seasonPoints?.[currentSeason] || 0}</div>
                <div class="top-events">🎯 ${third?.seasonEvents?.[currentSeason] || 0}</div>
                <div class="top-title">${third?.title || 'Новичок'}</div>
            </div>
        `;
    } else if (topThreeContainer && top3.length === 0) {
        topThreeContainer.innerHTML = '<div class="empty-leaderboard">🏆 Пока нет участников в топе</div>';
    }
    
    // Все остальные пользователи в таблице
    const others = sorted.slice(3);
    if (others.length === 0 && sorted.length <= 3) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">✨ Остальные участники появятся здесь</td></tr>';
    } else {
        tbody.innerHTML = others.map((user, idx) => {
            const rank = idx + 4;
            return `
                <tr>
                    <td class="rank-cell">${rank}</td>
                    <td class="user-cell"><span class="user-avatar">${user.avatar || '🎮'}</span> <span class="user-name">${user.username}</span></td>
                    <td class="level-cell">${user.level}</td>
                    <td class="points-cell"><strong>⭐ ${user.seasonPoints?.[currentSeason] || 0}</strong></td>
                    <td class="events-cell">🎯 ${user.seasonEvents?.[currentSeason] || 0}</td>
                </tr>
            `;
        }).join('');
    }
    
    updateSeasonTimer();
}

function updateSeasonTimer() {
    const timerEl = document.getElementById('seasonTimer');
    if (!timerEl) return;
    
    const seasonEndDates = {
        season_winter2025: new Date(2025, 2, 1),
        season_spring2026: new Date(2026, 5, 1),
        season_summer2026: new Date(2026, 8, 1),
        season_autumn2026: new Date(2026, 11, 1)
    };
    
    const endDate = seasonEndDates[currentSeason];
    const today = new Date();
    const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
        timerEl.innerHTML = `⏰ До конца сезона: ${diffDays} дней`;
    } else {
        timerEl.innerHTML = `✨ Новый сезон скоро!`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const seasonBtns = document.querySelectorAll('.season-btn');
    seasonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            seasonBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSeason = btn.dataset.season;
            renderLeaderboard();
        });
    });
    
    // Обновляем рейтинг при загрузке и при изменении данных
    renderLeaderboard();
    
    // Подписываемся на обновление пользователей
    const originalUpdateUser = window.authManager?.updateUser;
    if (window.authManager) {
        window.authManager.updateUser = function(user) {
            originalUpdateUser.call(window.authManager, user);
            renderLeaderboard();
        };
        
        window.authManager.saveUsers = function() {
            window.authManager.saveUsersToFile(window.authManager.users);
            window.authManager.updateStatsDisplay();
            renderLeaderboard();
        };
    }
});
