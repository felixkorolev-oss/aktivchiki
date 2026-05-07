// Подключение к Supabase
// ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА ВАШИ ИЗ НАСТРОЕК SUPABASE!
const SUPABASE_URL = 'https://supabase.com/dashboard/project/krgtyuyoqxcocahjdphp/settings/api-keys';  // Ваш URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZ3R5dXlvcXhjb2NhaGpkcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc2OTQsImV4cCI6MjA5MzcyMzY5NH0.3ft8C6WGEZneNMtM9rTTAVIkGKWJPnjqh3IsivhF7o8';  // Ваш anon public key

// Инициализация клиента Supabase
let supabaseClient = null;
let isSupabaseReady = false;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;

// Инициализация Supabase с таймаутом
async function initSupabase() {
    return new Promise(async (resolve) => {
        if (isSupabaseReady) {
            updateCloudStatus('✅ Подключено к облаку');
            resolve(true);
            return;
        }
        
        if (!window.supabase) {
            updateCloudStatus('⏳ Загрузка библиотеки Supabase...');
            // Ждём загрузки библиотеки
            await waitForSupabaseLibrary();
        }
        
        if (!SUPBASE_URL.includes('ВАШ_ПРОЕКТ')) {
            updateCloudStatus('⚠️ Настройте Supabase: замените URL и KEY в файле supabase.js');
            resolve(false);
            return;
        }
        
        updateCloudStatus('🔄 Подключение к облаку...');
        
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            
            const connectPromise = (async () => {
                supabaseClient = window.supabase.createClient(SUPBASE_URL, SUPABASE_ANON_KEY);
                // Проверяем подключение
                const { data, error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
                
                if (error) {
                    throw error;
                }
                
                isSupabaseReady = true;
                updateCloudStatus('✅ Облако подключено! Данные синхронизируются.');
                console.log('✅ Supabase подключен');
                
                // Загружаем данные
                await loadDataFromCloud();
                
                return true;
            })();
            
            const result = await Promise.race([connectPromise, timeoutPromise]);
            resolve(result);
            
        } catch (error) {
            connectionAttempts++;
            console.error('Ошибка подключения к Supabase:', error);
            
            if (connectionAttempts < MAX_ATTEMPTS) {
                updateCloudStatus(`⚠️ Попытка ${connectionAttempts}/${MAX_ATTEMPTS}... Повтор через 3 секунды`);
                setTimeout(() => {
                    initSupabase().then(resolve);
                }, 3000);
            } else {
                updateCloudStatus('❌ Офлайн режим. Данные сохраняются локально.');
                resolve(false);
            }
        }
    });
}

// Ожидание загрузки библиотеки Supabase
function waitForSupabaseLibrary() {
    return new Promise((resolve) => {
        let attempts = 0;
        const checkInterval = setInterval(() => {
            if (window.supabase) {
                clearInterval(checkInterval);
                resolve();
            }
            attempts++;
            if (attempts > 50) { // 5 секунд максимум
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

// Обновление статуса в интерфейсе
function updateCloudStatus(message, isError = false) {
    const statusText = document.getElementById('cloudStatusText');
    if (statusText) {
        statusText.innerHTML = message;
        statusText.style.color = isError ? 'var(--danger)' : 'var(--secondary)';
    }
    console.log('☁️', message);
}

// Загрузка данных из облака
async function loadDataFromCloud() {
    if (!supabaseClient || !isSupabaseReady) {
        console.log('Облако не готово, используем локальные данные');
        return false;
    }
    
    try {
        updateCloudStatus('📥 Загрузка пользователей...');
        
        // Загружаем пользователей
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('*');
        
        if (usersError) throw usersError;
        
        if (users && users.length > 0) {
            console.log(`📥 Загружено ${users.length} пользователей из облака`);
            localStorage.setItem('aktivchiki_users', JSON.stringify(users));
            
            // Обновляем authManager
            if (window.authManager) {
                window.authManager.users = users;
                window.authManager.saveUsersToFile(users);
                window.authManager.updateUI();
                
                if (typeof renderLeaderboard === 'function') renderLeaderboard();
                if (typeof renderProfile === 'function') renderProfile();
            }
        } else {
            // Если в облаке нет данных, загружаем локальные
            console.log('В облаке нет данных, используем локальные');
            await uploadLocalDataToCloud();
        }
        
        // Загружаем мероприятия
        const { data: events, error: eventsError } = await supabaseClient
            .from('events')
            .select('*');
        
        if (!eventsError && events && events.length > 0) {
            console.log(`📥 Загружено ${events.length} мероприятий из облака`);
            localStorage.setItem('aktivchiki_events', JSON.stringify(events));
            if (typeof renderEvents === 'function') renderEvents();
        }
        
        updateCloudStatus(`✅ Загружено ${users?.length || 0} пользователей, ${events?.length || 0} мероприятий`);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error);
        updateCloudStatus('⚠️ Ошибка загрузки, работа в офлайн режиме', true);
        return false;
    }
}

// Загрузка локальных данных в облако
async function uploadLocalDataToCloud() {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    if (users.length === 0 && events.length === 0) return false;
    
    updateCloudStatus(`📤 Загрузка ${users.length} пользователей в облако...`);
    
    try {
        for (const user of users) {
            const { error } = await supabaseClient
                .from('users')
                .upsert(user, { onConflict: 'id' });
            if (error) console.error('Ошибка загрузки пользователя:', error);
        }
        
        for (const event of events) {
            const { error } = await supabaseClient
                .from('events')
                .upsert(event, { onConflict: 'id' });
            if (error) console.error('Ошибка загрузки мероприятия:', error);
        }
        
        updateCloudStatus(`✅ Загружено ${users.length} пользователей в облако`);
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки в облако:', error);
        return false;
    }
}

// Сохранение пользователя в облако
async function saveUserToCloud(user) {
    if (!supabaseClient || !isSupabaseReady) {
        console.log('Облако недоступно, данные сохранены локально');
        return false;
    }
    
    try {
        const { error } = await supabaseClient
            .from('users')
            .upsert(user, { onConflict: 'id' });
        
        if (error) throw error;
        console.log(`💾 Пользователь ${user.username} сохранён в облаке`);
        updateCloudStatus(`💾 Сохранён: ${user.username}`);
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения в облако:', error);
        return false;
    }
}

// Сохранение мероприятия в облако
async function saveEventToCloud(event) {
    if (!supabaseClient || !isSupabaseReady) return false;
    
    try {
        const { error } = await supabaseClient
            .from('events')
            .upsert(event, { onConflict: 'id' });
        
        if (error) throw error;
        console.log(`💾 Мероприятие ${event.name} сохранено в облаке`);
        return true;
        
    } catch (error) {
        console.error('Ошибка сохранения мероприятия:', error);
        return false;
    }
}

// Полная синхронизация (скачать из облака)
async function syncDownFromCloud() {
    updateCloudStatus('🔄 Синхронизация...');
    const result = await loadDataFromCloud();
    if (result) {
        alert('✅ Данные синхронизированы из облака! Страница обновится.');
        setTimeout(() => location.reload(), 1500);
    } else {
        alert('⚠️ Не удалось синхронизировать. Проверьте подключение к интернету.');
    }
}

// Полная синхронизация (загрузить в облако)
async function syncUpToCloud() {
    updateCloudStatus('📤 Загрузка данных в облако...');
    const result = await uploadLocalDataToCloud();
    if (result) {
        alert('✅ Данные загружены в облако! Теперь они доступны на других устройствах.');
    } else if (!supabaseClient || !isSupabaseReady) {
        alert('⚠️ Облако не подключено. Попробуйте нажать "Подключиться к облаку" сначала.');
    } else {
        alert('⚠️ Данные не загружены. Возможно, они уже есть в облаке.');
    }
}

// Очистка облачных данных
async function clearCloudData() {
    if (!confirm('⚠️ УДАЛИТЬ ВСЕ ДАННЫЕ ИЗ ОБЛАКА? Это действие нельзя отменить!')) return;
    
    if (!supabaseClient || !isSupabaseReady) {
        alert('❌ Облако не подключено');
        return;
    }
    
    updateCloudStatus('🗑️ Очистка облака...');
    
    try {
        await supabaseClient.from('users').delete().neq('id', 'none');
        await supabaseClient.from('events').delete().neq('id', 'none');
        updateCloudStatus('✅ Облако очищено');
        alert('✅ Облако очищено');
    } catch (error) {
        console.error('Ошибка очистки:', error);
        alert('❌ Ошибка очистки облака');
    }
}

// Проверка статуса подключения
function checkCloudStatus() {
    if (isSupabaseReady && supabaseClient) {
        updateCloudStatus('✅ Облако подключено');
        return true;
    } else {
        updateCloudStatus('❌ Офлайн режим');
        return false;
    }
}

// Экспорт глобальных функций
window.initSupabase = initSupabase;
window.syncDownFromCloud = syncDownFromCloud;
window.syncUpToCloud = syncUpToCloud;
window.clearCloudData = clearCloudData;
window.checkCloudStatus = checkCloudStatus;

// Автоматическое подключение при загрузке страницы
setTimeout(() => {
    initSupabase();
}, 2000);
