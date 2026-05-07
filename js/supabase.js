// ============================================
// НАСТРОЙКИ SUPABASE - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
// ============================================
// 1. Зайдите в панель управления Supabase
// 2. Project Settings → API
// 3. Скопируйте Project URL и anon public key
// ============================================

const SUPABASE_URL = 'https://krgtyuyoqxcocahjdphp.supabase.co';  // ЗАМЕНИТЕ!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3R5dXlvcXhjb2NhaGpkcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc2OTQsImV4cCI6MjA5MzcyMzY5NH0.3ft8C6WGEZneNMtM9rTTAVIkGKWJPnjqh3IsivhF7o8';  // ЗАМЕНИТЕ!

// ============================================
// КОД НИЖЕ НЕ ТРОГАЙТЕ
// ============================================

let supabaseClient = null;
let isSupabaseReady = false;

// Инициализация Supabase
async function initSupabase() {
    console.log('🔄 Инициализация Supabase...');
    
    if (!window.supabase) {
        console.error('❌ Библиотека Supabase не загружена');
        updateCloudStatusDisplay('❌ Библиотека не загружена');
        return false;
    }
    
    if (SUPABASE_URL.includes('ВАШ_ПРОЕКТ') || SUPABASE_ANON_KEY.includes('ВАШ_ANON_KEY')) {
        console.warn('⚠️ ВНИМАНИЕ! Не настроены ключи Supabase!');
        console.warn('Замените SUPABASE_URL и SUPABASE_ANON_KEY на ваши данные.');
        updateCloudStatusDisplay('⚠️ Настройте Supabase');
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Проверяем подключение
        const { error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
        
        if (error && error.code !== '42P01') {
            console.warn('⚠️ Ошибка проверки таблицы:', error.message);
        }
        
        isSupabaseReady = true;
        console.log('✅ Supabase подключен успешно!');
        updateCloudStatusDisplay('✅ Облако готово');
        
        // Загружаем данные
        await loadDataFromCloud();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к Supabase:', error.message);
        updateCloudStatusDisplay('❌ Ошибка подключения');
        isSupabaseReady = false;
        return false;
    }
}

// Загрузка данных из облака
async function loadDataFromCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        console.log('Облако не доступно');
        return false;
    }
    
    try {
        updateCloudStatusDisplay('📥 Загрузка...');
        
        // Загружаем пользователей
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (!usersError && users && users.length > 0) {
            localStorage.setItem('aktivchiki_users', JSON.stringify(users, null, 2));
            console.log(`📥 Загружено ${users.length} пользователей`);
            
            if (window.authManager) {
                window.authManager.users = users;
                if (typeof renderLeaderboard === 'function') renderLeaderboard();
                if (typeof renderProfile === 'function') renderProfile();
            }
        }
        
        // Загружаем мероприятия
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('*');
        
        if (!eventsError && events && events.length > 0) {
            localStorage.setItem('aktivchiki_events', JSON.stringify(events, null, 2));
            console.log(`📥 Загружено ${events.length} мероприятий`);
            if (typeof renderEvents === 'function') renderEvents();
        }
        
        updateCloudStatusDisplay(`✅ Загружено`);
        return true;
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        updateCloudStatusDisplay('❌ Ошибка');
        return false;
    }
}

// Загрузка локальных данных в облако
async function uploadLocalDataToCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        console.log('Облако не доступно');
        return false;
    }
    
    const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    if (users.length === 0 && events.length === 0) {
        console.log('Нет данных для синхронизации');
        return false;
    }
    
    updateCloudStatusDisplay('📤 Синхронизация...');
    
    let success = 0;
    for (const user of users) {
        try {
            const { error } = await supabaseClient.from('users').upsert(user, { onConflict: 'id' });
            if (!error) success++;
        } catch(e) {}
    }
    
    for (const event of events) {
        try {
            const { error } = await supabaseClient.from('events').upsert(event, { onConflict: 'id' });
            if (!error) success++;
        } catch(e) {}
    }
    
    updateCloudStatusDisplay(`✅ Синхронизировано`);
    console.log(`📤 Синхронизировано ${success} записей`);
    return true;
}

// Синхронизация всех данных
async function syncAllDataToCloud() {
    return await uploadLocalDataToCloud();
}

// Обновление статуса в интерфейсе
function updateCloudStatusDisplay(message) {
    const statusText = document.getElementById('cloudStatusText');
    const statusDiv = document.getElementById('cloudStatus');
    if (statusText && message) {
        statusText.innerHTML = message;
    }
    if (statusDiv && !message) {
        if (isSupabaseReady) {
            statusDiv.className = 'cloud-status online';
            statusText.innerHTML = '☁️ Онлайн';
        } else {
            statusDiv.className = 'cloud-status offline';
            statusText.innerHTML = '☁️ Офлайн';
        }
    }
}

// Экспорт функций
window.supabaseClient = supabaseClient;
window.isSupabaseReady = isSupabaseReady;
window.initSupabase = initSupabase;
window.loadDataFromCloud = loadDataFromCloud;
window.uploadLocalDataToCloud = uploadLocalDataToCloud;
window.syncAllDataToCloud = syncAllDataToCloud;

// Автозапуск
setTimeout(() => {
    initSupabase();
}, 1000);
});
let syncEnabled = true;
let lastSyncTime = null;
let syncInterval = null;

// Настройка подписки на изменения в реальном времени
async function setupRealtimeSubscription() {
    if (!supabaseClient || !isSupabaseReady) {
        console.log('⏳ Ожидание подключения к Supabase...');
        return false;
    }
    
    try {
        // Подписываемся на изменения в таблице users
        const usersSubscription = supabaseClient
            .channel('users-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'users' },
                (payload) => {
                    console.log('🔄 Изменение в пользователях:', payload.eventType);
                    handleRemoteChange(payload);
                }
            )
            .subscribe();
        
        // Подписываемся на изменения в таблице events
        const eventsSubscription = supabaseClient
            .channel('events-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'events' },
                (payload) => {
                    console.log('🔄 Изменение в мероприятиях:', payload.eventType);
                    handleRemoteEventChange(payload);
                }
            )
            .subscribe();
        
        console.log('✅ Realtime подписки активированы');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка настройки Realtime:', error);
        return false;
    }
}

// Обработка удалённых изменений пользователей
async function handleRemoteChange(payload) {
    if (!syncEnabled) return;
    
    const localUsers = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    const remoteUser = payload.new;
    
    switch(payload.eventType) {
        case 'INSERT':
            // Добавляем нового пользователя
            if (!localUsers.find(u => u.id === remoteUser.id)) {
                localUsers.push(remoteUser);
                localStorage.setItem('aktivchiki_users', JSON.stringify(localUsers, null, 2));
                console.log(`📥 Добавлен пользователь: ${remoteUser.username}`);
                showAutoSyncNotification(`👤 Новый участник: ${remoteUser.username}`);
                refreshUI();
            }
            break;
            
        case 'UPDATE':
            // Обновляем существующего пользователя
            const index = localUsers.findIndex(u => u.id === remoteUser.id);
            if (index !== -1 && JSON.stringify(localUsers[index]) !== JSON.stringify(remoteUser)) {
                localUsers[index] = remoteUser;
                localStorage.setItem('aktivchiki_users', JSON.stringify(localUsers, null, 2));
                console.log(`📝 Обновлён пользователь: ${remoteUser.username}`);
                
                // Если обновился текущий пользователь
                if (window.authManager?.currentUser?.id === remoteUser.id) {
                    window.authManager.currentUser = remoteUser;
                    sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(remoteUser));
                }
                refreshUI();
            }
            break;
            
        case 'DELETE':
            // Удаляем пользователя
            const filtered = localUsers.filter(u => u.id !== payload.old.id);
            localStorage.setItem('aktivchiki_users', JSON.stringify(filtered, null, 2));
            console.log(`🗑️ Удалён пользователь: ${payload.old.username}`);
            refreshUI();
            break;
    }
}

// Обработка удалённых изменений мероприятий
async function handleRemoteEventChange(payload) {
    if (!syncEnabled) return;
    
    const localEvents = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    const remoteEvent = payload.new;
    
    switch(payload.eventType) {
        case 'INSERT':
            if (!localEvents.find(e => e.id === remoteEvent.id)) {
                localEvents.push(remoteEvent);
                localStorage.setItem('aktivchiki_events', JSON.stringify(localEvents, null, 2));
                console.log(`📥 Добавлено мероприятие: ${remoteEvent.name}`);
                showAutoSyncNotification(`🎯 Новое мероприятие: ${remoteEvent.name}`);
                refreshUI();
            }
            break;
            
        case 'UPDATE':
            const index = localEvents.findIndex(e => e.id === remoteEvent.id);
            if (index !== -1) {
                localEvents[index] = remoteEvent;
                localStorage.setItem('aktivchiki_events', JSON.stringify(localEvents, null, 2));
                console.log(`📝 Обновлено мероприятие: ${remoteEvent.name}`);
                refreshUI();
            }
            break;
            
        case 'DELETE':
            const filtered = localEvents.filter(e => e.id !== payload.old.id);
            localStorage.setItem('aktivchiki_events', JSON.stringify(filtered, null, 2));
            console.log(`🗑️ Удалено мероприятие: ${payload.old.name}`);
            refreshUI();
            break;
    }
}

// Периодическая синхронизация (каждые 30 секунд - резервный вариант)
function startPeriodicSync() {
    if (syncInterval) clearInterval(syncInterval);
    
    syncInterval = setInterval(async () => {
        if (!isSupabaseReady) return;
        
        console.log('🔄 Периодическая синхронизация...');
        await syncFromCloud();
    }, 30000); // Каждые 30 секунд
}

// Принудительная синхронизация из облака
async function syncFromCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        // Загружаем пользователей
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (!usersError && users) {
            localStorage.setItem('aktivchiki_users', JSON.stringify(users, null, 2));
            if (window.authManager) {
                window.authManager.users = users;
                // Обновляем текущего пользователя, если он изменился
                if (window.authManager.currentUser) {
                    const updatedUser = users.find(u => u.id === window.authManager.currentUser.id);
                    if (updatedUser) {
                        window.authManager.currentUser = updatedUser;
                        sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(updatedUser));
                    }
                }
            }
        }
        
        // Загружаем мероприятия
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('*');
        
        if (!eventsError && events) {
            localStorage.setItem('aktivchiki_events', JSON.stringify(events, null, 2));
        }
        
        refreshUI();
        lastSyncTime = new Date();
        updateSyncStatus(true);
        return true;
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        updateSyncStatus(false);
        return false;
    }
}

// Автоматическая отправка изменений в облако
async function autoPushToCloud() {
    if (!supabaseClient || !isSupabaseReady || !syncEnabled) return false;
    
    try {
        const localUsers = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
        const localEvents = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
        
        // Получаем данные из облака для сравнения
        const { data: cloudUsers } = await supabaseClient
            .from('users')
            .select('id, updated_at');
        
        // Отправляем только изменённых пользователей
        for (const user of localUsers) {
            const cloudVersion = cloudUsers?.find(u => u.id === user.id);
            if (!cloudVersion || Date.now() - new Date(user.updated_at || 0) < 5000) {
                await supabaseClient.from('users').upsert(user, { onConflict: 'id' });
            }
        }
        
        console.log('📤 Авто-отправка выполнена');
        return true;
        
    } catch (error) {
        console.error('Ошибка авто-отправки:', error);
        return false;
    }
}

// Обновление интерфейса после синхронизации
function refreshUI() {
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
    if (typeof renderProfile === 'function') renderProfile();
    if (typeof renderEvents === 'function') renderEvents();
    if (typeof renderShop === 'function') renderShop();
    if (typeof renderAdminRegistrations === 'function') renderAdminRegistrations();
    if (typeof renderAdminUsers === 'function') renderAdminUsers();
}

// Показ уведомления о синхронизации
function showAutoSyncNotification(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = 'linear-gradient(135deg, #4ECDC4, #44B3AA)';
    toast.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Обновление статуса синхронизации в интерфейсе
function updateSyncStatus(success) {
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        if (success) {
            syncIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Синхронизировано';
            syncIndicator.style.color = '#00E676';
        } else {
            syncIndicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Синхронизация...';
            syncIndicator.style.color = '#FFE66D';
        }
        setTimeout(() => {
            if (syncIndicator) syncIndicator.innerHTML = '<i class="fas fa-cloud"></i> Авто-синхр.';
        }, 3000);
    }
}

// Включение/выключение синхронизации
function toggleSync(enabled) {
    syncEnabled = enabled;
    console.log(`Синхронизация ${enabled ? 'включена' : 'выключена'}`);
    if (!enabled) {
        if (syncInterval) clearInterval(syncInterval);
    } else {
        startPeriodicSync();
    }
}

// Переопределяем функцию saveUsers для автоматической синхронизации
const originalSaveUsers = window.authManager?.saveUsers;
if (window.authManager) {
    window.authManager.saveUsers = async function() {
        originalSaveUsers?.call(this);
        await autoPushToCloud();
    };
}

// Запуск автоматической синхронизации
async function startAutoSync() {
    await initSupabase();
    await setupRealtimeSubscription();
    startPeriodicSync();
    console.log('🔄 Автоматическая синхронизация запущена');
}

// Экспорт функций
window.startAutoSync = startAutoSync;
window.syncFromCloud = syncFromCloud;
window.autoPushToCloud = autoPushToCloud;
window.toggleSync = toggleSync;
window.setupRealtimeSubscription = setupRealtimeSubscription;
