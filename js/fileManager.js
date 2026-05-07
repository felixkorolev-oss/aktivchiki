// Файловый менеджер для экспорта/импорта данных
class FileManager {
    constructor() {
        this.init();
    }

    init() {
        // Привязываем обработчики событий
        this.attachEventListeners();
        this.loadBackupsList();
        this.updateStorageStats();
        this.startAutoSave();
    }

    attachEventListeners() {
        // Кнопки экспорта
        const exportAllBtn = document.getElementById('exportAllDataBtn');
        const exportUsersBtn = document.getElementById('exportUsersBtn');
        const exportEventsBtn = document.getElementById('exportEventsBtn');
        const importFileInput = document.getElementById('importFileInput');
        const createBackupBtn = document.getElementById('createBackupBtn');
        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        const clearBackupsBtn = document.getElementById('clearBackupsBtn');

        if (exportAllBtn) exportAllBtn.addEventListener('click', () => this.exportAllData());
        if (exportUsersBtn) exportUsersBtn.addEventListener('click', () => this.exportUsersData());
        if (exportEventsBtn) exportEventsBtn.addEventListener('click', () => this.exportEventsData());
        if (importFileInput) importFileInput.addEventListener('change', (e) => this.importData(e));
        if (createBackupBtn) createBackupBtn.addEventListener('click', () => this.createBackup());
        if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', () => this.showBackupRestoreDialog());
        if (clearBackupsBtn) clearBackupsBtn.addEventListener('click', () => this.clearAllBackups());
    }

    // Получение всех данных из системы
    getAllData() {
        const users = localStorage.getItem('cyberplay_users');
        const events = localStorage.getItem('cyberplay_events');
        const registrations = localStorage.getItem('cyberplay_registrations');
        
        return {
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            platform: 'CyberPlay',
            data: {
                users: users ? JSON.parse(users) : [],
                events: events ? JSON.parse(events) : [],
                registrations: registrations ? JSON.parse(registrations) : []
            },
            stats: {
                totalUsers: users ? JSON.parse(users).length : 0,
                totalEvents: events ? JSON.parse(events).length : 0,
                totalRegistrations: registrations ? JSON.parse(registrations).length : 0
            }
        };
    }

    // Экспорт всех данных
    exportAllData() {
        const allData = this.getAllData();
        this.downloadJSON(allData, `cyberplay_full_backup_${this.getDateString()}.json`);
        this.showToast('Все данные успешно экспортированы!', 'success');
    }

    // Экспорт только пользователей
    exportUsersData() {
        const users = localStorage.getItem('cyberplay_users');
        if (users) {
            const data = {
                exportDate: new Date().toISOString(),
                type: 'users',
                data: JSON.parse(users)
            };
            this.downloadJSON(data, `cyberplay_users_${this.getDateString()}.json`);
            this.showToast(`Экспортировано ${JSON.parse(users).length} пользователей`, 'success');
        } else {
            this.showToast('Нет данных для экспорта', 'error');
        }
    }

    // Экспорт только мероприятий
    exportEventsData() {
        const events = localStorage.getItem('cyberplay_events');
        const registrations = localStorage.getItem('cyberplay_registrations');
        
        const data = {
            exportDate: new Date().toISOString(),
            type: 'events',
            events: events ? JSON.parse(events) : [],
            registrations: registrations ? JSON.parse(registrations) : []
        };
        this.downloadJSON(data, `cyberplay_events_${this.getDateString()}.json`);
        this.showToast('Мероприятия экспортированы', 'success');
    }

    // Скачивание JSON файла
    downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Импорт данных из файла
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            this.showToast('Пожалуйста, выберите JSON файл', 'error');
            return;
        }

        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Показываем превью перед импортом
            this.showImportPreview(importData, file.name);
        } catch (error) {
            this.showToast('Ошибка чтения файла: ' + error.message, 'error');
        }
    }

    // Показать превью перед импортом
    showImportPreview(importData, filename) {
        const previewDiv = document.getElementById('importPreview');
        if (!previewDiv) return;

        let stats = '';
        if (importData.data && importData.data.users) {
            stats = `
                <strong>Файл:</strong> ${filename}<br>
                <strong>Дата экспорта:</strong> ${importData.exportDate || 'Не указана'}<br>
                <strong>Пользователей:</strong> ${importData.data.users.length}<br>
                <strong>Мероприятий:</strong> ${importData.data.events.length}<br>
                <strong>Записей:</strong> ${importData.data.registrations.length}<br>
            `;
        } else if (importData.type === 'users') {
            stats = `
                <strong>Файл:</strong> ${filename}<br>
                <strong>Тип:</strong> Пользователи<br>
                <strong>Количество:</strong> ${importData.data.length}<br>
            `;
        } else if (importData.type === 'events') {
            stats = `
                <strong>Файл:</strong> ${filename}<br>
                <strong>Тип:</strong> Мероприятия<br>
                <strong>Мероприятий:</strong> ${importData.events.length}<br>
            `;
        }

        previewDiv.innerHTML = `
            <div style="background: rgba(0,255,255,0.1); padding: 16px; border-radius: 16px;">
                <h4 style="margin-bottom: 12px;">📄 Превью файла:</h4>
                <p style="font-size: 0.9rem;">${stats}</p>
                <div class="storage-buttons" style="margin-top: 16px;">
                    <button class="cyber-btn primary" id="confirmImportBtn">✅ Подтвердить импорт</button>
                    <button class="cyber-btn secondary" id="cancelImportBtn">❌ Отмена</button>
                </div>
            </div>
        `;
        previewDiv.style.display = 'block';

        document.getElementById('confirmImportBtn')?.addEventListener('click', () => {
            this.executeImport(importData);
            previewDiv.style.display = 'none';
            document.getElementById('importFileInput').value = '';
        });

        document.getElementById('cancelImportBtn')?.addEventListener('click', () => {
            previewDiv.style.display = 'none';
            document.getElementById('importFileInput').value = '';
        });
    }

    // Выполнение импорта
    executeImport(importData) {
        try {
            if (importData.data && importData.data.users) {
                // Полный бэкап
                localStorage.setItem('cyberplay_users', JSON.stringify(importData.data.users));
                localStorage.setItem('cyberplay_events', JSON.stringify(importData.data.events));
                localStorage.setItem('cyberplay_registrations', JSON.stringify(importData.data.registrations));
                this.showToast('Полное восстановление данных выполнено! Перезагружаем...', 'success');
            } else if (importData.type === 'users') {
                // Только пользователи
                const existingEvents = localStorage.getItem('cyberplay_events');
                const existingRegs = localStorage.getItem('cyberplay_registrations');
                localStorage.setItem('cyberplay_users', JSON.stringify(importData.data));
                if (existingEvents) localStorage.setItem('cyberplay_events', existingEvents);
                if (existingRegs) localStorage.setItem('cyberplay_registrations', existingRegs);
                this.showToast('Пользователи импортированы!', 'success');
            } else if (importData.type === 'events') {
                // Только мероприятия
                const existingUsers = localStorage.getItem('cyberplay_users');
                localStorage.setItem('cyberplay_events', JSON.stringify(importData.events));
                localStorage.setItem('cyberplay_registrations', JSON.stringify(importData.registrations || []));
                if (existingUsers) localStorage.setItem('cyberplay_users', existingUsers);
                this.showToast('Мероприятия импортированы!', 'success');
            }

            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            this.showToast('Ошибка импорта: ' + error.message, 'error');
        }
    }

    // Создание бэкапа в localStorage
    createBackup() {
        const backups = this.getBackups();
        const backupData = this.getAllData();
        const backupId = 'backup_' + Date.now();
        
        backups[backupId] = {
            id: backupId,
            timestamp: new Date().toISOString(),
            data: backupData,
            size: JSON.stringify(backupData).length
        };
        
        // Ограничиваем количество бэкапов (максимум 20)
        const backupKeys = Object.keys(backups);
        if (backupKeys.length > 20) {
            const oldestKey = backupKeys.sort()[0];
            delete backups[oldestKey];
        }
        
        localStorage.setItem('cyberplay_backups', JSON.stringify(backups));
        this.loadBackupsList();
        this.showToast('Бэкап создан!', 'success');
    }

    // Получение списка бэкапов
    getBackups() {
        const backups = localStorage.getItem('cyberplay_backups');
        return backups ? JSON.parse(backups) : {};
    }

    // Загрузка списка бэкапов в интерфейс
    loadBackupsList() {
        const container = document.getElementById('backupList');
        if (!container) return;
        
        const backups = this.getBackups();
        const backupArray = Object.values(backups).sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        if (backupArray.length === 0) {
            container.innerHTML = '<p style="color: var(--text-dim);">Нет сохранённых бэкапов</p>';
            return;
        }
        
        container.innerHTML = backupArray.map(backup => `
            <div class="backup-item" data-backup-id="${backup.id}">
                <div>
                    <strong>📅 ${new Date(backup.timestamp).toLocaleString()}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-dim);">
                        Размер: ${(backup.size / 1024).toFixed(2)} KB | 
                        Пользователей: ${backup.data.data.users.length}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="cyber-btn small" onclick="fileManager.restoreBackup('${backup.id}')">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="cyber-btn small" style="background: var(--danger);" onclick="fileManager.deleteBackup('${backup.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Восстановление из бэкапа
    restoreBackup(backupId) {
        const backups = this.getBackups();
        const backup = backups[backupId];
        
        if (backup && confirm(`Восстановить данные от ${new Date(backup.timestamp).toLocaleString()}?`)) {
            this.executeImport(backup.data);
        }
    }

    // Удаление бэкапа
    deleteBackup(backupId) {
        const backups = this.getBackups();
        delete backups[backupId];
        localStorage.setItem('cyberplay_backups', JSON.stringify(backups));
        this.loadBackupsList();
        this.showToast('Бэкап удалён', 'info');
    }

    // Очистка всех бэкапов
    clearAllBackups() {
        if (confirm('Удалить все сохранённые бэкапы?')) {
            localStorage.removeItem('cyberplay_backups');
            this.loadBackupsList();
            this.showToast('Все бэкапы удалены', 'info');
        }
    }

    // Диалог восстановления из бэкапа
    showBackupRestoreDialog() {
        const backups = this.getBackups();
        const backupArray = Object.values(backups);
        
        if (backupArray.length === 0) {
            this.showToast('Нет доступных бэкапов', 'warning');
            return;
        }
        
        // Показываем модальное окно со списком бэкапов
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content cyber-modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Восстановление из бэкапа</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Выберите бэкап для восстановления:</p>
                    <div style="max-height: 400px; overflow-y: auto; margin-top: 16px;">
                        ${backupArray.map(backup => `
                            <div style="padding: 12px; border: 1px solid var(--border-glow); margin-bottom: 8px; border-radius: 8px; cursor: pointer;" onclick="fileManager.restoreBackup('${backup.id}'); this.closest('.modal').remove();">
                                <strong>${new Date(backup.timestamp).toLocaleString()}</strong>
                                <div style="font-size: 0.8rem;">Пользователей: ${backup.data.data.users.length}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    // Авто-сохранение
    startAutoSave() {
        let saveCount = 0;
        setInterval(() => {
            this.createBackup();
            saveCount++;
            const indicator = document.getElementById('autoSaveIndicator');
            if (indicator) {
                indicator.style.opacity = '1';
                setTimeout(() => {
                    indicator.style.opacity = '0.5';
                }, 1000);
            }
        }, 60000); // Каждую минуту
    }

    // Статистика хранилища
    updateStorageStats() {
        const container = document.getElementById('storageStats');
        if (!container) return;
        
        const users = localStorage.getItem('cyberplay_users');
        const events = localStorage.getItem('cyberplay_events');
        const registrations = localStorage.getItem('cyberplay_registrations');
        const backups = this.getBackups();
        
        const totalSize = (JSON.stringify(localStorage).length / 1024).toFixed(2);
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 16px;">
                <div class="stat-card"><div class="stat-value">${users ? JSON.parse(users).length : 0}</div><div class="stat-label">Пользователей</div></div>
                <div class="stat-card"><div class="stat-value">${events ? JSON.parse(events).length : 0}</div><div class="stat-label">Мероприятий</div></div>
                <div class="stat-card"><div class="stat-value">${registrations ? JSON.parse(registrations).length : 0}</div><div class="stat-label">Записей</div></div>
                <div class="stat-card"><div class="stat-value">${Object.keys(backups).length}</div><div class="stat-label">Бэкапов</div></div>
                <div class="stat-card"><div class="stat-value">${totalSize}</div><div class="stat-label">KB (всего)</div></div>
            </div>
        `;
    }

    getDateString() {
        return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    }

    showToast(message, type) {
        if (window.authManager && window.authManager.showToast) {
            window.authManager.showToast(message, type);
        } else {
            const container = document.getElementById('toastContainer');
            if (container) {
                const toast = document.createElement('div');
                toast.className = 'toast';
                const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
                toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
                container.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
        }
    }
}

// Глобальный экземпляр
let fileManager;
document.addEventListener('DOMContentLoaded', () => {
    fileManager = new FileManager();
    window.fileManager = fileManager;
});