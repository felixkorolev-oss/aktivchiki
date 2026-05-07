// Подключение к Supabase
// ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА ВАШИ ИЗ НАСТРОЕК SUPABASE!
const SUPABASE_URL = 'https://supabase.com/dashboard/project/krgtyuyoqxcocahjdphp/settings/api-keys';  // Ваш URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3R5dXlvcXhjb2NhaGpkcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc2OTQsImV4cCI6MjA5MzcyMzY5NH0.3ft8C6WGEZneNMtM9rTTAVIkGKWJPnjqh3IsivhF7o8';  // Ваш anon public key

// Инициализация клиента Supabase
let supabaseClient = null;
let isSupabaseReady = false;

async function initSupabase() {
    if (!window.supabase) {
        console.log('⏳ Ожидание загрузки Supabase...');
        return false;
    }
    
    if (!SUPABASE_URL.includes('ВАШ_ПРОЕКТ')) {
        console.warn('⚠️ Настройте SUPABASE_URL и SUPABASE_ANON_KEY в файле supabase.js');
        updateCloudStatus('⚠️ Настройте Supabase', true);
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Проверяем подключение
        const { error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        isSupabaseReady = true;
        console.log('✅ Supabase подключен');
        updateCloudStatus('✅ Облако готово');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка подключения к Supabase:', error);
        updateCloudStatus('❌ Ошибка подключения', true);
        return false;
    }
}

function updateCloudStatus(message, isError = false) {
    const statusText = document.getElementById('cloudStatusText');
    const statusDiv = document.getElementById('cloudStatus');
    if (statusText) {
        statusText.innerHTML = message;
        if (statusDiv) {
            statusDiv.className = isError ? 'cloud-status offline' : 'cloud-status online';
        }
    }
}

async function loadDataFromCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        console.log('Облако не доступно');
        return false;
    }
    
    try {
        // Загружаем пользователей
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (usersError) throw usersError;
        
        if (users && users.length > 0) {
            localStorage.setItem('aktivchiki_users', JSON.stringify(users, null, 2));
            console.log(`📥 Загружено ${users.length} пользователей из облака`);
            
            if (window.authManager) {
                window.authManager.users = users;
                window.authManager.saveUsersToLocal();
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
            console.log(`📥 Загружено ${events.length} мероприятий из облака`);
            if (typeof renderEvents === 'function') renderEvents();
        }
        
        updateCloudStatus(`✅ Загружено ${users?.length || 0} пользователей`);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error);
        updateCloudStatus('❌ Ошибка загрузки', true);
        return false;
    }
}

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

async function syncAllUsersToCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        alert('Облако не доступно. Проверьте подключение к интернету.');
        return false;
    }
    
    const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    let successCount = 0;
    
    for (const user of users) {
        if (await syncUserToCloud(user)) successCount++;
    }
    
    alert(`✅ Синхронизировано ${successCount} из ${users.length} пользователей`);
    updateCloudStatus(`✅ Синхронизировано ${successCount}`);
    return successCount > 0;
}

async function syncAllEventsToCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    let successCount = 0;
    
    for (const event of events) {
        if (await syncEventToCloud(event)) successCount++;
    }
    
    console.log(`📤 Синхронизировано ${successCount} мероприятий`);
    return successCount > 0;
}

async function syncAllDataToCloud() {
    await syncAllUsersToCloud();
    await syncAllEventsToCloud();
    updateCloudStatus('✅ Данные синхронизированы');
}

// Экспорт в глобальную область
window.supabaseClient = supabaseClient;
window.isSupabaseReady = isSupabaseReady;
window.initSupabase = initSupabase;
window.loadDataFromCloud = loadDataFromCloud;
window.syncUserToCloud = syncUserToCloud;
window.syncEventToCloud = syncEventToCloud;
window.syncAllUsersToCloud = syncAllUsersToCloud;
window.syncAllEventsToCloud = syncAllEventsToCloud;
window.syncAllDataToCloud = syncAllDataToCloud;

// Автоматическое подключение
setTimeout(() => {
    initSupabase().then(() => {
        if (isSupabaseReady && localStorage.getItem('aktivchiki_synced') !== 'true') {
            loadDataFromCloud();
            localStorage.setItem('aktivchiki_synced', 'true');
        }
    });
}, 2000);
