// Система авторизации для Активчиков
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.init();
    }

    loadUsers() {
        const stored = localStorage.getItem('aktivchiki_users');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch(e) {
                console.error('Ошибка парсинга пользователей:', e);
                return [];
            }
        }
        // Нет тестовых пользователей — пустой массив
        return [];
    }

    saveUsersToFile(users) {
        const prettyJson = JSON.stringify(users, null, 2);
        localStorage.setItem('aktivchiki_users', prettyJson);
        
        // Сохраняем также события для бэкапа
        const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
        const fullBackup = {
            users: users,
            events: events,
            lastBackup: new Date().toISOString(),
            version: '2.0'
        };
        localStorage.setItem('aktivchiki_full_backup', JSON.stringify(fullBackup, null, 2));
        
        // Обновляем статистику на главной
        this.updateStatsDisplay();
        
        // Обновляем рейтинг
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        if (typeof renderProfile === 'function') renderProfile();
    }

    saveUsers() {
        this.saveUsersToFile(this.users);
    }

    init() {
        const savedUser = sessionStorage.getItem('aktivchiki_currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
            } catch(e) {
                console.error('Ошибка парсинга текущего пользователя:', e);
                this.currentUser = null;
            }
        }
        this.updateUI();
        this.checkAdminVisibility();
        this.updateStatsDisplay();
    }

    login(username, password) {
        if (!username || !password) {
            this.showToast('❌ Введите логин и пароль', 'error');
            return false;
        }
        
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = { ...user };
            sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(this.currentUser));
            this.updateUI();
            this.checkAdminVisibility();
            this.updateStatsDisplay();
            this.showToast(`🎉 Добро пожаловать, ${username}!`, 'success');
            
            // Обновляем отображение
            if (typeof renderLeaderboard === 'function') renderLeaderboard();
            if (typeof renderProfile === 'function') renderProfile();
            if (typeof renderShop === 'function') renderShop();
            
            return true;
        }
        this.showToast('❌ Неверный логин или пароль', 'error');
        return false;
    }

    register(username, email, password, confirmPassword) {
        if (!username || !password) {
            this.showToast('❌ Заполните все поля', 'error');
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showToast('❌ Пароли не совпадают', 'error');
            return false;
        }
        
        if (password.length < 4) {
            this.showToast('❌ Пароль должен быть минимум 4 символа', 'error');
            return false;
        }
        
        if (this.users.find(u => u.username === username)) {
            this.showToast('❌ Такой никнейм уже занят', 'error');
            return false;
        }

        // Проверяем, есть ли уже пользователи в системе
        const isFirstUser = this.users.length === 0;

        const newUser = {
            id: 'u' + Date.now(),
            username: username,
            email: email || '',
            password: password,
            isAdmin: isFirstUser,
            level: 1,
            points: 0,
            coins: 100,
            avatar: '🎮',
            title: 'Новичок',
            frame: 'default',
            bgColor: 'default',
            participatedEvents: [],
            seasonPoints: { 
                season_winter2025: 0, 
                season_spring2026: 0, 
                season_summer2026: 0, 
                season_autumn2026: 0 
            },
            seasonEvents: { 
                season_winter2025: 0, 
                season_spring2026: 0, 
                season_summer2026: 0, 
                season_autumn2026: 0 
            },
            unlockedSkins: ['🎮'],
            unlockedTitles: ['Новичок'],
            unlockedBgs: ['default'],
            unlockedFrames: ['default'],
            unlockedAchievements: [],
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        this.login(username, password);
        
        if (isFirstUser) {
            this.showToast('👑 Поздравляем! Вы стали первым администратором!', 'success');
        } else {
            this.showToast('🎉 Регистрация прошла успешно!', 'success');
        }
        return true;
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('aktivchiki_currentUser');
        this.updateUI();
        this.checkAdminVisibility();
        this.updateStatsDisplay();
        
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        if (typeof renderProfile === 'function') renderProfile();
        if (typeof renderShop === 'function') renderShop();
        
        this.showToast('👋 До скорой встречи!', 'info');
    }

    updateUI() {
        const userAvatar = document.getElementById('userAvatar');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const mainActionBtn = document.getElementById('mainActionBtn');
        const mainActionText = document.getElementById('mainActionText');
        const userPointsCard = document.getElementById('userPointsCard');
        const loginPromptCard = document.getElementById('loginPromptCard');
        const userPointsStat = document.getElementById('userPointsStat');
        const userCoinsDisplay = document.getElementById('userCoinsDisplay');

        if (this.currentUser) {
            if (userAvatar) userAvatar.innerHTML = this.currentUser.avatar || '👤';
            if (userNameDisplay) userNameDisplay.innerHTML = this.currentUser.username;
            if (mainActionText) mainActionText.innerHTML = 'Мой профиль';
            if (userPointsCard) userPointsCard.style.display = 'flex';
            if (loginPromptCard) loginPromptCard.style.display = 'none';
            if (userPointsStat) userPointsStat.textContent = this.currentUser.points;
            if (userCoinsDisplay) userCoinsDisplay.innerHTML = `🪙 ${this.currentUser.coins} монет`;
            
            this.checkDailyBonus();
        } else {
            if (userAvatar) userAvatar.innerHTML = '👤';
            if (userNameDisplay) userNameDisplay.innerHTML = 'Гость';
            if (mainActionText) mainActionText.innerHTML = 'Войти в профиль';
            if (userPointsCard) userPointsCard.style.display = 'none';
            if (loginPromptCard) loginPromptCard.style.display = 'flex';
            if (userCoinsDisplay) userCoinsDisplay.innerHTML = '🪙 0 монет';
        }
        
        if (typeof renderProfile === 'function') renderProfile();
        if (typeof renderShop === 'function') renderShop();
    }

    checkAdminVisibility() {
        const adminTabs = document.querySelectorAll('.admin-only');
        const isAdmin = this.currentUser && this.currentUser.isAdmin;
        
        adminTabs.forEach(tab => {
            if (tab) tab.style.display = isAdmin ? 'inline-flex' : 'none';
        });
    }

    updateStatsDisplay() {
        const totalUsersEl = document.getElementById('totalUsers');
        const totalEventsEl = document.getElementById('totalEventsCount');
        
        if (totalUsersEl) totalUsersEl.textContent = this.users.filter(u => !u.isAdmin).length;
        
        const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
        if (totalEventsEl) totalEventsEl.textContent = events.length;
    }

    checkDailyBonus() {
        const lastLogin = localStorage.getItem('aktivchiki_lastLogin');
        const today = new Date().toDateString();
        
        if (lastLogin !== today && this.currentUser) {
            this.currentUser.coins += 50;
            this.updateUser(this.currentUser);
            localStorage.setItem('aktivchiki_lastLogin', today);
            this.showToast('🎁 Ежедневный бонус: +50 монет!', 'success');
        }
    }

    updateUser(user) {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            this.users[index] = user;
            this.saveUsers();
            if (this.currentUser && this.currentUser.id === user.id) {
                this.currentUser = user;
                sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(user));
            }
        }
        
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
        if (typeof renderProfile === 'function') renderProfile();
        
        // Попытка синхронизации с облаком
        if (typeof saveUserToCloud === 'function') {
            saveUserToCloud(user);
        }
    }

    addPoints(userId, points, season) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.points += points;
            if (user.seasonPoints) {
                user.seasonPoints[season] = (user.seasonPoints[season] || 0) + points;
            }
            
            const newLevel = Math.floor(user.points / 100) + 1;
            if (newLevel > user.level) {
                user.level = newLevel;
                this.checkLevelRewards(user);
                if (this.currentUser && this.currentUser.id === userId) {
                    this.showToast(`🎉 Ура! Ты достиг ${newLevel} уровня!`, 'success');
                }
            }
            this.updateUser(user);
        }
    }

    addCoins(userId, coins) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.coins += coins;
            this.updateUser(user);
        }
    }

    addEventCount(userId, season) {
        const user = this.users.find(u => u.id === userId);
        if (user && user.seasonEvents) {
            user.seasonEvents[season] = (user.seasonEvents[season] || 0) + 1;
            if (!user.participatedEvents) user.participatedEvents = [];
            user.participatedEvents.push({ season, date: new Date().toISOString() });
            this.updateUser(user);
        }
    }

    checkLevelRewards(user) {
        const levelRewards = {
            3: { coins: 200, title: 'Начинающий', skin: '⭐', frame: 'bronze_frame' },
            5: { coins: 500, title: 'Активист', skin: '🔥', frame: 'silver_frame' },
            8: { coins: 1000, title: 'Творец', skin: '🎨', frame: 'gold_frame' },
            10: { coins: 2000, title: 'Лидер', skin: '👑', frame: 'rainbow_frame' },
            15: { coins: 5000, title: 'Легенда', skin: '🏆', frame: 'legend_frame' }
        };
        
        const reward = levelRewards[user.level];
        if (reward && !user.unlockedTitles?.includes(reward.title)) {
            if (!user.unlockedTitles) user.unlockedTitles = [];
            if (!user.unlockedSkins) user.unlockedSkins = [];
            if (!user.unlockedFrames) user.unlockedFrames = [];
            
            user.coins += reward.coins;
            user.unlockedTitles.push(reward.title);
            if (!user.unlockedSkins.includes(reward.skin)) user.unlockedSkins.push(reward.skin);
            if (!user.unlockedFrames.includes(reward.frame)) user.unlockedFrames.push(reward.frame);
            this.updateUser(user);
            
            if (this.currentUser && this.currentUser.id === user.id) {
                this.showToast(`🎁 Получены награды за ${user.level} уровень!`, 'success');
            }
        }
    }

    showToast(message, type) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Глобальный экземпляр
window.authManager = new AuthManager();

// Обновление рейтинга при изменении пользователей
function refreshLeaderboard() {
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
}

// Экспорт функций для админ-панели
window.addUserCoins = (userId, amount) => window.authManager?.addCoins(userId, amount);
window.addUserPoints = (userId, amount) => window.authManager?.addPoints(userId, amount, 'season_spring2026');
window.resetUserSeason = (userId) => {
    if (confirm('Сбросить сезонные очки?')) {
        const user = window.authManager?.users.find(u => u.id === userId);
        if (user) {
            user.seasonPoints.season_spring2026 = 0;
            user.seasonEvents.season_spring2026 = 0;
            window.authManager.updateUser(user);
            window.authManager.showToast(`🔄 Сезонные очки сброшены`, 'info');
            if (typeof renderLeaderboard === 'function') renderLeaderboard();
        }
    }
};
