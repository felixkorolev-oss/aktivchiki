// ============================================
// НАСТРОЙКИ SUPABASE - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
// ============================================
// 1. Зайдите в панель управления Supabase
// 2. Project Settings → API
// 3. Скопируйте Project URL и anon public key
// ============================================

const SUPABASE_URL = 'https://krgtyuyoqxcocahjdphp.supabase.co';  // ЗАМЕНИТЕ НА ВАШ URL!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3R5dXlvcXhjb2NhaGpkcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc2OTQsImV4cCI6MjA5MzcyMzY5NH0.3ft8C6WGEZneNMtM9rTTAVIkGKWJPnjqh3IsivhF7o8';  // ЗАМЕНИТЕ НА ВАШ KEY!

// ============================================
// АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ
// ============================================

let supabaseClient = null;
let isSupabaseReady = false;
let syncEnabled = true;
let realtimeSubscription = null;
let syncInterval = null;

// Инициализация Supabase
async function initSupabase() {
    console.log('🔄 Инициализация Supabase...');
    updateCloudStatusDisplay('🔄 Подключение...');
    
    if (!window.supabase) {
        console.error('❌ Библиотека Supabase не загружена');
        updateCloudStatusDisplay('❌ Библиотека не загружена', true);
        return false;
    }
    
    if (SUPABASE_URL.includes('ВАШ_ПРОЕКТ') || SUPABASE_ANON_KEY.includes('ВАШ_ANON_KEY')) {
        console.warn('⚠️ ВНИМАНИЕ! Не настроены ключи Supabase!');
        console.warn('Замените SUPABASE_URL и SUPABASE_ANON_KEY на ваши данные.');
        updateCloudStatusDisplay('⚠️ Настройте Supabase', true);
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
        
        // Запускаем автоматическую синхронизацию
        await setupAutoSync();
        await loadDataFromCloud();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к Supabase:', error.message);
        updateCloudStatusDisplay('❌ Ошибка подключения', true);
        isSupabaseReady = false;
        return false;
    }
}

// Настройка автоматической синхронизации
async function setupAutoSync() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        // Подписываемся на изменения в реальном времени
        if (realtimeSubscription) {
            await supabaseClient.removeChannel(realtimeSubscription);
        }
        
        realtimeSubscription = supabaseClient
            .channel('aktivchiki-sync')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'users' },
                (payload) => {
                    console.log('🔄 Изменение в пользователях:', payload.eventType);
                    handleRemoteChange(payload);
                }
            )
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'events' },
                (payload) => {
                    console.log('🔄 Изменение в мероприятиях:', payload.eventType);
                    handleRemoteEventChange(payload);
                }
            )
            .subscribe();
        
        // Периодическая синхронизация (каждые 30 секунд)
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(async () => {
            if (syncEnabled && isSupabaseReady) {
                await syncFromCloud();
            }
        }, 30000);
        
        console.log('✅ Автоматическая синхронизация настроена');
        updateSyncIndicator(true);
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка настройки синхронизации:', error);
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
            if (!localUsers.find(u => u.id === remoteUser.id)) {
                localUsers.push(remoteUser);
                localStorage.setItem('aktivchiki_users', JSON.stringify(localUsers, null, 2));
                console.log(`📥 Добавлен пользователь: ${remoteUser.username}`);
                showAutoNotification(`👤 Новый участник: ${remoteUser.username}`);
                refreshUI();
            }
            break;
            
        case 'UPDATE':
            const index = localUsers.findIndex(u => u.id === remoteUser.id);
            if (index !== -1 && JSON.stringify(localUsers[index]) !== JSON.stringify(remoteUser)) {
                localUsers[index] = remoteUser;
                localStorage.setItem('aktivchiki_users', JSON.stringify(localUsers, null, 2));
                console.log(`📝 Обновлён пользователь: ${remoteUser.username}`);
                
                if (window.authManager?.currentUser?.id === remoteUser.id) {
                    window.authManager.currentUser = remoteUser;
                    sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(remoteUser));
                }
                refreshUI();
            }
            break;
            
        case 'DELETE':
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
                showAutoNotification(`🎯 Новое мероприятие: ${remoteEvent.name}`);
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

// Синхронизация из облака
async function syncFromCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        updateSyncIndicator(false);
        
        // Загружаем пользователей
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (!usersError && users) {
            localStorage.setItem('aktivchiki_users', JSON.stringify(users, null, 2));
            if (window.authManager) {
                window.authManager.users = users;
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
        updateSyncIndicator(true);
        return true;
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        updateSyncIndicator(false);
        return false;
    }
}

// Отправка изменений в облако
async function pushToCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        const localUsers = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
        const localEvents = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
        
        for (const user of localUsers) {
            await supabaseClient.from('users').upsert(user, { onConflict: 'id' });
        }
        
        for (const event of localEvents) {
            await supabaseClient.from('events').upsert(event, { onConflict: 'id' });
        }
        
        console.log('📤 Данные отправлены в облако');
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        return false;
    }
}

// Загрузка данных из облака
async function loadDataFromCloud() {
    return await syncFromCloud();
}

// Принудительная синхронизация
async function forceSync() {
    updateCloudStatusDisplay('🔄 Синхронизация...');
    const success = await syncFromCloud();
    if (success) {
        updateCloudStatusDisplay('✅ Синхронизировано');
        if (typeof window.showToast === 'function') {
            window.showToast('✅ Данные синхронизированы с облаком!', 'success');
        }
        setTimeout(() => updateCloudStatusDisplay('✅ Облако готово'), 3000);
    } else {
        updateCloudStatusDisplay('❌ Ошибка синхронизации', true);
    }
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

// Показ уведомления
function showAutoNotification(message) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, 'info');
    }
}

// Обновление статуса синхронизации в интерфейсе
function updateSyncIndicator(success) {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        if (success) {
            indicator.innerHTML = '<i class="fas fa-check-circle"></i> <span>Синхр.</span>';
            indicator.style.color = '#00E676';
        } else {
            indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> <span>Синхр...</span>';
            indicator.style.color = '#FFE66D';
        }
        setTimeout(() => {
            if (indicator && isSupabaseReady) {
                indicator.innerHTML = '<i class="fas fa-cloud"></i> <span>Авто-синхр.</span>';
            }
        }, 3000);
    }
}

// Обновление статуса облака
function updateCloudStatusDisplay(message, isError = false) {
    const statusText = document.getElementById('cloudStatusText');
    const statusDiv = document.getElementById('cloudStatus');
    if (statusText && message && !message.includes('✅') && !message.includes('❌')) {
        statusText.innerHTML = message;
    } else if (statusText && message) {
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
    if (isError && statusDiv) {
        statusDiv.className = 'cloud-status offline';
    } else if (!isError && isSupabaseReady && statusDiv) {
        statusDiv.className = 'cloud-status online';
    }
}

// Переподключение
async function checkAndReconnect() {
    updateCloudStatusDisplay('🔄 Переподключение...');
    isSupabaseReady = false;
    await initSupabase();
}

// Экспорт функций
window.supabaseClient = supabaseClient;
window.isSupabaseReady = isSupabaseReady;
window.initSupabase = initSupabase;
window.loadDataFromCloud = loadDataFromCloud;
window.pushToCloud = pushToCloud;
window.syncFromCloud = syncFromCloud;
window.forceSync = forceSync;
window.checkAndReconnect = checkAndReconnect;

// Автозапуск
setTimeout(() => {
    initSupabase();
}, 1000);

console.log('🔄 Модуль Supabase загружен, авто-синхронизация будет запущена после подключения');
