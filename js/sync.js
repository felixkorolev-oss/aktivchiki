// ============================================
// ПРОСТАЯ СИНХРОНИЗАЦИЯ ЧЕРЕЗ GOOGLE SHEETS
// ============================================
// ВСТАВЬТЕ ВАШ URL ИЗ GOOGLE APPS SCRIPT
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbxM7Gdp8D3iaRflM0Vu26Mugp831kIWtZOxqMi0a2HTgE9fnIpcnyAwPvxhUuL2-cAaww/exec';

let isSyncing = false;
let lastSyncTime = null;

// Загрузка данных из облака
async function loadFromCloud() {
    if (isSyncing) return false;
    isSyncing = true;
    
    try {
        updateSyncStatus('📥 Загрузка...');
        
        const response = await fetch(SYNC_URL);
        const users = await response.json();
        
        if (users && users.length > 0) {
            // Преобразуем строки JSON обратно в объекты
            const processedUsers = users.map(user => ({
                ...user,
                seasonPoints: typeof user.seasonPoints === 'string' ? JSON.parse(user.seasonPoints) : user.seasonPoints,
                seasonEvents: typeof user.seasonEvents === 'string' ? JSON.parse(user.seasonEvents) : user.seasonEvents,
                unlockedSkins: typeof user.unlockedSkins === 'string' ? JSON.parse(user.unlockedSkins) : user.unlockedSkins,
                unlockedTitles: typeof user.unlockedTitles === 'string' ? JSON.parse(user.unlockedTitles) : user.unlockedTitles,
                unlockedBgs: typeof user.unlockedBgs === 'string' ? JSON.parse(user.unlockedBgs) : user.unlockedBgs,
                unlockedFrames: typeof user.unlockedFrames === 'string' ? JSON.parse(user.unlockedFrames) : user.unlockedFrames,
                participatedEvents: typeof user.participatedEvents === 'string' ? JSON.parse(user.participatedEvents) : user.participatedEvents
            }));
            
            localStorage.setItem('aktivchiki_users', JSON.stringify(processedUsers, null, 2));
            console.log(`📥 Загружено ${processedUsers.length} пользователей`);
            
            if (window.authManager) {
                window.authManager.users = processedUsers;
                if (window.authManager.currentUser) {
                    const updated = processedUsers.find(u => u.id === window.authManager.currentUser.id);
                    if (updated) {
                        window.authManager.currentUser = updated;
                        sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(updated));
                    }
                }
                window.authManager.saveUsersToLocal();
            }
            
            refreshUI();
            updateSyncStatus('✅ Синхронизировано');
            lastSyncTime = new Date();
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        updateSyncStatus('📱 Офлайн режим', true);
        return false;
    } finally {
        isSyncing = false;
    }
}

// Отправка данных в облако
async function saveToCloud() {
    if (isSyncing) return false;
    isSyncing = true;
    
    try {
        updateSyncStatus('📤 Отправка...');
        
        const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
        
        // Подготавливаем данные для отправки (преобразуем объекты в строки)
        const preparedUsers = users.map(user => ({
            ...user,
            seasonPoints: JSON.stringify(user.seasonPoints || {}),
            seasonEvents: JSON.stringify(user.seasonEvents || {}),
            unlockedSkins: JSON.stringify(user.unlockedSkins || []),
            unlockedTitles: JSON.stringify(user.unlockedTitles || []),
            unlockedBgs: JSON.stringify(user.unlockedBgs || []),
            unlockedFrames: JSON.stringify(user.unlockedFrames || []),
            participatedEvents: JSON.stringify(user.participatedEvents || [])
        }));
        
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preparedUsers)
        });
        
        console.log(`📤 Отправлено ${users.length} пользователей`);
        updateSyncStatus('✅ Сохранено');
        lastSyncTime = new Date();
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        updateSyncStatus('⚠️ Не отправлено', true);
        return false;
    } finally {
        isSyncing = false;
    }
}

// Принудительная синхронизация
async function forceSync() {
    updateSyncStatus('🔄 Синхронизация...');
    const success = await loadFromCloud();
    if (success && window.showToast) {
        window.showToast('✅ Данные синхронизированы!', 'success');
    }
    return success;
}

// Периодическая синхронизация
function startPeriodicSync() {
    // Каждые 30 секунд
    setInterval(async () => {
        if (navigator.onLine) {
            await loadFromCloud();
        }
    }, 30000);
}

// Обновление интерфейса
function refreshUI() {
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
    if (typeof renderProfile === 'function') renderProfile();
    if (typeof renderEvents === 'function') renderEvents();
    if (typeof renderShop === 'function') renderShop();
    if (typeof renderAdminRegistrations === 'function') renderAdminRegistrations();
    if (typeof renderAdminUsers === 'function') renderAdminUsers();
}

// Обновление статуса
function updateSyncStatus(msg, isError = false) {
    const statusText = document.getElementById('cloudStatusText');
    const syncIndicator = document.getElementById('syncIndicator');
    if (statusText) statusText.innerHTML = msg;
    if (syncIndicator) {
        if (isError) syncIndicator.style.color = '#FF5252';
        else if (msg.includes('✅')) syncIndicator.style.color = '#00E676';
        else syncIndicator.style.color = '#FFE66D';
    }
}

// Автоматическая синхронизация при изменениях
function setupAutoSync() {
    // Подписываемся на изменения в localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key === 'aktivchiki_users' && navigator.onLine) {
            setTimeout(() => saveToCloud(), 100);
        }
    };
}

// Запуск
async function initSync() {
    console.log('🔄 Инициализация синхронизации...');
    setupAutoSync();
    await loadFromCloud();
    startPeriodicSync();
    updateSyncStatus('✅ Онлайн');
}

// Экспорт
window.initSync = initSync;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
window.forceSync = forceSync;

// Автозапуск
setTimeout(initSync, 1500);
console.log('🔄 Модуль синхронизации загружен');
