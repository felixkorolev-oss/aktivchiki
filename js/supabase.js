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
