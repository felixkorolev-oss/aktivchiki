// Управление мероприятиями
let events = [];

function loadEvents() {
    const stored = localStorage.getItem('aktivchiki_events');
    if (stored) {
        events = JSON.parse(stored);
    } else {
        // Начальные мероприятия
        events = [
            {
                id: 'e1',
                name: '🎨 Конкурс рисунков "Весеннее настроение"',
                description: 'Нарисуй весенний пейзаж или открытку. Лучшие работы получат призы! Участвуют все классы.',
                points: 50,
                coins: 100,
                season: 'season_spring2026',
                emoji: '🎨',
                registered: [],
                confirmed: [],
                status: 'active',
                maxParticipants: 50,
                createdAt: new Date().toISOString()
            },
            {
                id: 'e2',
                name: '⚽ Турнир по футболу',
                description: 'Командный турнир. Собери свою команду из 5 человек! Победителей ждут кубки и грамоты.',
                points: 100,
                coins: 200,
                season: 'season_spring2026',
                emoji: '⚽',
                registered: [],
                confirmed: [],
                status: 'active',
                maxParticipants: 40,
                createdAt: new Date().toISOString()
            },
            {
                id: 'e3',
                name: '📚 Олимпиада по математике',
                description: 'Проверь свои знания! Задания для всех классов. Лучшие математики получат грамоты.',
                points: 75,
                coins: 150,
                season: 'season_spring2026',
                emoji: '📚',
                registered: [],
                confirmed: [],
                status: 'active',
                maxParticipants: 100,
                createdAt: new Date().toISOString()
            }
        ];
        saveEvents();
    }
}

function saveEvents() {
    localStorage.setItem('aktivchiki_events', JSON.stringify(events));
}

function renderEvents() {
    const container = document.getElementById('eventsContainer');
    if (!container) return;
    
    const currentUser = window.authManager?.currentUser;
    const activeEvents = events.filter(e => e.status === 'active' && e.season === currentSeason);
    
    if (activeEvents.length === 0) {
        container.innerHTML = '<div class="info-card">🎯 Скоро здесь появятся новые мероприятия!</div>';
        return;
    }
    
    container.innerHTML = activeEvents.map(event => {
        const isRegistered = currentUser && event.registered.includes(currentUser.id);
        const isConfirmed = currentUser && event.confirmed.includes(currentUser.id);
        
        let buttonHtml = '';
        if (!isRegistered && !isConfirmed) {
            buttonHtml = `<button class="btn-primary" onclick="registerForEvent('${event.id}')">📝 Записаться</button>`;
        } else if (isRegistered && !isConfirmed) {
            buttonHtml = `<span style="background:var(--warning); padding:8px 15px; border-radius:30px;">⏳ Ждёт подтверждения</span>`;
        } else if (isConfirmed) {
            buttonHtml = `<span style="background:var(--success); padding:8px 15px; border-radius:30px;">✅ Участие подтверждено</span>`;
        }
        
        return `
            <div class="event-card" onclick="showEventDetails('${event.id}')">
                <div class="event-emoji">${event.emoji || '🎯'}</div>
                <div class="event-name">${event.name}</div>
                <div class="event-desc">${event.description.substring(0, 80)}${event.description.length > 80 ? '...' : ''}</div>
                <div class="event-rewards">
                    <span>⭐ +${event.points} очков</span>
                    <span>🪙 +${event.coins} монет</span>
                </div>
                <div class="event-badge">${event.registered.length}/${event.maxParticipants} участников</div>
                ${buttonHtml}
            </div>
        `;
    }).join('');
}

function showEventDetails(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const modal = document.getElementById('eventModal');
    const titleEl = document.getElementById('eventModalTitle');
    const bodyEl = document.getElementById('eventModalBody');
    
    titleEl.innerHTML = `${event.emoji || '🎯'} ${event.name}`;
    
    bodyEl.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 80px; margin: 20px;">${event.emoji || '🎯'}</div>
            <h3>${event.name}</h3>
            <p style="margin: 15px 0; line-height: 1.6;">${event.description}</p>
            <div style="background: rgba(255,107,107,0.1); padding: 15px; border-radius: 20px; margin: 15px 0;">
                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
                    <div><strong>⭐ Очки</strong><br><span style="font-size: 24px;">${event.points}</span></div>
                    <div><strong>🪙 Монеты</strong><br><span style="font-size: 24px;">${event.coins}</span></div>
                    <div><strong>👥 Мест</strong><br>${event.registered.length}/${event.maxParticipants}</div>
                </div>
            </div>
            <button class="btn-primary" onclick="registerForEvent('${event.id}'); document.getElementById('eventModal').classList.remove('active');">📝 Записаться сейчас</button>
        </div>
    `;
    
    modal.classList.add('active');
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

function registerForEvent(eventId) {
    const currentUser = window.authManager?.currentUser;
    if (!currentUser) {
        window.authManager?.showToast('Сначала войди в профиль!', 'warning');
        document.getElementById('authModal').classList.add('active');
        return;
    }
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    if (event.registered.includes(currentUser.id)) {
        window.authManager?.showToast('Ты уже записан на это мероприятие!', 'warning');
        return;
    }
    
    if (event.registered.length >= event.maxParticipants) {
        window.authManager?.showToast('Мест больше нет :(', 'error');
        return;
    }
    
    event.registered.push(currentUser.id);
    
    // Сохраняем в заявки пользователя
    if (!currentUser.pendingEvents) currentUser.pendingEvents = [];
    currentUser.pendingEvents.push({
        eventId: event.id,
        eventName: event.name,
        eventEmoji: event.emoji,
        points: event.points,
        coins: event.coins,
        season: event.season
    });
    
    saveEvents();
    window.authManager.updateUser(currentUser);
    renderEvents();
    renderPendingRegistrations();
    window.authManager?.showToast(`✅ Ты записан на "${event.name}"! Жди подтверждения.`, 'success');
}

function renderPendingRegistrations() {
    const container = document.getElementById('pendingRegistrations');
    const currentUser = window.authManager?.currentUser;
    
    if (!container) return;
    
    if (!currentUser || !currentUser.pendingEvents || currentUser.pendingEvents.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dim);">У тебя пока нет активных заявок</p>';
        return;
    }
    
    container.innerHTML = currentUser.pendingEvents.map(reg => `
        <div class="pending-item">
            <div>${reg.eventEmoji || '🎯'} <strong>${reg.eventName}</strong></div>
            <div style="font-size:12px; color:var(--text-dim);">⭐ +${reg.points} | 🪙 +${reg.coins}</div>
            <span style="color:var(--warning);">⏳ Ожидает подтверждения</span>
        </div>
    `).join('');
}

function createEvent(eventData) {
    const newEvent = {
        id: 'e' + Date.now(),
        name: eventData.name,
        description: eventData.desc,
        points: parseInt(eventData.points),
        coins: parseInt(eventData.coins),
        season: eventData.season,
        emoji: eventData.emoji || '🎯',
        registered: [],
        confirmed: [],
        status: 'active',
        maxParticipants: 100,
        createdAt: new Date().toISOString()
    };
    
    events.push(newEvent);
    saveEvents();
    renderEvents();
    window.authManager?.showToast('✨ Мероприятие создано!', 'success');
}

// Инициализация
loadEvents();
renderPendingRegistrations();