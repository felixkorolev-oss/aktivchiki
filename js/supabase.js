// ============================================
// НАСТРОЙКИ SUPABASE - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
// ============================================
const SUPABASE_URL = 'https://krgtyuyoqxcocahjdphp.supabase.co';  // ЗАМЕНИТЕ!
const SUPABASE_ANON_KEY = 'sb_publishable_jfi8QC2O0-tPbueBA_FXbg_Kq3ve-X7';  // ЗАМЕНИТЕ!

// ============================================
let supabaseClient = null;
let isSupabaseReady = false;

// Инициализация
async function initSupabase() {
    console.log('🔄 Инициализация Supabase...');
    
    if (!window.supabase) {
        console.error('❌ Библиотека Supabase не загружена');
        updateStatus('❌ Библиотека не загружена', true);
        return false;
    }
    
    if (SUPABASE_URL.includes('ВАШ_ПРОЕКТ')) {
        console.warn('⚠️ Не настроены ключи Supabase!');
        updateStatus('⚠️ Настройте Supabase', true);
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
        
        isSupabaseReady = true;
        console.log('✅ Supabase подключен!');
        updateStatus('✅ Облако готово');
        
        // Загружаем данные
        await loadFromCloud();
        return true;
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        updateStatus('❌ Ошибка', true);
        return false;
    }
}

// Загрузка из облака
async function loadFromCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        const { data: users } = await supabaseClient.from('users').select('*');
        if (users && users.length > 0) {
            localStorage.setItem('aktivchiki_users', JSON.stringify(users, null, 2));
            if (window.authManager) {
                window.authManager.users = users;
                if (typeof renderLeaderboard === 'function') renderLeaderboard();
                if (typeof renderProfile === 'function') renderProfile();
            }
            console.log(`📥 Загружено ${users.length} пользователей`);
        }
        
        const { data: events } = await supabaseClient.from('events').select('*');
        if (events && events.length > 0) {
            localStorage.setItem('aktivchiki_events', JSON.stringify(events, null, 2));
            if (typeof renderEvents === 'function') renderEvents();
            console.log(`📥 Загружено ${events.length} мероприятий`);
        }
        return true;
    } catch(e) {
        console.error('Ошибка загрузки:', e);
        return false;
    }
}

// Сохранение в облако
async function saveToCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    for (const user of users) {
        await supabaseClient.from('users').upsert(user, { onConflict: 'id' });
    }
    for (const event of events) {
        await supabaseClient.from('events').upsert(event, { onConflict: 'id' });
    }
    console.log('📤 Данные сохранены в облако');
    return true;
}

// Принудительная синхронизация
async function forceSync() {
    updateStatus('🔄 Синхронизация...');
    const success = await loadFromCloud();
    if (success) {
        updateStatus('✅ Синхронизировано');
        if (window.showToast) window.showToast('✅ Данные синхронизированы!', 'success');
        setTimeout(() => updateStatus('✅ Облако готово'), 2000);
    } else {
        updateStatus('❌ Ошибка', true);
    }
}

function updateStatus(msg, isError = false) {
    const el = document.getElementById('cloudStatusText');
    if (el) el.innerHTML = msg;
    const div = document.getElementById('cloudStatus');
    if (div) div.className = isError ? 'cloud-status offline' : 'cloud-status online';
}

// Экспорт
window.supabaseClient = supabaseClient;
window.isSupabaseReady = isSupabaseReady;
window.initSupabase = initSupabase;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
window.forceSync = forceSync;

// Автозапуск
setTimeout(initSupabase, 1500);
