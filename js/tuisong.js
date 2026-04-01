// ========== 登录检查函数 ==========
function checkLogin() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('请先登录后使用内容推送功能');
        window.location.href = '../denglu-zhuce/denglu-zhuce.html';
        return false;
    }
    return true;
}

// ========== 导航栏状态同步 ==========
function updateNavigation() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        document.getElementById('user-link').innerHTML = '<a href="../profile.html">个人主页</a>';
    } else {
        document.getElementById('user-link').innerHTML = '<a href="../denglu-zhuce/denglu-zhuce.html">用户登录与注册</a>';
    }
}
updateNavigation();

// 获取当前登录用户
function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

// ========== 统一的数据读取函数（兼容个人主页的存储格式） ==========
// 获取用户标签
function getUserTags() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    // 优先读取个人主页使用的格式（不带用户前缀）
    let tags = localStorage.getItem('favoriteTags');
    if (tags) return JSON.parse(tags);
    
    // 兼容带用户前缀的格式
    tags = localStorage.getItem(`favoriteTags_${currentUser}`);
    return tags ? JSON.parse(tags) : [];
}

// 获取浏览历史（兼容个人主页的存储格式）
function getBrowseHistory() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    // 优先读取个人主页使用的格式（不带用户前缀）
    let history = localStorage.getItem('browseHistory');
    if (history) {
        const parsed = JSON.parse(history);
        // 同步到带用户前缀的格式（便于未来使用）
        localStorage.setItem(`browseHistory_${currentUser}`, JSON.stringify(parsed));
        return parsed;
    }
    
    // 如果个人主页格式不存在，尝试读取带用户前缀的格式
    history = localStorage.getItem(`browseHistory_${currentUser}`);
    return history ? JSON.parse(history) : [];
}

// 获取搜索历史（兼容个人主页的存储格式）
function getSearchHistory() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    // 优先读取个人主页使用的格式（不带用户前缀）
    let history = localStorage.getItem('searchHistory');
    if (history) {
        const parsed = JSON.parse(history);
        // 同步到带用户前缀的格式（便于未来使用）
        localStorage.setItem(`searchHistory_${currentUser}`, JSON.stringify(parsed));
        return parsed;
    }
    
    // 如果个人主页格式不存在，尝试读取带用户前缀的格式
    history = localStorage.getItem(`searchHistory_${currentUser}`);
    return history ? JSON.parse(history) : [];
}

// 获取用户访问过的城市（基于浏览记录）
function getUserVisitedCities() {
    const browseHistory = getBrowseHistory();
    const cities = [];
    browseHistory.forEach(item => {
        const heritage = window.intangibleData?.find(h => h.name === item.name);
        if (heritage && heritage.area) {
            let city = heritage.area.split('、')[0];
            city = city.replace(/市$/, '').replace(/县$/, '').replace(/区$/, '');
            if (!cities.includes(city) && city !== '安徽省' && city !== '安徽' && city.length > 0) {
                cities.push(city);
            }
        }
    });
    return cities;
}

// 获取用户信息（昵称、头像等）
function getUserInfo() {
    const currentUser = getCurrentUser();
    if (!currentUser) return {};
    const info = localStorage.getItem(`userInfo_${currentUser}`);
    return info ? JSON.parse(info) : {};
}

// 获取用户头像
function getUserAvatar() {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    return localStorage.getItem(`avatar_${currentUser}`);
}

// 匹配分计算
function calculateMatchScore(heritage, userTags, browseHistory, searchHistory, visitedCities) {
    let score = 0;
    
    // 标签匹配：权重 35
    if (userTags.includes(heritage.category)) score += 35;
    
    // 浏览历史匹配：权重 20
    if (browseHistory.map(h => h.name).includes(heritage.name)) score += 20;
    
    // 搜索历史匹配：权重 15
    if (searchHistory.map(k => k.keyword).some(k => heritage.name.includes(k) || heritage.category.includes(k))) score += 15;
    
    // 城市匹配：权重 20
    let city = heritage.area?.split('、')[0].replace(/市|县|区/g, '') || '';
    if (visitedCities.includes(city)) score += 20;
    
    // 添加基础分数，确保所有内容都有评分
    score += 5;
    
    return Math.min(100, Math.round(score));
}

// 获取所有非遗数据并计算匹配度（排序后的完整列表）
let allScoredHeritage = [];
let currentPageIndex = 0;
const PAGE_SIZE = 8;

function updateAllScoredHeritage() {
    if (!window.intangibleData || !Array.isArray(window.intangibleData)) {
        return [];
    }
    
    const userTags = getUserTags();
    const browseHistory = getBrowseHistory();
    const searchHistory = getSearchHistory();
    const visitedCities = getUserVisitedCities();
    
    console.log('重新计算匹配度 - 浏览记录数:', browseHistory.length, '搜索记录数:', searchHistory.length);
    
    // 计算所有非遗项目的匹配分数
    const scoredHeritage = window.intangibleData.map(heritage => ({
        ...heritage,
        matchScore: calculateMatchScore(heritage, userTags, browseHistory, searchHistory, visitedCities)
    }));
    
    // 按匹配度从高到低排序
    allScoredHeritage = scoredHeritage.sort((a, b) => b.matchScore - a.matchScore);
    
    return allScoredHeritage;
}

// 获取当前批次的推荐内容（循环模式）
function getCurrentBatchRecommendations() {
    if (!allScoredHeritage.length) {
        updateAllScoredHeritage();
    }
    
    if (allScoredHeritage.length === 0) {
        return [];
    }
    
    // 计算总批次数
    const totalPages = Math.ceil(allScoredHeritage.length / PAGE_SIZE);
    
    // 如果当前索引超出范围，重置为0（循环）
    if (currentPageIndex >= totalPages) {
        currentPageIndex = 0;
    }
    
    // 获取当前批次的数据
    const start = currentPageIndex * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, allScoredHeritage.length);
    const batch = allScoredHeritage.slice(start, end);
    
    // 如果当前批次不足8个，从开头补充（循环补充）
    if (batch.length < PAGE_SIZE && allScoredHeritage.length > 0) {
        const needed = PAGE_SIZE - batch.length;
        const补充数据 = allScoredHeritage.slice(0, needed);
        batch.push(...补充数据);
    }
    
    return batch;
}

// 下一批推荐（换一批）
function nextBatchRecommendations() {
    if (!allScoredHeritage.length) {
        updateAllScoredHeritage();
    }
    
    // 移动到下一批
    currentPageIndex++;
    
    // 获取新批次的推荐
    const newBatch = getCurrentBatchRecommendations();
    
    // 渲染
    renderRecommendationsWithList(newBatch);
}

// 重置推荐（重新从匹配度最高的开始）
function resetRecommendations() {
    currentPageIndex = 0;
    updateAllScoredHeritage();
    const firstBatch = getCurrentBatchRecommendations();
    renderRecommendationsWithList(firstBatch);
}

// 获取个性化推荐（初始加载用）
function getPersonalizedRecommendations() {
    if (!allScoredHeritage.length) {
        updateAllScoredHeritage();
    }
    return getCurrentBatchRecommendations();
}

// ==================== 旅游路线推荐（基于用户关注的城市） ====================
const VALID_CITIES = [
    "合肥市", "黄山市", "宣城市", "池州市", "滁州市",
    "六安市", "马鞍山市", "芜湖市", "铜陵市", "安庆市",
    "阜阳市", "宿州市", "淮北市", "亳州市", "蚌埠市", "淮南市"
];

function getRecommendedTravelRoutes() {
    if (!window.intangibleData) return [];
    
    const visitedCities = getUserVisitedCities(); // 用户关注的城市（基于浏览记录）
    const userTags = getUserTags();
    let cityList = [];

    console.log('用户关注的城市:', visitedCities);

    // 首先，优先推荐用户关注的城市
    if (visitedCities.length > 0) {
        // 遍历用户关注的城市
        visitedCities.forEach(visitedCity => {
            // 在安徽省城市中查找匹配的城市
            const matchedCity = VALID_CITIES.find(city => city.replace("市", "") === visitedCity);
            if (matchedCity) {
                const citySimple = matchedCity.replace("市", "");
                
                // 统计该城市的非遗数量（优先匹配用户标签）
                let heritageCount;
                if (userTags.length > 0) {
                    heritageCount = window.intangibleData.filter(h => 
                        h.area.includes(citySimple) && userTags.some(tag => h.category.includes(tag))
                    ).length;
                } else {
                    heritageCount = window.intangibleData.filter(h => h.area.includes(citySimple)).length;
                }
                
                if (heritageCount > 0) {
                    const recommendDays = heritageCount >= 10 ? 3 : (heritageCount >= 5 ? 2 : 1);
                    cityList.push({
                        cityName: matchedCity,
                        citySimple: citySimple,
                        heritageCount: heritageCount,
                        recommendDays: recommendDays,
                        score: 100 + heritageCount, // 关注的城市最高优先级
                        isVisited: true
                    });
                }
            }
        });
    }

    // 如果关注的城市不足4个，补充其他有非遗资源的城市
    if (cityList.length < 4) {
        const remainingCities = VALID_CITIES.filter(city => {
            const citySimple = city.replace("市", "");
            return !cityList.some(item => item.citySimple === citySimple);
        });

        remainingCities.forEach(cityName => {
            const citySimple = cityName.replace("市", "");
            
            let heritageCount;
            if (userTags.length > 0) {
                heritageCount = window.intangibleData.filter(h => 
                    h.area.includes(citySimple) && userTags.some(tag => h.category.includes(tag))
                ).length;
            } else {
                heritageCount = window.intangibleData.filter(h => h.area.includes(citySimple)).length;
            }
            
            if (heritageCount > 0 && cityList.length < 4) {
                const recommendDays = heritageCount >= 10 ? 3 : (heritageCount >= 5 ? 2 : 1);
                cityList.push({
                    cityName: cityName,
                    citySimple: citySimple,
                    heritageCount: heritageCount,
                    recommendDays: recommendDays,
                    score: 70 + (heritageCount * 2),
                    isVisited: false
                });
            }
        });
    }

    // 按分数从高到低排序，最多返回4个
    return cityList.sort((a, b) => b.score - a.score).slice(0, 4);
}

function renderTravelRouteRecommendations() {
    if (!checkLogin()) return;
    const routes = getRecommendedTravelRoutes();
    const container = document.getElementById('routeRecommendationsList');
    if (!container) return;

    let html = '';
    if (routes.length === 0) {
        html = `<div class="empty-state"><i class="fas fa-map-marked-alt"></i><h3>暂无推荐路线</h3><p>多浏览非遗内容或在个人主页添加兴趣标签，即可生成专属旅游路线</p></div>`;
    } else {
        routes.forEach(city => {
            // 根据是否关注显示不同的标签样式
            const visitedBadge = city.isVisited ? 
                '<span class="route-badge" style="background: linear-gradient(135deg, #ff9800, #f44336);">❤️ 您关注的城市</span>' : 
                `<span class="route-badge">${city.recommendDays}日游</span>`;
            
            html += `
                <div class="route-card" onclick="goToRoutePage('${encodeURIComponent(city.cityName)}', ${city.recommendDays})">
                    <div class="card-image" style="background-image: url('../images/${city.citySimple}风光.jpg')">
                        ${visitedBadge}
                    </div>
                    <div class="card-content">
                        <div class="card-title">${city.cityName}非遗之旅</div>
                        <div class="route-day">包含 ${city.heritageCount} 个非遗体验项目</div>
                        <div class="route-info">
                            <span class="route-tag">文化体验</span>
                            <span class="route-tag">特色美食</span>
                            <span class="route-tag">轻松出行</span>
                        </div>
                    </div>
                </div>`;
        });
    }
    container.innerHTML = html;
}

function goToRoutePage(cityName, days) {
    window.location.href = `city-route.html?city=${cityName}&days=${days}`;
}

function refreshRouteRecommendations() {
    renderTravelRouteRecommendations();
}

// ================================================================

// 提取描述摘要
function getDescriptionSummary(description) {
    if (!description) return '暂无描述';
    const text = description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
}

// 获取图片路径
function getImagePath(heritage) {
    if (heritage.mainImage) {
        return heritage.mainImage;
    }
    return '../images/placeholder.jpg';
}

// 获取城市显示名称
function getCityDisplay(area) {
    if (!area) return '安徽省';
    const city = area.split('、')[0];
    return city;
}

// HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 渲染用户画像
function renderUserProfile() {
    if (!checkLogin()) return;
    
    const currentUser = getCurrentUser();
    const userTags = getUserTags();
    const browseHistory = getBrowseHistory();
    const searchHistory = getSearchHistory();
    const visitedCities = getUserVisitedCities();
    const userInfo = getUserInfo();
    const userAvatar = getUserAvatar();
    
    let avatarHtml = '';
    if (userAvatar) {
        avatarHtml = `<img src="${userAvatar}" alt="用户头像" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        avatarHtml = '<i class="fas fa-user-circle"></i>';
    }
    
    const userNickname = userInfo.nickname || currentUser || '游客';
    
    const profileHtml = `
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 48px; color: white;">
                ${avatarHtml}
            </div>
            <div>
                <h2 style="margin: 0 0 5px 0; color: #333;">${escapeHtml(userNickname)}</h2>
                <p style="margin: 0; color: #666;"><i class="fas fa-envelope"></i> ${escapeHtml(currentUser)}</p>
                <p style="margin: 5px 0 0 0; color: #ff9800;"><i class="fas fa-calendar-alt"></i> 欢迎回来！</p>
            </div>
        </div>
        
        <div class="profile-title">
            <i class="fas fa-chart-line"></i> 您的兴趣画像
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #666;">🏷️ 喜爱的标签</div>
            <div class="tags-container">
                ${userTags.length > 0 ? 
                    userTags.map(tag => `<span class="interest-tag"><i class="fas fa-tag"></i> ${escapeHtml(tag)}</span>`).join('') :
                    '<span class="interest-tag">暂无标签，快去个人主页添加吧！</span>'
                }
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #666;">🏙️ 关注的城市</div>
            <div class="tags-container">
                ${visitedCities.length > 0 ? 
                    visitedCities.map(city => `<span class="interest-tag" style="background: linear-gradient(135deg, #ff9800, #f44336);"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(city)}</span>`).join('') :
                    '<span class="interest-tag">暂无城市记录，多浏览非遗内容吧~</span>'
                }
            </div>
        </div>
        
        <div class="history-stats">
            <div class="stat-item">
                <div class="stat-label">浏览记录</div>
                <div class="stat-value">${browseHistory.length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">搜索记录</div>
                <div class="stat-value">${searchHistory.length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">兴趣标签</div>
                <div class="stat-value">${userTags.length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">关注城市</div>
                <div class="stat-value">${visitedCities.length}</div>
            </div>
        </div>
    `;
    
    const profileContainer = document.getElementById('userProfile');
    if (profileContainer) {
        profileContainer.innerHTML = profileHtml;
    }
}

// 渲染推荐列表（通用渲染函数）
function renderRecommendationsWithList(recommendations) {
    let html = '';
    
    if (!recommendations || recommendations.length === 0) {
        html = `
            <div class="empty-state">
                <i class="fas fa-heart-broken"></i>
                <h3>暂无推荐内容</h3>
                <p>请先在个人主页添加您喜爱的非遗标签，或浏览更多非遗内容~</p>
                <a href="../fenleijiansuo/fenleijiansuo.html" style="color: #ff9800;">去浏览非遗</a>
            </div>
        `;
    } else {
        recommendations.forEach(item => {
            const summary = getDescriptionSummary(item.description);
            const imagePath = getImagePath(item);
            const cityDisplay = getCityDisplay(item.area);
            const matchScore = item.matchScore || Math.floor(Math.random() * 30 + 65);
            
            let scoreColor = '#4caf50';
            if (matchScore >= 80) scoreColor = '#4caf50';
            else if (matchScore >= 60) scoreColor = '#ff9800';
            else scoreColor = '#9e9e9e';
            
            html += `
                <div class="heritage-card" onclick="viewDetail('${encodeURIComponent(item.name)}')">
                    <div class="card-image" style="background-image: url('${imagePath}')">
                        <span class="card-badge" style="background: ${scoreColor};">匹配度 ${matchScore}%</span>
                    </div>
                    <div class="card-content">
                        <span class="card-category">${escapeHtml(item.category)}</span>
                        <h3 class="card-title">${escapeHtml(item.name)}</h3>
                        <p class="card-desc">${escapeHtml(summary)}</p>
                        <div class="card-footer">
                            <span class="match-score"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(cityDisplay)}</span>
                            <a href="javascript:void(0)" class="read-more">查看详情 →</a>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    const container = document.getElementById('recommendationsList');
    if (container) {
        container.innerHTML = html;
    }
}

// 渲染推荐列表（初始加载）
function renderRecommendations() {
    if (!checkLogin()) return;
    
    const recommendations = getPersonalizedRecommendations();
    renderRecommendationsWithList(recommendations);
}

// 刷新推荐 - 换一批（循环到下一批）
function refreshRecommendations() {
    if (!checkLogin()) return;
    
    console.log('换一批按钮被点击，显示下一批推荐');
    nextBatchRecommendations();
}

// 查看详情
function viewDetail(name) {
    if (!checkLogin()) return;
    
    const decodedName = decodeURIComponent(name);
    console.log('跳转到非遗详情:', decodedName);
    
    // 添加浏览记录（同步到个人主页使用的格式）
    const currentUser = getCurrentUser();
    const browseHistory = getBrowseHistory();
    const newRecord = {
        name: decodedName,
        time: new Date().toLocaleString(),
        path: `../detail/detail.html?name=${encodeURIComponent(decodedName)}`
    };
    browseHistory.unshift(newRecord);
    if (browseHistory.length > 50) browseHistory.pop();
    
    // 同时保存到个人主页使用的格式（不带用户前缀）和带用户前缀的格式
    localStorage.setItem('browseHistory', JSON.stringify(browseHistory));
    localStorage.setItem(`browseHistory_${currentUser}`, JSON.stringify(browseHistory));
    
    window.location.href = `../detail/detail.html?name=${encodeURIComponent(decodedName)}`;
}

// ========== 跨页面数据同步监听 ==========
function refreshAllData() {
    console.log('检测到数据变化，刷新所有数据...');
    
    // 重新计算匹配度
    updateAllScoredHeritage();
    
    // 重置到第一页
    currentPageIndex = 0;
    
    // 刷新所有UI组件
    renderUserProfile();
    renderTravelRouteRecommendations();
    
    // 重新获取推荐并渲染
    const recommendations = getCurrentBatchRecommendations();
    renderRecommendationsWithList(recommendations);
}

window.addEventListener('storage', function (e) {
    const user = getCurrentUser();
    if (!user) return;

    console.log('检测到存储变化:', e.key, '新值:', e.newValue);
    
    // 监听个人主页清空记录时使用的键名（不带用户前缀）
    if (e.key === 'browseHistory' || e.key === 'searchHistory' || e.key === 'favoriteTags') {
        console.log('检测到历史记录或标签变化，刷新所有数据');
        refreshAllData();
    }
    
    // 监听带用户前缀的格式变化
    if (e.key === `browseHistory_${user}` || e.key === `searchHistory_${user}` || e.key === `favoriteTags_${user}`) {
        console.log('检测到用户专属记录变化，刷新所有数据');
        refreshAllData();
    }
    
    // 监听用户信息的变化
    if (e.key === `userInfo_${user}` || e.key === `avatar_${user}`) {
        console.log('检测到用户信息变化，刷新用户画像');
        renderUserProfile();
    }
});

// 设置定时器，定期检查数据变化（备用方案）
let lastBrowseHistoryLength = 0;
let lastSearchHistoryLength = 0;
let lastTagsLength = 0;

function checkDataChange() {
    const currentBrowseLength = getBrowseHistory().length;
    const currentSearchLength = getSearchHistory().length;
    const currentTagsLength = getUserTags().length;
    
    if (currentBrowseLength !== lastBrowseHistoryLength || 
        currentSearchLength !== lastSearchHistoryLength || 
        currentTagsLength !== lastTagsLength) {
        console.log('检测到数据变化（定时器），刷新所有数据');
        refreshAllData();
        
        lastBrowseHistoryLength = currentBrowseLength;
        lastSearchHistoryLength = currentSearchLength;
        lastTagsLength = currentTagsLength;
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!checkLogin()) return;
    
    // 初始化上次数据长度
    lastBrowseHistoryLength = getBrowseHistory().length;
    lastSearchHistoryLength = getSearchHistory().length;
    lastTagsLength = getUserTags().length;
    
    // 设置定时器每2秒检查一次数据变化
    setInterval(checkDataChange, 2000);
    
    const checkData = setInterval(() => {
        if (window.intangibleData && Array.isArray(window.intangibleData)) {
            clearInterval(checkData);
            console.log('数据加载完成，共', window.intangibleData.length, '条非遗记录');
            
            // 初始化排序列表
            updateAllScoredHeritage();
            currentPageIndex = 0;
            
            renderUserProfile();
            renderTravelRouteRecommendations();
            renderRecommendations();
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkData);
        if (!window.intangibleData) {
            console.error('数据加载超时');
            const container = document.getElementById('recommendationsList');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-database"></i>
                        <h3>数据加载失败</h3>
                        <p>请检查网络连接或刷新页面重试</p>
                    </div>
                `;
            }
        }
    }, 5000);
});