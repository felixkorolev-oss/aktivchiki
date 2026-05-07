// Магазин для Активчиков с анимированными элементами
const shopItems = {
    skins: [
        { id: 'skin1', name: 'Геймер', icon: '🎮', price: 0, category: 'skins', animation: '' },
        { id: 'skin2', name: 'Звёздочка', icon: '⭐', price: 150, category: 'skins', animation: 'skin-animate-pulse' },
        { id: 'skin3', name: 'Молния', icon: '⚡', price: 300, category: 'skins', animation: 'skin-animate-float' },
        { id: 'skin4', name: 'Огонь', icon: '🔥', price: 500, category: 'skins', animation: 'skin-animate-pulse' },
        { id: 'skin5', name: 'Радуга', icon: '🌈', price: 700, category: 'skins', animation: 'skin-animate-float' },
        { id: 'skin6', name: 'Единорог', icon: '🦄', price: 1000, category: 'skins', animation: 'skin-animate-bounce' },
        { id: 'skin7', name: 'Дракон', icon: '🐉', price: 1500, category: 'skins', animation: 'skin-animate-spin' },
        { id: 'skin8', name: 'Корона', icon: '👑', price: 2000, category: 'skins', animation: 'skin-animate-pulse' },
        { id: 'skin9', name: 'Робот', icon: '🤖', price: 1200, category: 'skins', animation: '' },
        { id: 'skin10', name: 'Сова', icon: '🦉', price: 800, category: 'skins', animation: 'skin-animate-float' },
        { id: 'skin11', name: 'Панда', icon: '🐼', price: 600, category: 'skins', animation: 'skin-animate-bounce' },
        { id: 'skin12', name: 'Лис', icon: '🦊', price: 400, category: 'skins', animation: '' }
    ],
    titles: [
        { id: 'title1', name: 'Исследователь', price: 200, category: 'titles' },
        { id: 'title2', name: 'Активист', price: 400, category: 'titles' },
        { id: 'title3', name: 'Мастер', price: 600, category: 'titles' },
        { id: 'title4', name: 'Творец', price: 800, category: 'titles' },
        { id: 'title5', name: 'Чемпион', price: 1000, category: 'titles' },
        { id: 'title6', name: 'Волшебник', price: 1200, category: 'titles' },
        { id: 'title7', name: 'Лидер', price: 1500, category: 'titles' },
        { id: 'title8', name: 'Легенда', price: 2000, category: 'titles' }
    ],
    backgrounds: [
        { id: 'bg1', name: 'Космос', price: 300, category: 'backgrounds', bgValue: 'cosmic' },
        { id: 'bg2', name: 'Закат', price: 500, category: 'backgrounds', bgValue: 'sunset' },
        { id: 'bg3', name: 'Магия', price: 800, category: 'backgrounds', bgValue: 'magic' },
        { id: 'bg4', name: 'Лес', price: 600, category: 'backgrounds', bgValue: 'forest' },
        { id: 'bg5', name: 'Океан', price: 700, category: 'backgrounds', bgValue: 'ocean' },
        { id: 'bg6', name: 'Сакура', price: 750, category: 'backgrounds', bgValue: 'sakura' },
        { id: 'bg7', name: 'Северное сияние', price: 900, category: 'backgrounds', bgValue: 'aurora' }
    ],
    frames: [
        { id: 'frame1', name: 'Бронзовая', price: 250, category: 'frames', frameValue: 'bronze_frame', animation: '' },
        { id: 'frame2', name: 'Серебряная', price: 500, category: 'frames', frameValue: 'silver_frame', animation: '' },
        { id: 'frame3', name: 'Золотая', price: 800, category: 'frames', frameValue: 'gold_frame', animation: 'frame-gold' },
        { id: 'frame4', name: 'Радужная', price: 1200, category: 'frames', frameValue: 'rainbow_frame', animation: 'frame-rainbow' },
        { id: 'frame5', name: 'Легендарная', price: 2000, category: 'frames', frameValue: 'legend_frame', animation: 'frame-legend' },
        { id: 'frame6', name: 'Алмазная', price: 3000, category: 'frames', frameValue: 'diamond_frame', animation: 'frame-diamond' },
        { id: 'frame7', name: 'Изумрудная', price: 1500, category: 'frames', frameValue: 'emerald_frame', animation: 'frame-emerald' },
        { id: 'frame8', name: 'Огненная', price: 1600, category: 'frames', frameValue: 'fire_frame', animation: 'frame-fire' },
        { id: 'frame9', name: 'Ледяная', price: 1400, category: 'frames', frameValue: 'ice_frame', animation: 'frame-ice' }
    ],
    achievements: [
        { id: 'ach1', name: 'Первый шаг', desc: 'Принять участие в мероприятии', icon: '🎯', category: 'achievements' },
        { id: 'ach2', name: 'Активист', desc: 'Участвовать в 5 мероприятиях', icon: '🌟', category: 'achievements' },
        { id: 'ach3', name: 'Звёздный час', desc: 'Накопить 500 очков', icon: '⭐', category: 'achievements' },
        { id: 'ach4', name: 'Мастер', desc: 'Достичь 10 уровня', icon: '🏆', category: 'achievements' }
    ]
};

let currentShopCategory = 'skins';

function renderShop() {
    const container = document.getElementById('shopContainer');
    if (!container) return;
    
    const currentUser = window.authManager?.currentUser;
    let items = [];
    
    if (currentShopCategory === 'skins') items = shopItems.skins;
    else if (currentShopCategory === 'titles') items = shopItems.titles;
    else if (currentShopCategory === 'backgrounds') items = shopItems.backgrounds;
    else if (currentShopCategory === 'frames') items = shopItems.frames;
    else if (currentShopCategory === 'achievements') items = shopItems.achievements;
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-shop">✨ Скоро появятся новые товары!</div>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        let isUnlocked = false;
        if (currentShopCategory === 'skins') isUnlocked = currentUser?.unlockedSkins?.includes(item.icon);
        else if (currentShopCategory === 'titles') isUnlocked = currentUser?.unlockedTitles?.includes(item.name);
        else if (currentShopCategory === 'backgrounds') isUnlocked = currentUser?.unlockedBgs?.includes(item.bgValue);
        else if (currentShopCategory === 'frames') isUnlocked = currentUser?.unlockedFrames?.includes(item.frameValue);
        else if (currentShopCategory === 'achievements') isUnlocked = currentUser?.unlockedAchievements?.includes(item.id);
        
        const canBuy = currentUser && currentUser.coins >= item.price && !isUnlocked && item.price > 0;
        const animationClass = item.animation || '';
        
        return `
            <div class="shop-card ${isUnlocked ? 'unlocked' : ''}" onclick="${canBuy ? `buyShopItem('${item.id}', '${item.category}')` : ''}">
                <div class="shop-card-icon ${animationClass}">${item.icon || '🎁'}</div>
                <div class="shop-card-name">${item.name}</div>
                ${item.desc ? `<div class="shop-card-desc">${item.desc}</div>` : ''}
                ${item.price > 0 ? `<div class="shop-card-price">🪙 ${item.price}</div>` : '<div class="shop-card-free">Бесплатно</div>'}
                ${isUnlocked ? '<div class="shop-card-owned">✓ Собственность</div>' : ''}
            </div>
        `;
    }).join('');
}

function buyShopItem(itemId, category) {
    const currentUser = window.authManager?.currentUser;
    if (!currentUser) {
        window.authManager?.showToast('Сначала войди в профиль!', 'warning');
        document.getElementById('authModal').classList.add('active');
        return;
    }
    
    let item;
    if (category === 'skins') item = shopItems.skins.find(i => i.id === itemId);
	if (typeof renderProfile === 'function') renderProfile();
	if (typeof renderLeaderboard === 'function') renderLeaderboard();
    else if (category === 'titles') item = shopItems.titles.find(i => i.id === itemId);
    else if (category === 'backgrounds') item = shopItems.backgrounds.find(i => i.id === itemId);
    else if (category === 'frames') item = shopItems.frames.find(i => i.id === itemId);
    
    if (!item) return;
    
    if (currentUser.coins < item.price) {
        window.authManager?.showToast('Не хватает монет! Участвуй в мероприятиях!', 'error');
        return;
    }
    
    currentUser.coins -= item.price;
    
    if (category === 'skins') {
        if (!currentUser.unlockedSkins) currentUser.unlockedSkins = [];
        if (!currentUser.unlockedSkins.includes(item.icon)) {
            currentUser.unlockedSkins.push(item.icon);
        }
        window.authManager?.showToast(`🎨 Ты получил образ ${item.icon} ${item.name}!`, 'success');
    } else if (category === 'titles') {
        if (!currentUser.unlockedTitles) currentUser.unlockedTitles = [];
        if (!currentUser.unlockedTitles.includes(item.name)) {
            currentUser.unlockedTitles.push(item.name);
        }
        window.authManager?.showToast(`🏷️ Ты получил титул "${item.name}"!`, 'success');
    } else if (category === 'backgrounds') {
        if (!currentUser.unlockedBgs) currentUser.unlockedBgs = [];
        if (!currentUser.unlockedBgs.includes(item.bgValue)) {
            currentUser.unlockedBgs.push(item.bgValue);
        }
        window.authManager?.showToast(`🖼️ Ты получил фон "${item.name}"!`, 'success');
    } else if (category === 'frames') {
        if (!currentUser.unlockedFrames) currentUser.unlockedFrames = [];
        if (!currentUser.unlockedFrames.includes(item.frameValue)) {
            currentUser.unlockedFrames.push(item.frameValue);
        }
        window.authManager?.showToast(`🖼️ Ты получил рамку "${item.name}"!`, 'success');
    }
    
    window.authManager.updateUser(currentUser);
    renderShop();
    window.authManager.updateUI();
    if (typeof renderProfile === 'function') renderProfile();
}

document.addEventListener('DOMContentLoaded', () => {
    const categoryBtns = document.querySelectorAll('.shop-cat');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShopCategory = btn.dataset.cat;
            renderShop();
        });
    });
    
    renderShop();
});

window.buyShopItem = buyShopItem;