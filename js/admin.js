// Админ панель для подтверждения участия и управления

function renderAdminRegistrations() {
    const container = document.getElementById('adminRegistrationsList');
    if (!container) return;
    
    const currentUser = window.authManager?.currentUser;
    if (!currentUser || !currentUser.isAdmin) return;
    
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    const users = window.authManager?.users || [];
    
    const pendingRegistrations = [];
    
    events.forEach(event => {
        event.registered.forEach(userId => {
            if (!event.confirmed.includes(userId)) {
                const user = users.find(u => u.id === userId);
                if (user) {
                    pendingRegistrations.push({
                        eventId: event.id,
                        eventName: event.name,
                        eventEmoji: event.emoji,
                        userId: userId,
                        userName: user.username,
                        userAvatar: user.avatar,
                        points: event.points,
                        coins: event.coins,
                        season: event.season
                    });
                }
            }
        });
    });
    
    if (pendingRegistrations.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">✨ Нет заявок, ожидающих подтверждения</div>';
        return;
    }
    
    container.innerHTML = pendingRegistrations.map(reg => `
        <div class="admin-request-item">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span style="font-size: 36px;">${reg.userAvatar || '👤'}</span>
                <div>
                    <div><strong>${reg.userName}</strong> хочет участвовать в <strong>${reg.eventEmoji || '🎯'} ${reg.eventName}</strong></div>
                    <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">⭐ Награда: +${reg.points} очков | 🪙 +${reg.coins} монет</div>
                </div>
            </div>
            <button class="admin-action-btn" onclick="window.confirmUserParticipation('${reg.eventId}', '${reg.userId}')">
                ✅ Подтвердить
            </button>
        </div>
    `).join('');
}

function renderAdminUsers() {
    const container = document.getElementById('adminUsersList');
    if (!container) return;
    
    const users = window.authManager?.users || [];
    const regularUsers = users.filter(u => !u.isAdmin);
    
    if (regularUsers.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">👥 Нет пользователей</div>';
        return;
    }
    
    container.innerHTML = regularUsers.map(user => `
        <div class="admin-user-item">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span style="font-size: 36px;">${user.avatar || '👤'}</span>
                <div>
                    <div><strong>${user.username}</strong> | Уровень ${user.level}</div>
                    <div style="font-size: 12px; color: var(--text-dim);">⭐ ${user.points} очков | 🪙 ${user.coins} монет</div>
                    <div style="font-size: 11px; color: var(--text-dim);">🏷️ ${user.title || 'Новичок'} | 🎯 ${user.seasonEvents?.season_spring2026 || 0} ивентов</div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="admin-action-btn" style="background: var(--warning);" onclick="window.addUserCoins('${user.id}', 100)">+100 🪙</button>
                <button class="admin-action-btn" style="background: var(--primary);" onclick="window.addUserPoints('${user.id}', 50)">+50 ⭐</button>
                <button class="admin-action-btn" style="background: var(--danger);" onclick="window.resetUserSeason('${user.id}')">↺ Сброс</button>
            </div>
        </div>
    `).join('');
}

function renderAdminEvents() {
    const container = document.getElementById('adminEventsList');
    if (!container) return;
    
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    if (events.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">📅 Нет созданных мероприятий</div>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="admin-user-item">
            <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">${event.emoji || '🎯'}</span>
                    <div>
                        <strong>${event.name}</strong>
                        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">${event.description.substring(0, 60)}...</div>
                        <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">⭐ ${event.points} | 🪙 ${event.coins} | 👥 ${event.registered.length}/${event.maxParticipants}</div>
                    </div>
                </div>
            </div>
            <button class="admin-action-btn" style="background: var(--danger);" onclick="window.deleteEvent('${event.id}')">🗑️ Удалить</button>
        </div>
    `).join('');
}

function populateUserSelect() {
    const select = document.getElementById('rewardUserSelect');
    if (!select) return;
    
    const users = window.authManager?.users || [];
    const regularUsers = users.filter(u => !u.isAdmin);
    
    select.innerHTML = '<option value="">Выберите пользователя</option>' + 
        regularUsers.map(user => `<option value="${user.id}">${user.avatar || '👤'} ${user.username} (Ур. ${user.level})</option>`).join('');
}

function giveReward() {
    const userId = document.getElementById('rewardUserSelect')?.value;
    const coins = parseInt(document.getElementById('rewardCoins')?.value) || 0;
    const points = parseInt(document.getElementById('rewardPoints')?.value) || 0;
    
    if (!userId) {
        window.authManager?.showToast('Выберите пользователя!', 'warning');
        return;
    }
    
    if (coins > 0) window.authManager.addCoins(userId, coins);
    if (points > 0) window.authManager.addPoints(userId, points, 'season_spring2026');
    
    window.authManager?.showToast(`🎁 Награда выдана!`, 'success');
    renderAdminUsers();
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
    
    document.getElementById('rewardCoins').value = '';
    document.getElementById('rewardPoints').value = '';
}

// Функции для админ-действий
window.confirmUserParticipation = function(eventId, userId) {
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    const eventIndex = events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) return;
    
    const event = events[eventIndex];
    event.registered = event.registered.filter(id => id !== userId);
    if (!event.confirmed.includes(userId)) {
        event.confirmed.push(userId);
    }
    
    const user = window.authManager?.users.find(u => u.id === userId);
    if (user) {
        window.authManager.addPoints(userId, event.points, event.season);
        window.authManager.addCoins(userId, event.coins);
        window.authManager.addEventCount(userId, event.season);
        
        if (user.pendingEvents) {
            user.pendingEvents = user.pendingEvents.filter(p => p.eventId !== eventId);
            window.authManager.updateUser(user);
        }
        window.authManager?.showToast(`✅ ${user.username} получил награды!`, 'success');
    }
    
    localStorage.setItem('aktivchiki_events', JSON.stringify(events, null, 2));
    renderAdminRegistrations();
    renderAdminUsers();
    if (typeof renderEvents === 'function') renderEvents();
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
    if (typeof renderPendingRegistrations === 'function') renderPendingRegistrations();
};

window.addUserCoins = function(userId, amount) {
    window.authManager.addCoins(userId, amount);
    window.authManager?.showToast(`💰 Добавлено ${amount} монет!`, 'success');
    renderAdminUsers();
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
};

window.addUserPoints = function(userId, amount) {
    window.authManager.addPoints(userId, amount, 'season_spring2026');
    window.authManager?.showToast(`⭐ Добавлено ${amount} очков!`, 'success');
    renderAdminUsers();
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
};

window.resetUserSeason = function(userId) {
    if (confirm('Сбросить сезонные очки пользователя?')) {
        const user = window.authManager?.users.find(u => u.id === userId);
        if (user) {
            user.seasonPoints.season_spring2026 = 0;
            user.seasonEvents.season_spring2026 = 0;
            window.authManager.updateUser(user);
            window.authManager?.showToast(`🔄 Сезонные очки ${user.username} сброшены`, 'info');
            if (typeof renderLeaderboard === 'function') renderLeaderboard();
            renderAdminUsers();
        }
    }
};

window.deleteEvent = function(eventId) {
    if (confirm('Удалить это мероприятие?')) {
        let events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
        events = events.filter(e => e.id !== eventId);
        localStorage.setItem('aktivchiki_events', JSON.stringify(events, null, 2));
        renderAdminEvents();
        if (typeof renderEvents === 'function') renderEvents();
        window.authManager?.showToast('Мероприятие удалено', 'info');
    }
};

// Инициализация админ-табов
document.addEventListener('DOMContentLoaded', () => {
    const adminTabs = document.querySelectorAll('.admin-tab-btn');
    adminTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.adminTab;
            adminTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const tabContent = document.getElementById(`admin${tabId.charAt(0).toUpperCase() + tabId.slice(1)}Tab`);
            if (tabContent) tabContent.classList.add('active');
            
            if (tabId === 'registrations') renderAdminRegistrations();
            else if (tabId === 'users') renderAdminUsers();
            else if (tabId === 'events') renderAdminEvents();
            else if (tabId === 'rewards') populateUserSelect();
        });
    });
    
    if (document.getElementById('adminRegistrationsList')) {
        renderAdminRegistrations();
    }
    if (document.getElementById('adminUsersList')) {
        renderAdminUsers();
    }
    if (document.getElementById('adminEventsList')) {
        renderAdminEvents();
    }
    if (document.getElementById('rewardUserSelect')) {
        populateUserSelect();
    }
});

window.giveReward = giveReward;