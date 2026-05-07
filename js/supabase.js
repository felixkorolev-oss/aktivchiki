// Подключение к Supabase
// ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА ВАШИ ИЗ НАСТРОЕК SUPABASE!
const SUPABASE_URL = 'https://supabase.com/dashboard/project/krgtyuyoqxcocahjdphp/settings/api-keys';  // Ваш URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3R5dXlvcXhjb2NhaGpkcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc2OTQsImV4cCI6MjA5MzcyMzY5NH0.3ft8C6WGEZneNMtM9rTTAVIkGKWJPnjqh3IsivhF7o8';  // Ваш anon public key

// Инициализация клиента Supabase
let supabaseClient = null;

async function initSupabase() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase подключен');
        
        // Загружаем данные из облака при старте
        await loadDataFromCloud();
        
        // Подписываемся на изменения в реальном времени
        subscribeToChanges();
    }
}

// Загрузка данных из облака
async function loadDataFromCloud() {
    if (!supabaseClient) return;
    
    try {
        // Загружаем пользователей
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (!usersError && users && users.length > 0) {
            console.log(`📥 Загружено ${users.length} пользователей из облака`);
            localStorage.setItem('aktivchiki_users', JSON.stringify(users));
        }
        
        // Загружаем мероприятия
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('*');
        
        if (!eventsError && events && events.length > 0) {
            console.log(`📥 Загружено ${events.length} мероприятий из облака`);
            localStorage.setItem('aktivchiki_events', JSON.stringify(events));
        }
        
        // Обновляем интерфейс
        if (window.authManager) {
            window.authManager.users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
            if (typeof renderLeaderboard === 'function') renderLeaderboard();
            if (typeof renderProfile === 'function') renderProfile();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error);
    }
}

// Сохранение данных в облако
async function saveUserToCloud(user) {
    if (!supabaseClient) return;
    
    try {
        // Проверяем, существует ли пользователь
        const { data: existing } = await supabaseClient
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();
        
        if (existing) {
            // Обновляем существующего
            await supabaseClient
                .from('users')
                .update(user)
                .eq('id', user.id);
        } else {
            // Создаём нового
            await supabaseClient
                .from('users')
                .insert([user]);
        }
        
        console.log(`💾 Пользователь ${user.username} сохранён в облаке`);
    } catch (error) {
        console.error('Ошибка сохранения в облако:', error);
    }
}

// Сохранение мероприятия в облако
async function saveEventToCloud(event) {
    if (!supabaseClient) return;
    
    try {
        const { data: existing } = await supabaseClient
            .from('events')
            .select('id')
            .eq('id', event.id)
            .single();
        
        if (existing) {
            await supabaseClient
                .from('events')
                .update(event)
                .eq('id', event.id);
        } else {
            await supabaseClient
                .from('events')
                .insert([event]);
        }
        
        console.log(`💾 Мероприятие ${event.name} сохранено в облаке`);
    } catch (error) {
        console.error('Ошибка сохранения мероприятия:', error);
    }
}

// Синхронизация всех данных
async function syncAllDataToCloud() {
    if (!supabaseClient) {
        alert('⏳ Подключение к облаку... Подождите');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    alert(`🔄 Синхронизация: ${users.length} пользователей, ${events.length} мероприятий`);
    
    for (const user of users) {
        await saveUserToCloud(user);
    }
    
    for (const event of events) {
        await saveEventToCloud(event);
    }
    
    alert('✅ Синхронизация завершена! Данные сохранены в облаке.');
}

// Подписка на изменения в реальном времени
function subscribeToChanges() {
    if (!supabaseClient) return;
    
    // Слушаем изменения пользователей
    supabaseClient
        .channel('users_changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'users' },
            (payload) => {
                console.log('🔄 Изменение в пользователях:', payload);
                loadDataFromCloud(); // Перезагружаем данные
            }
        )
        .subscribe();
    
    // Слушаем изменения мероприятий
    supabaseClient
        .channel('events_changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'events' },
            (payload) => {
                console.log('🔄 Изменение в мероприятиях:', payload);
                loadDataFromCloud();
            }
        )
        .subscribe();
}

// Очистка облачных данных
async function clearCloudData() {
    if (!confirm('⚠️ Удалить ВСЕ данные из облака? Это действие необратимо!')) return;
    
    if (!supabaseClient) return;
    
    await supabaseClient.from('users').delete().neq('id', 'none');
    await supabaseClient.from('events').delete().neq('id', 'none');
    
    alert('🗑️ Облачные данные удалены');
}

// Экспорт глобальных функций
window.initSupabase = initSupabase;
window.syncAllDataToCloud = syncAllDataToCloud;
window.clearCloudData = clearCloudData;
