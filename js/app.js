// Главный файл приложения Активчики

document.addEventListener('DOMContentLoaded', () => {
    // Прелоадер
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('hide');
            setTimeout(() => preloader.remove(), 500);
        }
    }, 1000);
    
    // Переключение вкладок
    const navBtns = document.querySelectorAll('.nav-btn');
    const panes = document.querySelectorAll('.content-pane');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            panes.forEach(pane => pane.classList.remove('active'));
            const activePane = document.getElementById(`${tabId}Pane`);
            if (activePane) activePane.classList.add('active');
            
            // Обновляем контент
            if (tabId === 'leaderboard' && typeof renderLeaderboard === 'function') {
                renderLeaderboard();
            } else if (tabId === 'profile') {
                renderProfile();
            } else if (tabId === 'events' && typeof renderEvents === 'function') {
                renderEvents();
                if (typeof renderPendingRegistrations === 'function') renderPendingRegistrations();
            } else if (tabId === 'shop') {
                if (typeof renderShop === 'function') renderShop();
            } else if (tabId === 'admin') {
                if (typeof renderAdminRegistrations === 'function') renderAdminRegistrations();
                if (typeof renderAdminUsers === 'function') renderAdminUsers();
                if (typeof renderAdminEvents === 'function') renderAdminEvents();
            } else if (tabId === 'storage' && typeof updateStorageInfo === 'function') {
                updateStorageInfo();
            }
        });
    });
    
    // Клик по аватару пользователя для перехода в профиль
    const userProfileBtn = document.getElementById('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', () => {
            if (window.authManager?.currentUser) {
                document.querySelector('.nav-btn[data-tab="profile"]').click();
            } else {
                document.getElementById('authModal').classList.add('active');
            }
        });
    }
    
    // Модалка авторизации
    const authModal = document.getElementById('authModal');
    const mainActionBtn = document.getElementById('mainActionBtn');
    const goToEventsBtn = document.getElementById('goToEventsBtn');
    
    if (mainActionBtn) {
        mainActionBtn.addEventListener('click', () => {
            if (window.authManager?.currentUser) {
                document.querySelector('.nav-btn[data-tab="profile"]').click();
            } else {
                authModal.classList.add('active');
            }
        });
    }
    
    if (goToEventsBtn) {
        goToEventsBtn.addEventListener('click', () => {
            document.querySelector('.nav-btn[data-tab="events"]').click();
        });
    }
    
    // Закрытие модалок
    const closeBtns = document.querySelectorAll('.modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Авторизационные формы
    const authSwitchBtns = document.querySelectorAll('.auth-switch-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    authSwitchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            authSwitchBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.auth === 'login') {
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            } else {
                registerForm.classList.add('active');
                loginForm.classList.remove('active');
            }
        });
    });
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername')?.value;
            const password = document.getElementById('loginPassword')?.value;
            if (window.authManager && username && password) {
                if (window.authManager.login(username, password)) {
                    authModal.classList.remove('active');
                    loginForm.reset();
                    renderProfile();
                    if (typeof renderLeaderboard === 'function') renderLeaderboard();
                    if (typeof renderShop === 'function') renderShop();
                }
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername')?.value;
            const email = document.getElementById('regEmail')?.value;
            const password = document.getElementById('regPassword')?.value;
            const confirm = document.getElementById('regConfirmPassword')?.value;
            if (window.authManager && username && password) {
                if (window.authManager.register(username, email, password, confirm)) {
                    authModal.classList.remove('active');
                    registerForm.reset();
                    renderProfile();
                    if (typeof renderLeaderboard === 'function') renderLeaderboard();
                    if (typeof renderShop === 'function') renderShop();
                }
            }
        });
    }
    
    // Создание ивента (админ)
    const createEventBtn = document.getElementById('createEventBtn');
    const createEventModal = document.getElementById('createEventModal');
    
    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
            createEventModal.classList.add('active');
        });
    }
    
    const createEventForm = document.getElementById('createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const eventData = {
                name: document.getElementById('eventName')?.value,
                desc: document.getElementById('eventDesc')?.value,
                points: document.getElementById('eventPoints')?.value,
                coins: document.getElementById('eventCoins')?.value,
                season: document.getElementById('eventSeason')?.value,
                emoji: document.getElementById('eventEmoji')?.value
            };
            
            if (typeof createEvent === 'function' && eventData.name) {
                createEvent(eventData);
                createEventModal.classList.remove('active');
                createEventForm.reset();
            }
        });
    }
    
    // Плавающие эмодзи
    createFloatingEmojis();
    
    // Начальная отрисовка профиля
    setTimeout(() => {
        renderProfile();
    }, 100);
});

// ============ ФУНКЦИЯ ПРОФИЛЯ С АНИМАЦИЯМИ ============
function renderProfile() {
    const container = document.getElementById('profileContainer');
    if (!container) return;
    
    const currentUser = window.authManager?.currentUser;
    
    if (!currentUser) {
        container.innerHTML = `
            <div class="profile-card" style="text-align: center; padding: 40px;">
                <div style="font-size: 80px; margin-bottom: 20px;">🔐</div>
                <h3>Ты не авторизован</h3>
                <p style="margin: 15px 0; color: var(--text-dim);">Войди или зарегистрируйся, чтобы увидеть свой профиль</p>
                <button class="btn-primary" onclick="document.getElementById('authModal').classList.add('active')">Войти в профиль</button>
            </div>
        `;
        return;
    }
    
    // Расчёт процентов для уровня
    const currentLevelPoints = (currentUser.level - 1) * 100;
    const progressPercent = ((currentUser.points - currentLevelPoints) / 100) * 100;
    
    // Фоны
    const bgOptions = {
        default: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
        cosmic: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        sunset: 'linear-gradient(135deg, #FF6B6B, #FFE66D)',
        magic: 'linear-gradient(135deg, #A855F7, #7C3AED)',
        forest: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
        ocean: 'linear-gradient(135deg, #0288D1, #01579B)',
        sakura: 'linear-gradient(135deg, #FFB7C5, #FF6B9D)',
        aurora: 'linear-gradient(135deg, #00B4DB, #0083B0)'
    };
    
    // Рамки
    const frameOptions = {
        default: '',
        bronze_frame: 'frame-bronze',
        silver_frame: 'frame-silver',
        gold_frame: 'frame-gold',
        rainbow_frame: 'frame-rainbow',
        legend_frame: 'frame-legend',
        diamond_frame: 'frame-diamond',
        emerald_frame: 'frame-emerald',
        fire_frame: 'frame-fire',
        ice_frame: 'frame-ice'
    };
    
    const currentBg = bgOptions[currentUser.bgColor] || bgOptions.default;
    const currentFrameClass = frameOptions[currentUser.frame] || '';
    
    // Анимация для аватара
    const getAvatarAnimation = (avatar) => {
        const animated = {
            '⭐': 'skin-animate-pulse',
            '⚡': 'skin-animate-float',
            '🔥': 'skin-animate-pulse',
            '🌈': 'skin-animate-float',
            '🦄': 'skin-animate-bounce',
            '🐉': 'skin-animate-spin',
            '👑': 'skin-animate-pulse'
        };
        return animated[avatar] || '';
    };
    
    // Все доступные элементы (только разблокированные)
    const allSkins = [
        { icon: '🎮', name: 'Геймер' },
        { icon: '⭐', name: 'Звёздочка', animation: 'skin-animate-pulse' },
        { icon: '⚡', name: 'Молния', animation: 'skin-animate-float' },
        { icon: '🔥', name: 'Огонь', animation: 'skin-animate-pulse' },
        { icon: '🌈', name: 'Радуга', animation: 'skin-animate-float' },
        { icon: '🦄', name: 'Единорог', animation: 'skin-animate-bounce' },
        { icon: '🐉', name: 'Дракон', animation: 'skin-animate-spin' },
        { icon: '👑', name: 'Корона', animation: 'skin-animate-pulse' }
    ];
    
    const allTitles = [
        'Новичок', 'Исследователь', 'Активист', 'Мастер', 
        'Творец', 'Чемпион', 'Волшебник', 'Лидер', 'Легенда'
    ];
    
    const allBgs = [
        { id: 'default', name: 'Стандартный' },
        { id: 'cosmic', name: 'Космос' },
        { id: 'sunset', name: 'Закат' },
        { id: 'magic', name: 'Магия' },
        { id: 'forest', name: 'Лес' },
        { id: 'ocean', name: 'Океан' },
        { id: 'sakura', name: 'Сакура' },
        { id: 'aurora', name: 'Северное сияние' }
    ];
    
    const allFrames = [
        { id: 'default', name: 'Обычная' },
        { id: 'bronze_frame', name: 'Бронзовая' },
        { id: 'silver_frame', name: 'Серебряная' },
        { id: 'gold_frame', name: 'Золотая' },
        { id: 'rainbow_frame', name: 'Радужная' },
        { id: 'legend_frame', name: 'Легендарная' },
        { id: 'diamond_frame', name: 'Алмазная' },
        { id: 'fire_frame', name: 'Огненная' },
        { id: 'ice_frame', name: 'Ледяная' }
    ];
    
    // Достижения
    const achievements = [
        { id: 'first_step', name: 'Первый шаг', desc: 'Принять участие в мероприятии', icon: '🎯', achieved: currentUser.participatedEvents?.length > 0 },
        { id: 'activist', name: 'Активист', desc: 'Участвовать в 5 мероприятиях', icon: '🌟', achieved: (currentUser.seasonEvents?.season_spring2026 || 0) >= 5 },
        { id: 'points_500', name: 'Звёздный час', desc: 'Накопить 500 очков', icon: '⭐', achieved: currentUser.points >= 500 },
        { id: 'master', name: 'Мастер', desc: 'Достичь 10 уровня', icon: '🏆', achieved: currentUser.level >= 10 },
        { id: 'rich', name: 'Богач', desc: 'Накопить 5000 монет', icon: '💰', achieved: currentUser.coins >= 5000 }
    ];
    
    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-bg" style="background: ${currentBg};">
                <div class="profile-avatar-area">
                    <div class="profile-avatar ${currentFrameClass}">
                        <div class="${getAvatarAnimation(currentUser.avatar)}" style="font-size: 55px;">${currentUser.avatar || '🎮'}</div>
                    </div>
                    <button class="change-avatar-btn" onclick="openSkinShop()" title="Сменить образ">✨</button>
                </div>
            </div>
            <div class="profile-info">
                <h2>${currentUser.username}</h2>
                <div class="profile-title">${currentUser.title || 'Новичок'}</div>
                
                <div class="profile-stats-row">
                    <div class="profile-stat">
                        <div class="profile-stat-value">${currentUser.points}</div>
                        <div class="profile-stat-label">⭐ Очков</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-value">${currentUser.level}</div>
                        <div class="profile-stat-label">📊 Уровень</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-value">${currentUser.coins}</div>
                        <div class="profile-stat-label">🪙 Монет</div>
                    </div>
                </div>
                
                <div class="level-progress">
                    <div class="progress-labels">
                        <span>Уровень ${currentUser.level}</span>
                        <span>⭐ ${100 - Math.floor(progressPercent)}% до ${currentUser.level + 1} уровня</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-fill-custom" style="width: ${Math.min(100, Math.max(0, progressPercent))}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Выбор фона и рамки -->
        <div class="profile-card" style="margin-top: 20px;">
            <h3 style="padding: 20px 20px 0 20px;"><i class="fas fa-palette"></i> Оформление профиля</h3>
            <div style="padding: 20px;">
                <div style="font-weight: bold; margin-bottom: 10px;">🎨 Выбери фон:</div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                    ${allBgs.map(bg => `
                        <div class="style-option ${currentUser.bgColor === bg.id ? 'active' : ''}" 
                             style="background: ${bgOptions[bg.id]}; padding: 8px 15px; border-radius: 25px; cursor: pointer; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);"
                             onclick="changeBackground('${bg.id}')">
                            ${bg.name}
                        </div>
                    `).join('')}
                </div>
                
                <div style="font-weight: bold; margin-bottom: 10px;">🖼️ Выбери рамку:</div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${allFrames.map(frame => {
                        const isUnlocked = currentUser.unlockedFrames?.includes(frame.id) || frame.id === 'default';
                        return `
                            <div class="style-option ${currentUser.frame === frame.id ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}" 
                                 style="padding: 8px 15px; border-radius: 25px; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'}; background: rgba(0,0,0,0.3); opacity: ${isUnlocked ? 1 : 0.5};"
                                 onclick="${isUnlocked ? `changeFrame('${frame.id}')` : ''}">
                                ${frame.name} ${!isUnlocked ? '🔒' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
        
        <!-- Мои образы (скины) -->
        <div class="profile-card" style="margin-top: 20px;">
            <h3 style="padding: 20px 20px 0 20px;"><i class="fas fa-tshirt"></i> Мои образы</h3>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; padding: 20px;">
                ${allSkins.filter(skin => currentUser.unlockedSkins?.includes(skin.icon)).map(skin => `
                    <div class="skin-option ${currentUser.avatar === skin.icon ? 'active-skin' : ''}" onclick="changeAvatar('${skin.icon}')">
                        <div class="skin-icon ${skin.animation || ''}">${skin.icon}</div>
                        <div class="skin-name">${skin.name}</div>
                        ${currentUser.avatar === skin.icon ? '<div class="active-badge">✓</div>' : ''}
                    </div>
                `).join('')}
                ${allSkins.filter(skin => !currentUser.unlockedSkins?.includes(skin.icon)).slice(0, 4).map(skin => `
                    <div class="skin-option locked" onclick="openSkinShop()">
                        <div class="skin-icon">${skin.icon}</div>
                        <div class="skin-name">${skin.name}</div>
                        <div class="locked-badge">🔒</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Мои титулы -->
        <div class="profile-card" style="margin-top: 20px;">
            <h3 style="padding: 20px 20px 0 20px;"><i class="fas fa-tag"></i> Мои титулы</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; padding: 20px;">
                ${allTitles.filter(title => currentUser.unlockedTitles?.includes(title)).map(title => `
                    <div class="title-option ${currentUser.title === title ? 'active-title' : ''}" onclick="changeTitle('${title}')">
                        ${title}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Достижения -->
        <div class="profile-card" style="margin-top: 20px;">
            <h3 style="padding: 20px 20px 0 20px;"><i class="fas fa-medal"></i> Мои достижения</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; padding: 20px;">
                ${achievements.map(ach => `
                    <div class="achievement-card ${ach.achieved ? 'achieved' : 'locked'}">
                        <div class="achievement-icon">${ach.icon}</div>
                        <div class="achievement-name">${ach.name}</div>
                        <div class="achievement-desc">${ach.desc}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Мои мероприятия -->
        <div class="profile-card" style="margin-top: 20px;">
            <h3 style="padding: 20px 20px 0 20px;"><i class="fas fa-calendar-check"></i> Участие в мероприятиях</h3>
            <div id="userEventsList" style="padding: 20px;">
                ${renderUserEventsList(currentUser)}
            </div>
        </div>
        
        <!-- Кнопка выхода -->
        <div style="margin-top: 20px; text-align: center; padding-bottom: 20px;">
            <button class="btn-danger" onclick="window.authManager?.logout(); renderProfile();">
                <i class="fas fa-sign-out-alt"></i> Выйти из профиля
            </button>
        </div>
    `;
}

function renderUserEventsList(currentUser) {
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    const userEvents = events.filter(e => e.confirmed?.includes(currentUser.id));
    
    if (userEvents.length === 0) {
        return '<div style="color: var(--text-dim); text-align: center; padding: 20px;">📭 Ты ещё не участвовал в мероприятиях</div>';
    }
    
    return userEvents.map(event => `
        <div class="user-event-item">
            <span class="user-event-emoji">${event.emoji || '🎯'}</span>
            <span class="user-event-name">${event.name}</span>
            <span class="user-event-rewards">⭐ +${event.points} 🪙 +${event.coins}</span>
        </div>
    `).join('');
}

// Функции для кастомизации
function changeAvatar(icon) {
    if (window.authManager?.currentUser) {
        window.authManager.currentUser.avatar = icon;
        window.authManager.updateUser(window.authManager.currentUser);
        renderProfile();
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        window.authManager.showToast(`✨ Образ изменён на ${icon}!`, 'success');
    }
}

function changeTitle(title) {
    if (window.authManager?.currentUser) {
        window.authManager.currentUser.title = title;
        window.authManager.updateUser(window.authManager.currentUser);
        renderProfile();
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        window.authManager.showToast(`🏷️ Теперь ты "${title}"!`, 'success');
    }
}

function changeBackground(bgId) {
    if (window.authManager?.currentUser) {
        window.authManager.currentUser.bgColor = bgId;
        window.authManager.updateUser(window.authManager.currentUser);
        renderProfile();
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        window.authManager.showToast(`🖼️ Фон профиля изменён!`, 'success');
    }
}

function changeFrame(frameId) {
    if (window.authManager?.currentUser) {
        // Проверяем, разблокирована ли рамка
        const isUnlocked = window.authManager.currentUser.unlockedFrames?.includes(frameId) || frameId === 'default';
        if (!isUnlocked) {
            window.authManager.showToast(`🔒 Сначала купи эту рамку в магазине!`, 'warning');
            return;
        }
        window.authManager.currentUser.frame = frameId;
        window.authManager.updateUser(window.authManager.currentUser);
        renderProfile();
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        window.authManager.showToast(`🖼️ Рамка профиля изменена!`, 'success');
    }
}

function openSkinShop() {
    document.querySelector('.nav-btn[data-tab="shop"]').click();
    window.authManager?.showToast('✨ В магазине можно купить новые образы!', 'info');
}

// Функция для создания плавающих эмодзи
function createFloatingEmojis() {
    const emojis = ['⭐', '🎮', '🏆', '🎨', '📚', '🎯', '🌟', '⚡', '🌸', '🍂'];
    const container = document.querySelector('.floating-shapes');
    
    if (!container) return;
    
    setInterval(() => {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const element = document.createElement('div');
        element.textContent = emoji;
        element.style.position = 'absolute';
        element.style.left = Math.random() * 100 + '%';
        element.style.bottom = '-50px';
        element.style.fontSize = (Math.random() * 30 + 20) + 'px';
        element.style.opacity = Math.random() * 0.3 + 0.1;
        element.style.animation = `floatUp ${Math.random() * 8 + 6}s linear forwards`;
        element.style.pointerEvents = 'none';
        container.appendChild(element);
        
        setTimeout(() => element.remove(), 14000);
    }, 4000);
}

// Добавляем глобальные функции
window.changeAvatar = changeAvatar;
window.changeTitle = changeTitle;
window.changeBackground = changeBackground;
window.changeFrame = changeFrame;
window.openSkinShop = openSkinShop;
window.renderProfile = renderProfile;