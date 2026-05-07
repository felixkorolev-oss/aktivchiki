// ============================================
// СИНХРОНИЗАЦИЯ ЧЕРЕЗ GOOGLE SHEETS
// ============================================
// ВСТАВЬТЕ ВАШ URL ИЗ GOOGLE APPS SCRIPT
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbwj7HABnalhTAhTHbIciPIsZlc5BurC2EacmK6zWhtCQ1ksf2_6DBuswUuur0rfkYEQ3g/exec';

let isSyncing = false;
let lastSyncTime = null;

// Загрузка данных из Google Sheets
async function loadFromCloud() {
    if (isSyncing) return false;
    isSyncing = true;
    
    try {
        updateSyncStatus('📥 Загрузка...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(SYNC_URL, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const users = result.data;
            
            // Обработка пользователей
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
                window.authManager.updateUI();
            }
            
            refreshUI();
            updateSyncStatus(`✅ ${processedUsers.length} записей`);
            lastSyncTime = new Date();
            return true;
        } else {
            throw new Error(result.error || 'Ошибка загрузки');
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        if (error.name === 'AbortError') {
            updateSyncStatus('⏱️ Таймаут', true);
        } else {
            updateSyncStatus('⚠️ Ошибка', true);
        }
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
            console.log('Нет данных для отправки');
            updateSyncStatus('⚠️ Нет данных', true);
            return false;
        }
        
        // Подготавливаем данные
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
            unlockedAchievements: JSON.stringify(user.unlockedAchievements || []),
            participatedEvents: JSON.stringify(user.participatedEvents || []),
            createdAt: user.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preparedUsers),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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

// Принудительная синхронизация (загрузить из облака)
async function forceSync() {
    updateSyncStatus('🔄 Синхронизация...');
    const success = await loadFromCloud();
    if (success && window.showToast) {
        window.showToast('✅ Данные синхронизированы из Google Sheets!', 'success');
    } else if (window.showToast) {
        window.showToast('⚠️ Не удалось синхронизировать, проверьте интернет', 'error');
    }
    return success;
}

// Отправить локальные данные в облако
async function pushToCloud() {
    updateSyncStatus('📤 Отправка...');
    const success = await saveToCloud();
    if (success && window.showToast) {
        window.showToast('✅ Данные отправлены в Google Sheets!', 'success');
    }
    return success;
}

// Автоматическая синхронизация (каждые 30 секунд)
function startAutoSync() {
    setInterval(async () => {
        if (navigator.onLine && !isSyncing) {
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
        else if (msg.includes('🔄') || msg.includes('📥') || msg.includes('📤')) syncIndicator.style.color = '#FFE66D';
        else syncIndicator.style.color = '#888';
    }
}

// Запуск синхронизации
async function initSync() {
    console.log('🔄 Инициализация Google Sheets синхронизации...');
    updateSyncStatus('🔄 Подключение...');
    
    // Проверяем, настроен ли URL
    if (SYNC_URL.includes('ВАШ_ID')) {
        console.warn('⚠️ ВНИМАНИЕ! Не настроен SYNC_URL в файле sync.js');
        updateSyncStatus('⚠️ Настройте URL', true);
        return false;
    }
    
    // Загружаем данные
    await loadFromCloud();
    
    // Запускаем авто-синхронизацию
    startAutoSync();
    
    updateSyncStatus('✅ Активен');
    return true;
}

// Экспорт функций
window.initSync = initSync;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
window.forceSync = forceSync;
window.pushToCloud = pushToCloud;

// Автозапуск
setTimeout(initSync, 2000);
console.log('🔄 Модуль Google Sheets синхронизации загружен');
