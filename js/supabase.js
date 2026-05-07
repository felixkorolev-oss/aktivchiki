// ============================================
// НАСТРОЙКИ SUPABASE - ВСТАВЬТЕ ВАШИ ДАННЫЕ!
// ============================================
const SUPABASE_URL = 'https://krgtyuyoqxcocahjdphp.supabase.co';  // ЗАМЕНИТЕ!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3R5dXlvcXhjb2NhaGpkcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc2OTQsImV4cCI6MjA5MzcyMzY5NH0.3ft8C6WGEZneNMtM9rTTAVIkGKWJPnjqh3IsivhF7o8';  // ЗАМЕНИТЕ!

// ============================================
let supabaseClient = null;
let isSupabaseReady = false;
let retryCount = 0;
const MAX_RETRIES = 3;

// Инициализация с повторными попытками
async function initSupabase() {
    console.log('🔄 Подключение к Supabase...');
    updateStatus('🔄 Подключение...');
    
    if (!window.supabase) {
        console.error('❌ Библиотека не загружена');
        updateStatus('❌ Ошибка', true);
        return false;
    }
    
    if (SUPABASE_URL.includes('ВАШ_ПРОЕКТ')) {
        console.error('❌ Настройте SUPABASE_URL и SUPABASE_ANON_KEY в файле supabase.js');
        updateStatus('⚠️ Настройте Supabase', true);
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });
        
        // Проверка подключения с таймаутом 10 секунд
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const { error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
        clearTimeout(timeoutId);
        
        if (error && error.code === '42P01') {
            console.warn('⚠️ Таблица users не найдена, создайте её через SQL');
            updateStatus('⚠️ Создайте таблицы', true);
            return false;
        }
        
        isSupabaseReady = true;
        retryCount = 0;
        console.log('✅ Supabase подключен!');
        updateStatus('✅ Онлайн');
        
        // Настраиваем автоматическую синхронизацию
        await setupAutoSync();
        await loadFromCloud();
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        retryCount++;
        
        if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Повторная попытка через ${retryCount * 2} секунд...`);
            updateStatus(`🔄 Повтор ${retryCount}/${MAX_RETRIES}...`);
            setTimeout(initSupabase, retryCount * 2000);
        } else {
            updateStatus('📱 Офлайн режим', true);
        }
        return false;
    }
}

// Настройка автоматической синхронизации
async function setupAutoSync() {
    if (!supabaseClient || !isSupabaseReady) return;
    
    try {
        // Подписка на изменения пользователей
        supabaseClient
            .channel('users_sync')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'users' },
                async (payload) => {
                    console.log('🔄 Изменение в users:', payload.eventType);
                    await handleUserChange(payload);
                }
            )
            .subscribe();
        
        // Подписка на изменения мероприятий
        supabaseClient
            .channel('events_sync')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'events' },
                async (payload) => {
                    console.log('🔄 Изменение в events:', payload.eventType);
                    await handleEventChange(payload);
                }
            )
            .subscribe();
        
        console.log('✅ Realtime синхронизация настроена');
        
        // Периодическая синхронизация (каждые 30 секунд)
        setInterval(async () => {
            if (isSupabaseReady) {
                await syncFromCloud();
            }
        }, 30000);
        
    } catch(e) {
        console.error('Ошибка настройки Realtime:', e);
    }
}

// Обработка изменений пользователей
async function handleUserChange(payload) {
    if (!isSupabaseReady) return;
    
    const localUsers = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    
    if (payload.eventType === 'INSERT' && payload.new) {
        if (!localUsers.find(u => u.id === payload.new.id)) {
            localUsers.push(payload.new);
            localStorage.setItem('aktivchiki_users', JSON.stringify(localUsers, null, 2));
            console.log(`📥 Новый пользователь: ${payload.new.username}`);
            if (window.showToast) window.showToast(`👤 Новый участник: ${payload.new.username}`, 'info');
            refreshUI();
        }
    }
    
    if (payload.eventType === 'UPDATE' && payload.new) {
        const index = localUsers.findIndex(u => u.id === payload.new.id);
        if (index !== -1) {
            localUsers[index] = payload.new;
            localStorage.setItem('aktivchiki_users', JSON.stringify(localUsers, null, 2));
            console.log(`📝 Обновлён: ${payload.new.username}`);
            
            if (window.authManager?.currentUser?.id === payload.new.id) {
                window.authManager.currentUser = payload.new;
                sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(payload.new));
            }
            refreshUI();
        }
    }
    
    if (payload.eventType === 'DELETE' && payload.old) {
        const filtered = localUsers.filter(u => u.id !== payload.old.id);
        localStorage.setItem('aktivchiki_users', JSON.stringify(filtered, null, 2));
        console.log(`🗑️ Удалён пользователь: ${payload.old.username}`);
        refreshUI();
    }
}

// Обработка изменений мероприятий
async function handleEventChange(payload) {
    if (!isSupabaseReady) return;
    
    const localEvents = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    if (payload.eventType === 'INSERT' && payload.new) {
        if (!localEvents.find(e => e.id === payload.new.id)) {
            localEvents.push(payload.new);
            localStorage.setItem('aktivchiki_events', JSON.stringify(localEvents, null, 2));
            console.log(`📥 Новое мероприятие: ${payload.new.name}`);
            refreshUI();
        }
    }
    
    if (payload.eventType === 'UPDATE' && payload.new) {
        const index = localEvents.findIndex(e => e.id === payload.new.id);
        if (index !== -1) {
            localEvents[index] = payload.new;
            localStorage.setItem('aktivchiki_events', JSON.stringify(localEvents, null, 2));
            console.log(`📝 Обновлено: ${payload.new.name}`);
            refreshUI();
        }
    }
}

// Загрузка из облака
async function loadFromCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        updateStatus('📥 Загрузка...');
        
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (!usersError && users && users.length > 0) {
            localStorage.setItem('aktivchiki_users', JSON.stringify(users, null, 2));
            console.log(`📥 Загружено ${users.length} пользователей`);
            
            if (window.authManager) {
                window.authManager.users = users;
                if (window.authManager.currentUser) {
                    const updated = users.find(u => u.id === window.authManager.currentUser.id);
                    if (updated) {
                        window.authManager.currentUser = updated;
                        sessionStorage.setItem('aktivchiki_currentUser', JSON.stringify(updated));
                    }
                }
            }
        }
        
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('*');
        
        if (!eventsError && events) {
            localStorage.setItem('aktivchiki_events', JSON.stringify(events, null, 2));
            console.log(`📥 Загружено ${events.length} мероприятий`);
        }
        
        refreshUI();
        updateStatus('✅ Синхронизировано');
        setTimeout(() => updateStatus('✅ Онлайн'), 2000);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        updateStatus('❌ Ошибка', true);
        return false;
    }
}

// Отправка в облако
async function syncToCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        if (window.showToast) window.showToast('❌ Облако недоступно, проверьте интернет', 'error');
        return false;
    }
    
    try {
        updateStatus('📤 Отправка...');
        
        const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
        const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
        
        for (const user of users) {
            await supabaseClient.from('users').upsert(user, { onConflict: 'id' });
        }
        
        for (const event of events) {
            await supabaseClient.from('events').upsert(event, { onConflict: 'id' });
        }
        
        console.log(`📤 Отправлено ${users.length} пользователей, ${events.length} мероприятий`);
        updateStatus('✅ Отправлено');
        if (window.showToast) window.showToast('✅ Данные отправлены в облако!', 'success');
        
        setTimeout(() => updateStatus('✅ Онлайн'), 2000);
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        updateStatus('❌ Ошибка', true);
        return false;
    }
}

// Принудительная синхронизация (загрузить из облака)
async function forceSync() {
    return await loadFromCloud();
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
function updateStatus(msg, isError = false) {
    const statusText = document.getElementById('cloudStatusText');
    const statusDiv = document.getElementById('cloudStatus');
    if (statusText) statusText.innerHTML = msg;
    if (statusDiv) {
        if (isError) statusDiv.className = 'cloud-status offline';
        else if (msg.includes('✅')) statusDiv.className = 'cloud-status online';
        else statusDiv.className = 'cloud-status sync';
    }
}

// Экспорт
window.supabaseClient = supabaseClient;
window.isSupabaseReady = isSupabaseReady;
window.initSupabase = initSupabase;
window.loadFromCloud = loadFromCloud;
window.syncToCloud = syncToCloud;
window.forceSync = forceSync;

// Автозапуск
setTimeout(initSupabase, 1000);
console.log('🔄 Модуль Supabase загружен');
