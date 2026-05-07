// ============================================
// СИНХРОНИЗАЦИЯ ЧЕРЕЗ GOOGLE SHEETS
// ============================================
// ВСТАВЬТЕ ВАШ URL ИЗ GOOGLE APPS SCRIPT
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbydE-ERcuNKeiHTkR5PXzhdUKxwIgKx2rcqa5XbFDSNKH4z6R7VTjxonkYvHWby8H47Lw/exec';

let isSyncing = false;
let lastSyncTime = null;

// Загрузка данных из Google Sheets
async function loadFromCloud() {
    if (isSyncing) return false;
    isSyncing = true;
    
    try {
        updateSyncStatus('📥 Загрузка...');
        
        const response = await fetch(SYNC_URL, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) throw new Error('HTTP error');
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const users = result.data;
            
            // Преобразуем строки JSON обратно в объекты
            const processedUsers = users.map(user => ({
                ...user,
                seasonPoints: typeof user.seasonPoints === 'string' ? JSON.parse(user.seasonPoints || '{}') : (user.seasonPoints || {}),
                seasonEvents: typeof user.seasonEvents === 'string' ? JSON.parse(user.seasonEvents || '{}') : (user.seasonEvents || {}),
                unlockedSkins: typeof user.unlockedSkins === 'string' ? JSON.parse(user.unlockedSkins || '[]') : (user.unlockedSkins || []),
                unlockedTitles: typeof user.unlockedTitles === 'string' ? JSON.parse(user.unlockedTitles || '[]') : (user.unlockedTitles || []),
                unlockedBgs: typeof user.unlockedBgs === 'string' ? JSON.parse(user.unlockedBgs || '[]') : (user.unlockedBgs || []),
                unlockedFrames: typeof user.unlockedFrames === 'string' ? JSON.parse(user.unlockedFrames || '[]') : (user.unlockedFrames || []),
                participatedEvents: typeof user.participatedEvents === 'string' ? JSON.parse(user.participatedEvents || '[]') : (user.participatedEvents || [])
            }));
            
            localStorage.setItem('aktivchiki_users', JSON.stringify(processedUsers, null, 2));
            console.log(`📥 Загружено ${processedUsers.length} пользователей из Google Sheets`);
            
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
            updateSyncStatus(`✅ ${processedUsers.length} пользователей`);
            lastSyncTime = new Date();
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        updateSyncStatus('⚠️ Ошибка', true);
        return false;
    } finally {
        isSyncing = false;
    }
}

// Отправка данных в Google Sheets
async function saveToCloud() {
    if (isSyncing) return false;
    isSyncing = true;
    
    try {
        updateSyncStatus('📤 Отправка...');
        
        const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
        
        if (users.length === 0) {
            updateSyncStatus('⚠️ Нет данных');
            return false;
        }
        
        // Подготавливаем данные для отправки
        const preparedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email || '',
            password: user.password,
            isAdmin: user.isAdmin || false,
            level: user.level || 1,
            points: user.points || 0,
            coins: user.coins || 100,
            avatar: user.avatar || '🎮',
            title: user.title || 'Новичок',
            frame: user.frame || 'default',
            bgColor: user.bgColor || 'default',
            seasonPoints: JSON.stringify(user.seasonPoints || {}),
            seasonEvents: JSON.stringify(user.seasonEvents || {}),
            unlockedSkins: JSON.stringify(user.unlockedSkins || []),
            unlockedTitles: JSON.stringify(user.unlockedTitles || []),
            unlockedBgs: JSON.stringify(user.unlockedBgs || []),
            unlockedFrames: JSON.stringify(user.unlockedFrames || []),
            participatedEvents: JSON.stringify(user.participatedEvents || []),
            createdAt: user.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preparedUsers)
        });
        
        console.log(`📤 Отправлено ${users.length} пользователей в Google Sheets`);
        updateSyncStatus(`✅ ${users.length} отправлено`);
        lastSyncTime = new Date();
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        updateSyncStatus('⚠️ Ошибка', true);
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
        window.showToast('✅ Данные синхронизированы с Google Sheets!', 'success');
    } else if (window.showToast) {
        window.showToast('⚠️ Не удалось синхронизировать, проверьте интернет', 'error');
    }
    return success;
}

// Периодическая синхронизация
function startPeriodicSync() {
    setInterval(async () => {
        if (navigator.onLine && !isSyncing) {
            await loadFromCloud();
        }
    }, 60000); // Каждую минуту
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

// Запуск
async function initSync() {
    console.log('🔄 Инициализация Google Sheets синхронизации...');
    updateSyncStatus('🔄 Подключение...');
    await loadFromCloud();
    startPeriodicSync();
    updateSyncStatus('✅ Активен');
}

// Экспорт
window.initSync = initSync;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
window.forceSync = forceSync;

// Автозапуск
setTimeout(initSync, 1500);
console.log('🔄 Модуль Google Sheets синхронизации загружен');
