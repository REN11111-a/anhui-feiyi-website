/**
 * VRM数字人个人主页互动模块
 * 点击介绍按钮时触发自定义指向动作（不复位）
 */

// ========== 全局变量 ==========
let profileCurrentAudio = null; // 当前正在播放的个人主页音频

// ========== 停止当前个人主页互动 ==========
function stopProfileInteraction() {
    console.log('停止当前个人主页互动');
    
    // 停止当前音频
    if (profileCurrentAudio) {
        try {
            profileCurrentAudio.pause();
            profileCurrentAudio.currentTime = 0;
            profileCurrentAudio = null;
            console.log('已停止个人主页音频');
        } catch (e) {
            console.warn('停止音频时出错:', e);
        }
    }
    
    // 停止当前动作
    if (window.actionTimer) {
        clearInterval(window.actionTimer);
        clearTimeout(window.actionTimer);
        window.actionTimer = null;
        console.log('已停止动作定时器');
    }
    
    // 复位骨骼
    if (window.resetBones) {
        window.resetBones();
        console.log('已复位骨骼');
    }
    
    // 复位当前动作状态
    window.currentAction = null;
}

// ========== 自定义指向动作（动态版，完成后自动复位） ==========
window.profileGreet = function() {
    if (!window.vrmModel || !window.vrmModel.humanoid) {
        console.log('等待模型加载...');
        return;
    }
    
    console.log('执行动态指向动作（完成后自动复位）');
    
    // 获取所有相关骨骼
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = window.vrmModel.humanoid.getNormalizedBoneNode('rightHand');
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    
    let actionStep = 0;
    let phase = 0;
    let isResetting = false;
    
    // 清除之前的定时器
    if (window.actionTimer) {
        clearInterval(window.actionTimer);
        clearTimeout(window.actionTimer);
    }
    
    // 先设置基础姿势
    if (rightArm) {
        rightArm.rotation.x = -0.2;
        rightArm.rotation.z = 0.3;
    }
    if (rightForearm) {
        rightForearm.rotation.x = -1.2;
        rightForearm.rotation.y = 0.1;
    }
    if (rightHand) {
        rightHand.rotation.x = 0.2;
        rightHand.rotation.y = -0.1;
    }
    if (head) {
        head.rotation.x = 0.1;
        head.rotation.y = -0.5;
    }
    if (spine) spine.rotation.z = 0.05;
    
    window.actionTimer = setInterval(() => {
        if (!rightArm || !rightForearm || !head) return;
        
        if (!isResetting && actionStep < 90) {
            // 动态阶段 - 在原有姿势基础上添加轻微摆动
            const t = Math.sin(phase) * 0.08;
            const t2 = Math.cos(phase * 1.5) * 0.06;
            
            // 右手动态
            if (rightArm) {
                rightArm.rotation.x = -0.2 + t * 0.1;
                rightArm.rotation.z = 0.3 + Math.sin(phase * 1.6) * 0.2;
            }
            
            if (rightForearm) {
                rightForearm.rotation.x = -1.2 + Math.sin(phase * 2) * 0.15;
                rightForearm.rotation.y = 0.1 + Math.cos(phase * 1.8) * 0.1;
            }
            
            if (rightHand) {
                rightHand.rotation.x = 0.2 + Math.sin(phase * 2.2) * 0.08;
                rightHand.rotation.y = -0.1 + Math.cos(phase * 2) * 0.08;
            }
            
            // 头部动态
            if (head) {
                head.rotation.x = 0.1 + Math.sin(phase * 1.5) * 0.05;
                head.rotation.y = -0.5 + Math.cos(phase * 1.2) * 0.08;
            }
            
            // 身体动态
            if (spine) {
                spine.rotation.z = 0.05 + Math.sin(phase * 1.3) * 0.03;
            }
            
            phase += 0.2;
            actionStep++;
            
            if (actionStep >= 90) {
                isResetting = true;
                console.log('动态阶段结束，开始复位');
            }
            
        } else {
            // 复位阶段 - 直接复位
            window.resetBones();
            clearInterval(window.actionTimer);
            window.currentAction = null;
            console.log('动作完全复位');
        }
    }, 100);
};

// ========== 关于我们页面语音触发 ==========
function playProfileVoice() {
    console.log('===== 触发关于我们页面语音 =====');
    
    // 先停止上次的互动
    stopProfileInteraction();
    
    // 根据当前页面路径确定音频路径
    const currentPath = window.location.pathname;
    let audioPath = 'shuziren/audio/lupangpang-women.mp3';
    
    // 如果在子目录中，需要返回上一级
    if (currentPath.includes('/women/') || 
        currentPath.includes('/denglu-zhuce/') || 
        currentPath.includes('/fenleijiansuo/')) {
        audioPath = '../shuziren/audio/lupangpang-women.mp3';
    }
    
    console.log('播放语音:', audioPath);
    
    // 创建音频对象并播放
    profileCurrentAudio = new Audio(audioPath);
    
    // 音频播放结束时清理
    profileCurrentAudio.addEventListener('ended', function() {
        console.log('个人主页音频播放结束');
        profileCurrentAudio = null;
    });
    
    // 音频播放错误处理
    profileCurrentAudio.addEventListener('error', function(e) {
        console.log("音频播放失败", e);
        profileCurrentAudio = null;
    });
    
    profileCurrentAudio.play().catch(e => {
        console.log("音频播放失败", e);
        profileCurrentAudio = null;
    });

    // 调用自定义的 profileGreet 动作
    if (window.profileGreet) {
        window.currentAction = 'profileGreet';
        window.profileGreet();
        console.log('profileGreet 动作触发成功');
    } else {
        console.error('profileGreet 动作函数不存在');
    }
}

// ========== 创建介绍按钮（增强版，带调试和备用方案） ==========
function createIntroButton() {
    console.log('开始创建介绍按钮...');
    
    // 调试：输出当前页面信息
    console.log('当前页面路径:', window.location.pathname);
    console.log('页面标题:', document.title);
    
    // 尝试多种选择器找到容器
    const possibleContainers = [
        document.querySelector('.about-container'),
        document.querySelector('.about-page .about-container'),
        document.querySelector('main'),
        document.querySelector('.team-grid')?.parentNode,
        document.querySelector('.thanks-message')?.parentNode
    ];
    
    // 找到第一个有效的容器
    let aboutContainer = null;
    for (let container of possibleContainers) {
        if (container) {
            aboutContainer = container;
            console.log('找到有效容器:', container);
            break;
        }
    }
    
    // 如果仍然没有找到容器，直接插入到 body
    if (!aboutContainer) {
        console.log('未找到任何容器，使用备用方案插入到 body');
        insertButtonToBody();
        return;
    }
    
    // 避免重复创建按钮
    if (document.getElementById('profile-intro-btn')) {
        console.log('按钮已存在，跳过创建');
        return;
    }
    
    // 创建按钮
    const introBtn = document.createElement('button');
    introBtn.id = 'profile-intro-btn';
    introBtn.textContent = '📢 点击了解我们团队';
    introBtn.style.cssText = `
    position: absolute !important;
    top: 520px !important;
    right: 20px !important;
    padding: 8px 20px !important;
    background: linear-gradient(135deg, #e24a4a, #502c4b00) !important;
    color: white !important;
    border: none !important;
    border-radius: 30px !important;
    font-size: 16px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3) !important;
    transition: all 0.3s ease !important;
    border: 2px solid rgba(255,255,255,0.3) !important;
    font-family: 'Microsoft YaHei', sans-serif !important;
    white-space: nowrap !important;
    z-index: 10000 !important;
    width: auto !important;
    min-width: 80px !important;
    text-align: center !important;
`;
    
    // 添加悬停效果
    introBtn.onmouseover = () => {
        introBtn.style.transform = 'scale(1.05)';
        introBtn.style.boxShadow = '0 12px 28px rgba(44, 62, 80, 0.6)';
    };
    
    introBtn.onmouseout = () => {
        introBtn.style.transform = 'scale(1)';
        introBtn.style.boxShadow = '0 8px 20px rgba(44, 62, 80, 0.4)';
    };
    
    // 绑定点击事件
    introBtn.onclick = function() {
        console.log('介绍按钮被点击');
        
        // 检查数字人是否就绪
        if (!window.vrmModel) {
            console.log('数字人未就绪，等待加载...');
            alert('数字人正在加载中，请稍后...');
            return;
        }
        
        // 触发动作和语音
        playProfileVoice();
    };
    
    // 将按钮添加到容器中
    aboutContainer.appendChild(introBtn);
    console.log('✅ 介绍按钮创建成功');
    console.log('按钮位置:', introBtn.getBoundingClientRect());
}



// ========== 页面加载完成后执行 ==========
console.log('vrm-profile.js 已加载');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM 加载完成，准备创建介绍按钮');
        setTimeout(createIntroButton, 2000);
    });
} else {
    console.log('DOM 已就绪，准备创建介绍按钮');
    setTimeout(createIntroButton, 2000);
}

// 导出函数供其他模块使用
window.playProfileVoice = playProfileVoice;
window.profileGreet = window.profileGreet;
window.createIntroButton = createIntroButton;
window.stopProfileInteraction = stopProfileInteraction;