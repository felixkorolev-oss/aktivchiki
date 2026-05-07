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

// Функция для отображения статуса в интерфейсе
function updateCloudStatusUI(message, isError = false) {
    const statusDiv = document.getElementById('cloudStatus');
    const statusText = document.getElementById('cloudStatusText');
    if (statusText) {
        statusText.innerHTML = message;
        if (statusDiv) {
            statusDiv.className = isError ? 'cloud-status offline' : 'cloud-status online';
        }
    }
    console.log('☁️', message);
}

// Инициализация подключения к Supabase
async function initSupabase() {
    updateCloudStatusUI('🔄 Подключение к облаку...');
    
    // Проверяем, загружена ли библиотека Supabase
    if (!window.supabase) {
        console.error('Библиотека Supabase не загружена');
        updateCloudStatusUI('❌ Библиотека не загружена, работа в офлайн режиме', true);
        return false;
    }
    
    // Проверяем, настроены ли ключи
    if (SUPABASE_URL.includes('ВАШ_ПРОЕКТ') || SUPABASE_ANON_KEY.includes('ВАШ_ANON_KEY')) {
        console.warn('⚠️ ВНИМАНИЕ! Не настроены ключи Supabase!');
        console.warn('Замените SUPABASE_URL и SUPABASE_ANON_KEY в файле supabase.js на ваши данные.');
        updateCloudStatusUI('⚠️ Настройте Supabase в файле supabase.js', true);
        return false;
    }
    
    try {
        // Создаём клиент Supabase
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Проверяем подключение (делаем простой запрос)
        const { error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
        
        if (error) {
            // Если таблица не существует, это не страшно - просто пробуем подключиться
            if (error.code === '42P01') {
                console.log('Таблица users не найдена, но подключение установлено');
            } else {
                throw error;
            }
        }
        
        isSupabaseReady = true;
        updateCloudStatusUI('✅ Облако подключено!');
        console.log('✅ Supabase успешно подключен');
        
        // Автоматически загружаем данные из облака
        await loadDataFromCloud();
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка подключения к Supabase:', error.message);
        updateCloudStatusUI('❌ Ошибка подключения, работа в офлайн режиме', true);
        isSupabaseReady = false;
        return false;
    }
}

// Загрузка данных из облака
async function loadDataFromCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        updateCloudStatusUI('❌ Облако не доступно, использую локальные данные', true);
        return false;
    }
    
    try {
        updateCloudStatusUI('📥 Загрузка данных из облака...');
        
        // Загружаем пользователей
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (usersError) {
            if (usersError.code === '42P01') {
                updateCloudStatusUI('⚠️ Таблица users не создана. Выполните SQL скрипт в Supabase.', true);
            }
            throw usersError;
        }
        
        if (users && users.length > 0) {
            localStorage.setItem('aktivchiki_users', JSON.stringify(users, null, 2));
            console.log(`📥 Загружено ${users.length} пользователей из облака`);
            
            // Обновляем данные в authManager
            if (window.authManager) {
                window.authManager.users = users;
                window.authManager.saveUsersToLocal();
                if (typeof renderLeaderboard === 'function') renderLeaderboard();
                if (typeof renderProfile === 'function') renderProfile();
            }
        } else {
            // Если в облаке нет данных, загружаем локальные в облако
            await uploadLocalDataToCloud();
        }
        
        // Загружаем мероприятия
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('*');
        
        if (!eventsError && events && events.length > 0) {
            localStorage.setItem('aktivchiki_events', JSON.stringify(events, null, 2));
            console.log(`📥 Загружено ${events.length} мероприятий из облака`);
            if (typeof renderEvents === 'function') renderEvents();
        }
        
        updateCloudStatusUI(`✅ Загружено ${users?.length || 0} пользователей, ${events?.length || 0} мероприятий`);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error.message);
        updateCloudStatusUI('❌ Ошибка загрузки, работа в офлайн режиме', true);
        return false;
    }
}

// Загрузка локальных данных в облако
async function uploadLocalDataToCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    if (users.length === 0 && events.length === 0) return false;
    
    updateCloudStatusUI(`📤 Загрузка ${users.length} пользователей, ${events.length} мероприятий в облако...`);
    
    let userSuccess = 0;
    let eventSuccess = 0;
    
    for (const user of users) {
        try {
            const { error } = await supabaseClient
                .from('users')
                .upsert(user, { onConflict: 'id' });
            if (!error) userSuccess++;
        } catch(e) { console.error('Ошибка загрузки пользователя:', e); }
    }
    
    for (const event of events) {
        try {
            const { error } = await supabaseClient
                .from('events')
                .upsert(event, { onConflict: 'id' });
            if (!error) eventSuccess++;
        } catch(e) { console.error('Ошибка загрузки мероприятия:', e); }
    }
    
    updateCloudStatusUI(`✅ Загружено: ${userSuccess} пользователей, ${eventSuccess} мероприятий`);
    return userSuccess > 0 || eventSuccess > 0;
}

// Синхронизация (отправка данных в облако)
async function syncAllDataToCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        updateCloudStatusUI('❌ Облако не доступно', true);
        alert('❌ Облако не доступно. Проверьте подключение к интернету и настройки Supabase.');
        return false;
    }
    
    updateCloudStatusUI('📤 Синхронизация с облаком...');
    const result = await uploadLocalDataToCloud();
    
    if (result) {
        updateCloudStatusUI('✅ Данные синхронизированы!');
        alert('✅ Данные успешно синхронизированы с облаком!');
    } else {
        updateCloudStatusUI('⚠️ Нет данных для синхронизации', true);
        alert('⚠️ Нет данных для синхронизации');
    }
    
    return result;
}

// Загрузка из облака
async function downloadFromCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        updateCloudStatusUI('❌ Облако не доступно', true);
        alert('❌ Облако не доступно. Проверьте подключение к интернету и настройки Supabase.');
        return false;
    }
    
    const result = await loadDataFromCloud();
    if (result) {
        alert('✅ Данные загружены из облака! Страница обновится.');
        setTimeout(() => location.reload(), 1500);
    } else {
        alert('⚠️ Не удалось загрузить данные из облака');
    }
    return result;
}

// Синхронизация одного пользователя
async function syncUserToCloud(user) {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .upsert(user, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch(e) {
        console.error('Ошибка синхронизации пользователя:', e);
        return false;
    }
}

// Синхронизация одного мероприятия
async function syncEventToCloud(event) {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        const { error } = await supabaseClient
            .from('events')
            .upsert(event, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch(e) {
        console.error('Ошибка синхронизации мероприятия:', e);
        return false;
    }
}

// Проверка статуса
function isCloudReady() {
    return isSupabaseReady && supabaseClient !== null;
}

// Экспорт в глобальную область видимости
window.supabaseClient = supabaseClient;
window.isSupabaseReady = isSupabaseReady;
window.initSupabase = initSupabase;
window.loadDataFromCloud = loadDataFromCloud;
window.uploadLocalDataToCloud = uploadLocalDataToCloud;
window.syncAllDataToCloud = syncAllDataToCloud;
window.downloadFromCloud = downloadFromCloud;
window.syncUserToCloud = syncUserToCloud;
window.syncEventToCloud = syncEventToCloud;
window.isCloudReady = isCloudReady;

// Автоматическое подключение после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initSupabase();
    }, 1000);
});
