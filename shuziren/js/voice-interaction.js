/**
 * 数字人语音互动模块
 * 负责音频播放和动作联动
 */

// 音频+动作绑定数据 - 修正音频路径
const audioActionData = [
    { path: 'shuziren/audio/lupangpang-hello.mp3', action: 'waveHand' },        // 打招呼
    { path: 'shuziren/audio/lupangpang-welcome.mp3', action: 'handsOnHips' },   // 叉腰
    { path: 'shuziren/audio/lupangpang-waiting.mp3', action: 'nodHead' },       // 点头
    { path: 'shuziren/audio/lupangpang-map.mp3', action: 'greet' },             // 指向
    { path: 'shuziren/audio/lupangpang-happy.mp3', action: 'waveHand' },        // 欢呼
    { path: 'shuziren/audio/lupangpang-culture.mp3', action: 'salute' }         // 敬礼
];

let lastIndex = -1; // 上次播放的索引
let buttonCurrentAudio = null; // 当前正在播放的音频对象（按钮专用）
let buttonActionTimer = null; // 按钮专用的动作定时器

// 停止当前音频和动作（按钮专用）- 导出到全局
function stopButtonInteraction() {
    console.log('停止当前按钮音频和动作');
    
    // 停止当前音频
    if (buttonCurrentAudio) {
        try {
            buttonCurrentAudio.pause();
            buttonCurrentAudio.currentTime = 0;
            
            // 移除所有事件监听
            buttonCurrentAudio.onended = null;
            buttonCurrentAudio.onerror = null;
            
            buttonCurrentAudio = null;
            console.log('已停止当前按钮音频');
        } catch (e) {
            console.warn('停止按钮音频时出错:', e);
        }
    }
    
    // 停止按钮专用的动作定时器
    if (buttonActionTimer) {
        clearInterval(buttonActionTimer);
        clearTimeout(buttonActionTimer);
        buttonActionTimer = null;
        console.log('已停止按钮动作定时器');
    }
    
    // 也停止全局动作定时器
    if (window.actionTimer) {
        clearInterval(window.actionTimer);
        clearTimeout(window.actionTimer);
        window.actionTimer = null;
        console.log('已停止全局动作定时器');
    }
    
    // 复位当前动作状态
    window.currentAction = null;
    
    // 复位骨骼
    if (window.resetBones) {
        window.resetBones();
    }
}

// 随机播放+触发动作函数
function playRandomVoice() {
    console.log('触发随机语音互动');
    
    // 停止当前正在播放的音频和动作
    stopButtonInteraction();
    
    // 随机选择一个音频（避免连续播放同一个）
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * audioActionData.length);
    } while (audioActionData.length > 1 && randomIndex === lastIndex);
    
    lastIndex = randomIndex;
    const selectedAudio = audioActionData[randomIndex];
    console.log('播放音频:', selectedAudio.path);

    // 创建音频对象并播放
    buttonCurrentAudio = new Audio(selectedAudio.path);
    
    // 音频播放结束时清理
    buttonCurrentAudio.addEventListener('ended', function() {
        console.log('音频播放结束:', selectedAudio.path);
        buttonCurrentAudio = null;
    });
    
    // 音频播放错误处理
    buttonCurrentAudio.addEventListener('error', function(e) {
        console.log("音频播放失败", e);
        console.log("请检查音频文件是否存在:", selectedAudio.path);
        buttonCurrentAudio = null;
    });
    
    buttonCurrentAudio.play().catch(e => {
        console.log("音频播放失败", e);
        buttonCurrentAudio = null;
    });

    // 触发对应动作
    console.log('尝试触发动作:', selectedAudio.action);
    if (window[selectedAudio.action]) {
        window.currentAction = selectedAudio.action;
        
        // 使用按钮专用的定时器记录
        buttonActionTimer = setTimeout(() => {
            window[selectedAudio.action]();
            console.log('动作触发成功:', selectedAudio.action);
        }, 50);
    } else {
        console.error('动作函数不存在:', selectedAudio.action);
    }
}

// 创建互动按钮
function createVoiceButton() {
    const container = document.getElementById('avatar-container');
    if (!container) {
        console.error('avatar-container 不存在');
        return;
    }
    
    // 避免重复添加按钮
    if (document.getElementById('funny-voice-btn')) return;
    
    // 获取自定义属性值
    let bottomValue = container.getAttribute('data-btn-position');
    
    if (!bottomValue) {
        const isUserPage = document.querySelector('.user-page') !== null;
        bottomValue = isUserPage ? '20px' : '-30px';
        console.log('未设置 data-btn-position，根据页面类自动选择:', bottomValue);
    } else {
        console.log('检测到自定义属性 data-btn-position =', bottomValue);
    }
    
    const btn = document.createElement('button');
    btn.id = 'funny-voice-btn';
    btn.textContent = '🔊 点我，和我互动';
    btn.style.cssText = `
        position: absolute;
        bottom: ${bottomValue};
        left: 50%;
        transform: translateX(-50%);
        z-index: 200;
        padding: 8px 16px;
        background: linear-gradient(135deg, #FF8C42, #FF5733);
        color: white;
        border: none;
        border-radius: 50px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(255, 87, 51, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        border: 2px solid rgba(255,255,255,0.5);
        font-family: 'Microsoft YaHei', sans-serif;
        white-space: nowrap;
    `;
    
    btn.onmouseover = () => {
        btn.style.transform = 'translateX(-50%) scale(1.05)';
        btn.style.boxShadow = '0 12px 28px rgba(255, 88, 51, 0.39)';
    };
    btn.onmouseout = () => {
        btn.style.transform = 'translateX(-50%) scale(1)';
        btn.style.boxShadow = '0 8px 20px rgba(255, 87, 51, 0.4)';
    };
    
    btn.onclick = playRandomVoice;
    
    container.appendChild(btn);
    console.log('互动按钮创建成功，bottom 值为:', bottomValue);
}

// 等待模型加载完成后创建按钮
window.addEventListener('vrmModelLoaded', function() {
    console.log('模型加载完成，创建互动按钮');
    createVoiceButton();
});

// 如果模型已经加载，直接创建按钮
setTimeout(function() {
    if (window.vrmModel) {
        console.log('模型已存在，创建互动按钮');
        createVoiceButton();
    }
}, 3000);

// ===== 导出函数供其他模块使用 =====
window.playRandomVoice = playRandomVoice;
window.stopButtonInteraction = stopButtonInteraction;