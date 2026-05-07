// Управление файловым хранилищем (только для админов)

function exportAllData() {
    const users = localStorage.getItem('aktivchiki_users');
    const events = localStorage.getItem('aktivchiki_events');
    
    // Парсим для красивого форматирования
    const usersData = users ? JSON.parse(users) : [];
    const eventsData = events ? JSON.parse(events) : [];
    
    const data = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        platform: 'Активчики',
        users: usersData,
        events: eventsData,
        stats: {
            totalUsers: usersData.length,
            totalEvents: eventsData.length,
            totalAdmins: usersData.filter(u => u.isAdmin).length
        }
    };
    
    // Красивое форматирование с отступами
    const prettyJson = JSON.stringify(data, null, 2);
    const blob = new Blob([prettyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aktivchiki_backup_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    window.authManager?.showToast('💾 Данные сохранены в файл с красивым форматированием!', 'success');
}

function importDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.users) {
                localStorage.setItem('aktivchiki_users', JSON.stringify(data.users, null, 2));
            }
            if (data.events) {
                localStorage.setItem('aktivchiki_events', JSON.stringify(data.events, null, 2));
            }
            window.authManager?.showToast('📁 Данные загружены! Перезагрузи страницу.', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            window.authManager?.showToast('❌ Ошибка при загрузке файла', 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('⚠️ ВНИМАНИЕ! Это удалит ВСЕ данные. Точно продолжить?')) {
        localStorage.clear();
        window.authManager?.showToast('🗑️ Все данные удалены. Страница перезагрузится.', 'warning');
        setTimeout(() => location.reload(), 1500);
    }
}

function updateStorageInfo() {
    const container = document.getElementById('storageInfo');
    if (!container) return;
    
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length * 2;
        }
    }
    
    const users = JSON.parse(localStorage.getItem('aktivchiki_users') || '[]');
    const events = JSON.parse(localStorage.getItem('aktivchiki_events') || '[]');
    
    container.innerHTML = `
        <div style="margin-top: 20px; padding: 20px; background: var(--bg-card); border-radius: 24px;">
            <h3 style="margin-bottom: 15px;">📊 Информация о хранилище</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div class="stat-card"><div class="stat-value">${users.filter(u => !u.isAdmin).length}</div><div class="stat-label">Участников</div></div>
                <div class="stat-card"><div class="stat-value">${events.length}</div><div class="stat-label">Мероприятий</div></div>
                <div class="stat-card"><div class="stat-value">${(totalSize / 1024).toFixed(2)}</div><div class="stat-label">KB (всего)</div></div>
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: var(--text-dim);">📁 Все данные хранятся в localStorage браузера в формате JSON с отступами</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('exportDataBtn');
    const importInput = document.getElementById('importFileInput');
    const clearBtn = document.getElementById('clearDataBtn');
    
    if (exportBtn) exportBtn.addEventListener('click', exportAllData);
    if (importInput) importInput.addEventListener('change', (e) => {
        if (e.target.files[0]) importDataFromFile(e.target.files[0]);
    });
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);
    
    updateStorageInfo();
});

window.exportAllData = exportAllData;