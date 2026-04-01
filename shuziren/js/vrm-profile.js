/**
 * VRM数字人个人主页互动模块
 * 点击介绍按钮时触发自定义指向动作（不复位）
 */

// ========== 全局变量 ==========
let profileCurrentAudio = null; // 当前正在播放的个人主页音频
let profileActionTimer = null; // 个人主页动作定时器

// ========== 修复鼠标事件穿透问题 ==========
function fixMouseEvents() {
    console.log('修复鼠标事件穿透问题...');
    
    // 查找数字人容器
    const avatarContainer = document.getElementById('avatar-container');
    if (avatarContainer) {
        // 让容器本身不拦截鼠标事件
        avatarContainer.style.pointerEvents = 'none';
        
        // 但让里面的按钮可以点击
        const btn = document.getElementById('profile-intro-btn');
        if (btn) {
            btn.style.pointerEvents = 'auto';
        }
        
        console.log('已设置容器 pointer-events: none');
    }
    
    // 查找 canvas 元素并修复
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        // 确保 canvas 不拦截鼠标事件
        canvas.style.pointerEvents = 'none';
        console.log('已修复 canvas 鼠标事件');
    });
}

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
    
    // 停止个人主页动作定时器
    if (profileActionTimer) {
        clearInterval(profileActionTimer);
        clearTimeout(profileActionTimer);
        profileActionTimer = null;
        console.log('已停止个人主页动作定时器');
    }
    
    // 停止可能存在的其他动作定时器
    if (window.actionTimer) {
        clearInterval(window.actionTimer);
        clearTimeout(window.actionTimer);
        window.actionTimer = null;
    }
    
    // 复位骨骼到自然状态
    if (window.resetBones) {
        window.resetBones();
        console.log('已复位骨骼');
    }
    
    // 复位当前动作状态
    window.currentAction = null;
}

// ========== 自定义指向动作 ==========
window.profileGreet = function() {
    if (!window.vrmModel || !window.vrmModel.humanoid) {
        console.log('等待模型加载...');
        return;
    }
    
    console.log('执行动作（动态效果，完成后自动复位）');
    
    // 获取所有相关骨骼
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = window.vrmModel.humanoid.getNormalizedBoneNode('rightHand');
    const leftArm = window.vrmModel.humanoid.getNormalizedBoneNode('leftUpperArm');
    const leftForearm = window.vrmModel.humanoid.getNormalizedBoneNode('leftLowerArm');
    const leftHand = window.vrmModel.humanoid.getNormalizedBoneNode('leftHand');
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    const chest = window.vrmModel.humanoid.getNormalizedBoneNode('chest');
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    
    let actionStep = 0;
    let phase = 0;
    let isResetting = false;
    
    // 清除之前的定时器
    if (window.actionTimer) {
        clearInterval(window.actionTimer);
        clearTimeout(window.actionTimer);
    }
    
    window.actionTimer = setInterval(() => {
        if (!rightArm || !rightForearm || !head) return;
        
        if (!isResetting && actionStep < 105) {
            // 动态阶段 - 在原有姿势基础上添加轻微摆动
            const t = Math.sin(phase) * 0.06;
            const t2 = Math.cos(phase * 1.3) * 0.05;
            
            // 右手动态
            if (rightArm) {
                rightArm.rotation.x = 0.1 + t * 0.12;
                rightArm.rotation.z = 0.2 + Math.sin(phase * 1.5) * 0.08;
                rightArm.rotation.y = 0.05 + t2 * 0.05;
            }
            
            if (rightForearm) {
                rightForearm.rotation.x = -1.0 + Math.sin(phase * 2) * 0.15;
                rightForearm.rotation.y = 0.5 + Math.cos(phase * 1.8) * 0.12;
                rightForearm.rotation.z = 0.1 + Math.sin(phase * 2.5) * 0.05;
            }
            
            if (rightHand) {
                rightHand.rotation.x = 0.2 + Math.sin(phase * 2.2) * 0.08;
                rightHand.rotation.y = -0.3 + Math.cos(phase * 2) * 0.1;
                rightHand.rotation.z = 0.1 + Math.sin(phase * 3) * 0.03;
            }
            
            // 左手动态
            if (leftArm) {
                leftArm.rotation.x = -0.001 + Math.sin(phase * 1.2) * 0.04;
                leftArm.rotation.z = -0.7;
                leftArm.rotation.y = 10;
            }
            
            if (leftForearm) {
                leftForearm.rotation.x = -0.1 + Math.sin(phase * 1.8) * 0.05;
                leftForearm.rotation.y = -0.1 + Math.cos(phase * 1.6) * 0.04;
            }
            
            if (leftHand) {
                leftHand.rotation.x = -0.2 + Math.sin(phase * 2) * 0.04;
                leftHand.rotation.y = 0.1 + Math.cos(phase * 1.9) * 0.03;
            }
            
            // 头部动态
            if (head) {
                head.rotation.x = 0.1 + Math.sin(phase * 1.5) * 0.05;
                head.rotation.y = -0.5 + Math.cos(phase * 1.2) * 0.08;
                head.rotation.z = 0.05 + Math.sin(phase * 2) * 0.03;
            }
            
            // 身体动态
            if (spine) {
                spine.rotation.x = 0.05 + Math.sin(phase * 1.1) * 0.03;
                spine.rotation.y = -0.3 + Math.cos(phase * 1.3) * 0.05;
            }
            if (chest) {
                chest.rotation.x = -0.03 + Math.sin(phase * 1.2) * 0.02;
                chest.rotation.y = -0.15 + Math.cos(phase * 1.4) * 0.03;
            }
            
            phase += 0.18;
            actionStep++;
            
            if (actionStep >= 105) {
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
    
    console.log('动态动作已开始');
};

// ========== 个人主页语音触发 ==========
function playProfileVoice() {
    console.log('===== 触发个人主页语音 =====');
    
    // 先停止上次的互动
    stopProfileInteraction();
    
    // 根据当前页面路径确定音频路径
    const currentPath = window.location.pathname;
    let audioPath = 'shuziren/audio/lupangpang-profile.mp3';
    
    // 如果在子目录中，需要返回上一级
    if (currentPath.includes('/women/') || 
        currentPath.includes('/denglu-zhuce/') || 
        currentPath.includes('/fenleijiansuo/') ||
        currentPath.includes('/user/')) {
        audioPath = '../shuziren/audio/lupangpang-profile.mp3';
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

    // 调用自定义的 profileGreet 动作（不复位）
    if (window.profileGreet) {
        window.currentAction = 'profileGreet';
        window.profileGreet();
        console.log('profileGreet 动作触发成功');
    } else {
        console.error('profileGreet 动作函数不存在');
    }
}

// ========== 创建个人主页介绍按钮 ==========
function createProfileIntroButton() {
    console.log('开始创建个人主页介绍按钮...');
    
    // 查找个人主页的容器
    const possibleContainers = [
        document.querySelector('.user-container'),
        document.querySelector('.user-page'),
        document.querySelector('main'),
        document.querySelector('.user-info-section')
    ];
    
    // 找到第一个有效的容器
    let container = null;
    for (let c of possibleContainers) {
        if (c) {
            container = c;
            console.log('找到有效容器:', c);
            break;
        }
    }
    
    // 如果仍然没有找到容器，使用 avatar-container 作为父容器
    if (!container) {
        container = document.getElementById('avatar-container');
        console.log('使用 avatar-container 作为容器');
    }
    
    if (!container) {
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
   introBtn.textContent = '🎨 开启非遗之旅';
   introBtn.style.cssText = `
    position: absolute !important;
    top: 680px !important;        /* 在数字人头顶上方 */
    right: 300px !important;        /* 右侧对齐 */
    padding: 8px 20px !important;
    background: linear-gradient(135deg, #4a70e2, #2c3e5000) !important;
    color: white !important;
    border: none !important;
    border-radius: 30px !important;
    font-size: 14px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3) !important;
    transition: all 0.3s ease !important;
    border: 2px solid rgba(255,255,255,0.3) !important;
    font-family: 'Microsoft YaHei', sans-serif !important;
    white-space: nowrap !important;
    z-index: 10000 !important;
    width: auto !important;
    min-width: 140px !important;
    text-align: center !important;
    letter-spacing: 0.5px !important;
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
        console.log('个人主页介绍按钮被点击');
        
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
    container.appendChild(introBtn);
    console.log('✅ 个人主页介绍按钮创建成功');
    
    // 更新鼠标事件修复
    setTimeout(fixMouseEvents, 500);
}


// ========== 页面加载完成后执行 ==========
console.log('vrm-profile.js 已加载');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM 加载完成，准备创建个人主页介绍按钮');
        // 给一点延迟确保其他脚本已加载
        setTimeout(() => {
            createProfileIntroButton();
            fixMouseEvents();
        }, 2000);
    });
} else {
    console.log('DOM 已就绪，准备创建个人主页介绍按钮');
    setTimeout(() => {
        createProfileIntroButton();
        fixMouseEvents();
    }, 2000);
}

// 监听 vrmModelLoaded 事件
window.addEventListener('vrmModelLoaded', function() {
    console.log('收到 vrmModelLoaded 事件');
    // 不自动触发语音，只确保按钮存在
    if (!document.getElementById('profile-intro-btn')) {
        createProfileIntroButton();
    }
    fixMouseEvents();
});

// 导出函数供其他模块使用
window.playProfileVoice = playProfileVoice;
window.profileGreet = window.profileGreet;
window.createProfileIntroButton = createProfileIntroButton;
window.stopProfileInteraction = stopProfileInteraction;