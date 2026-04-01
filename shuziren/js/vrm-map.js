/**
 * VRM数字人地图互动模块
 * 鼠标悬停在省份区域时自动触发对应的动作和语音
 */

// ========== 全局变量 ==========
let mapCurrentAudio = null; // 当前正在播放的音频对象（地图专用）
let isMapAudioPlaying = false; // 音频播放状态标志
let isInteractionActive = false; // 互动按钮是否已点击（控制地图悬停功能）
let mapActionTimer = null; // 地图专用的动作定时器
let lastActionTime = 0; // 上次动作触发时间
const ACTION_COOLDOWN = 800; // 动作冷却时间

// ========== 动作列表 ==========
const actionList = [
    'waveHand', 'greet', 'nodHead', 'handsOnHips', 'salute'
];

// ========== 获取省份名称 ==========
function getProvinceNameFromArea(areaElement) {
    return areaElement.getAttribute('title') || areaElement.getAttribute('alt') || '';
}

// ========== 停止所有可能的音频 ==========
function stopAllAudio() {
    console.log('停止所有音频');
    
    // 停止地图音频
    if (mapCurrentAudio) {
        try {
            mapCurrentAudio.pause();
            mapCurrentAudio.currentTime = 0;
            mapCurrentAudio = null;
        } catch (e) {}
    }
    
    // 尝试停止按钮音频 - 通过调用按钮模块的函数
    if (window.stopButtonInteraction) {
        window.stopButtonInteraction();
    }
    
    // 停止所有可能存在的音频元素
    const audioElements = document.getElementsByTagName('audio');
    for (let i = 0; i < audioElements.length; i++) {
        try {
            audioElements[i].pause();
            audioElements[i].currentTime = 0;
        } catch (e) {}
    }
}

// ========== 停止地图音频 ==========
function stopMapCurrentAudio() {
    if (mapCurrentAudio) {
        console.log('停止当前地图音频');
        
        try {
            mapCurrentAudio.pause();
            mapCurrentAudio.currentTime = 0;
            mapCurrentAudio.onended = null;
            mapCurrentAudio.onerror = null;
            mapCurrentAudio = null;
            isMapAudioPlaying = false;
        } catch (e) {
            console.warn('停止地图音频时出错:', e);
        }
    }
}

// ========== 停止地图所有互动 ==========
function stopMapInteraction() {
    console.log('停止地图所有互动');
    
    // 停止地图音频
    stopMapCurrentAudio();
    
    // 停止地图动作定时器
    if (mapActionTimer) {
        clearTimeout(mapActionTimer);
        mapActionTimer = null;
    }
}

// ========== 激活互动功能 ==========
function activateInteraction() {
    console.log('互动功能已激活');
    isInteractionActive = true;
}

// ========== 播放省份语音 ==========
function playProvinceVoice(provinceName) {
    if (!provinceName) return;
    
    // ===== 关键：先停止所有音频 =====
    console.log('准备播放省份语音，先停止所有音频');
    stopAllAudio();
    
    const safeProvinceName = provinceName.replace(/[\\/:"*?<>|]+/g, '');
    const audioFileName = `lupangpang-${safeProvinceName}.mp3`;
    
    console.log(`准备播放 ${provinceName} 语音:`, audioFileName);
    
    const currentPath = window.location.pathname;
    let audioPath = `shuziren/audio/${audioFileName}`;
    
    if (currentPath.includes('/women/') || 
        currentPath.includes('/denglu-zhuce/') || 
        currentPath.includes('/fenleijiansuo/')) {
        audioPath = `../shuziren/audio/${audioFileName}`;
    }
    
    // 创建新音频
    const audio = new Audio(audioPath);
    audio.preload = 'auto';
    
    audio.onended = () => {
        console.log(`${provinceName} 语音播放完成`);
        if (mapCurrentAudio === audio) {
            mapCurrentAudio = null;
            isMapAudioPlaying = false;
        }
    };
    
    audio.onerror = (e) => {
        console.log(`音频播放失败: ${audioFileName}`, e);
        if (mapCurrentAudio === audio) {
            mapCurrentAudio = null;
            isMapAudioPlaying = false;
        }
    };
    
    mapCurrentAudio = audio;
    isMapAudioPlaying = true;
    
    audio.play().catch(e => {
        console.log("音频播放失败", e);
        mapCurrentAudio = null;
        isMapAudioPlaying = false;
    });
}

// ========== 随机动作 ==========
let lastAction = '';
function getRandomAction() {
    let randomAction;
    do {
        const randomIndex = Math.floor(Math.random() * actionList.length);
        randomAction = actionList[randomIndex];
    } while (randomAction === lastAction && actionList.length > 1);
    
    lastAction = randomAction;
    return randomAction;
}

// ========== 触发随机动作 ==========
function triggerRandomAction(provinceName) {
    const now = Date.now();
    
    if (now - lastActionTime < ACTION_COOLDOWN) {
        console.log('动作触发太频繁，已节流');
        return;
    }
    
    const randomAction = getRandomAction();
    console.log(`触发 ${provinceName} 随机动作:`, randomAction);
    
    if (window[randomAction]) {
        // 清除地图自己的动作定时器
        if (mapActionTimer) {
            clearTimeout(mapActionTimer);
            mapActionTimer = null;
        }
        
        // 清除全局动作定时器
        if (window.actionTimer) {
            clearInterval(window.actionTimer);
            clearTimeout(window.actionTimer);
            window.actionTimer = null;
        }
        
        // 设置新的动作
        mapActionTimer = setTimeout(() => {
            window.currentAction = randomAction;
            window[randomAction]();
            console.log(`${randomAction} 动作触发成功`);
            lastActionTime = Date.now();
            mapActionTimer = null;
        }, 50);
    }
}

// ========== 鼠标悬停处理 ==========
function handleAreaMouseOver(event) {
    if (!isInteractionActive) {
        console.log('互动功能未激活，忽略地图悬停');
        return;
    }
    
    const area = event.target;
    const provinceName = getProvinceNameFromArea(area);
    
    if (!provinceName) return;
    
    console.log('鼠标悬停在:', provinceName);
    
    if (!window.vrmModel) {
        console.log('数字人未就绪');
        return;
    }
    
    triggerRandomAction(provinceName);
    playProvinceVoice(provinceName);
}

// ========== 绑定地图事件 ==========
function bindMapAreaEvents() {
    console.log('开始绑定地图区域事件...');
    
    const areas = document.querySelectorAll('map[name="anhui-map"] area');
    console.log('找到地图区域:', areas.length);
    
    if (areas.length === 0) {
        setTimeout(bindMapAreaEvents, 1000);
        return;
    }
    
    let debounceTimer;
    let lastProvince = '';
    
    areas.forEach(area => {
        area.removeEventListener('mouseenter', handleAreaMouseOver);
        
        area.addEventListener('mouseenter', function(e) {
            const currentProvince = getProvinceNameFromArea(e.target);
            
            if (currentProvince === lastProvince) return;
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                handleAreaMouseOver(e);
                lastProvince = currentProvince;
                
                setTimeout(() => {
                    if (lastProvince === currentProvince) {
                        lastProvince = '';
                    }
                }, 2000);
            }, 150);
        });
    });
    
    console.log('地图区域事件绑定完成');
}

// ========== 监听按钮点击 ==========
function listenToInteractionButton() {
    const checkButton = setInterval(() => {
        const interactionBtn = document.getElementById('funny-voice-btn');
        
        if (interactionBtn) {
            console.log('找到互动按钮');
            
            interactionBtn.addEventListener('click', function() {
                // 按钮点击时，停止地图所有互动
                console.log('按钮被点击，停止地图所有互动');
                stopMapInteraction();
                activateInteraction();
            });
            
            clearInterval(checkButton);
        }
    }, 500);
}

// ========== 初始化 ==========
function initMapInteraction() {
    console.log('初始化地图互动模块...');
    
    setTimeout(() => {
        bindMapAreaEvents();
        listenToInteractionButton();
    }, 2000);
}

// ========== 启动 ==========
console.log('vrm-map.js 已加载');
initMapInteraction();

// 导出函数
window.stopMapCurrentAudio = stopMapCurrentAudio;
window.stopMapInteraction = stopMapInteraction;
window.activateInteraction = activateInteraction;
window.stopAllAudio = stopAllAudio;