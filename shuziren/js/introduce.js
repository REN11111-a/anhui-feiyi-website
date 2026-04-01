/**
 * 安徽省城市介绍互动模块
 * 根据当前页面自动识别城市，点击按钮播放该城市音频
 */

(function() {
    console.log('初始化安徽城市互动模块...');
    
    // ========== 数字人大小配置 ==========
    const AVATAR_CONFIG = {
        containerWidth: '300px',    // 容器宽度（调大）
        containerHeight: '500px',   // 容器高度（调大）
        modelScale: 1.8,            // 模型缩放 (1.3=小, 1.5=中, 1.8=大, 2.0=更大)
        positionRight: '-20px',      // 距离右侧距离
        positionTop: '40%'          // 垂直位置
    };
    
    // ========== 定义复位骨骼函数（如果不存在） ==========
    if (typeof window.resetBones !== 'function') {
        window.resetBones = function() {
            console.log('复位骨骼');
            if (!window.vrmModel || !window.vrmModel.humanoid) return;
            
            // 获取所有骨骼并复位
            const bones = [
                'head', 'spine', 'chest', 'rightUpperArm', 'leftUpperArm',
                'rightLowerArm', 'leftLowerArm', 'rightHand', 'leftHand'
            ];
            
            bones.forEach(boneName => {
                const bone = window.vrmModel.humanoid.getNormalizedBoneNode(boneName);
                if (bone) {
                    bone.rotation.x = 0;
                    bone.rotation.y = 0;
                    bone.rotation.z = 0;
                }
            });
        };
    }
    
    // ========== 自定义挥手动作 ==========
window.customWaveHand = function() {
    if (!window.vrmModel || !window.vrmModel.humanoid) {
        console.log('等待模型加载...');
        return;
    }
    
    console.log('执行自定义挥手动作');
    
    // 先复位
    if (window.resetBones) {
        window.resetBones();
    }
    
    const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightForearm = window.vrmModel.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = window.vrmModel.humanoid.getNormalizedBoneNode('rightHand');
    const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
    const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
    const leftArm = window.vrmModel.humanoid.getNormalizedBoneNode('leftUpperArm');
    const leftForearm = window.vrmModel.humanoid.getNormalizedBoneNode('leftLowerArm');
    
    let waveStep = 0;
    let phase = 0;
    let isResetting = false;
    
    // 设置初始姿势
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
    if (head) head.rotation.x = 0.1;
    if (spine) spine.rotation.z = 0.05;
    if (leftArm)
        {
        leftArm.rotation.x = 0;
        leftArm.rotation.y = 0;        
        leftArm.rotation.z = -1.24;
    }
    if (leftForearm) 
        {
        leftForearm.rotation.x =0;
        leftForearm.rotation.y =0;
        leftForearm.rotation.z =-0.1;
    }
    // 平滑插值函数
    function smoothLerp(current, target, speed) {
        return current + (target - current) * speed;
    }
    
    // 清除之前的定时器
    if (window.actionTimer) {
        clearInterval(window.actionTimer);
        clearTimeout(window.actionTimer);
    }
    
    window.actionTimer = setInterval(() => {
        if (!rightForearm || !rightArm) return;
        
        if (!isResetting && waveStep < 120) {
            // 挥手摆动阶段
            const swingAmount = Math.sin(phase * 0.8) * 0.7;
            
            if (rightForearm) {
                rightForearm.rotation.y = smoothLerp(rightForearm.rotation.y, 1 + swingAmount, 0.3);
                rightForearm.rotation.x = -1.2;
            }
            
            if (rightHand) {
                rightHand.rotation.y = smoothLerp(rightHand.rotation.y, -0.1 + swingAmount * 0.5, 0.3);
            }
            
            if (head) {
                head.rotation.x = smoothLerp(head.rotation.x, 0.1 + Math.sin(phase * 0.8) * 0.05, 0.3);
                head.rotation.y = smoothLerp(head.rotation.y, Math.sin(phase * 0.8) * 0.1, 0.3);
            }
            
            phase += 0.8;
            waveStep++;
            
            // 挥手结束后进入复位阶段
            if (waveStep >= 120) {
                isResetting = true;
                console.log('挥手结束，开始直接复位');
            }
            
        }  else {
            // 复位阶段 - 直接复位
            window.resetBones();
            clearInterval(window.actionTimer);
            window.currentAction = null;
            console.log('动作完全复位');
        }
    }, 60); // 50ms间隔，动作更流畅
};
    
// 判断是否在子目录中（适用于所有城市页面和功能页面）
function isInSubdirectory() {
    const path = window.location.pathname;
    
    // 所有需要返回上级目录的页面路径
    const subdirectories = [
        '/women/', '/denglu-zhuce/', '/fenleijiansuo/', '/user/',
        // 安徽省16个城市目录
        '/huangshan/', '/hefei/', '/wuhu/', '/bengbu/', '/huainan/', 
        '/maanshan/', '/huaibei/', '/tonglin/', '/anqing/', '/chuzhou/', 
        '/fuyang/', '/suzhou/', '/liuan/', '/bozhou/', '/chizhou/', '/xuancheng/'
    ];
    
    // 检查是否匹配任何一个子目录
    return subdirectories.some(dir => path.includes(dir));
}

// 音频基础路径
let audioBasePath = 'shuziren/audio/';

// 判断是否在子目录中
if (isInSubdirectory()) {
    audioBasePath = '../shuziren/audio/';
}
    
    // 根据当前页面路径获取城市名称
    function getCurrentCity() {
        const path = window.location.pathname;
        
        // 城市与路径的映射
        const cityMap = {
            'huangshan': '黄山市',
            'hefei': '合肥市',
            'wuhu': '芜湖市',
            'bengbu': '蚌埠市',
            'huainan': '淮南市',
            'maanshan': '马鞍山市',
            'huaibei': '淮北市',
            'tonglin': '铜陵市',
            'anqing': '安庆市',
            'chuzhou': '滁州市',
            'fuyang': '阜阳市',
            'suzhou': '宿州市',
            'liuan': '六安市',
            'bozhou': '亳州市',
            'chizhou': '池州市',
            'xuancheng': '宣城市'
        };
        
        // 查找匹配的城市
        for (const [key, value] of Object.entries(cityMap)) {
            if (path.includes(key)) {
                return value;
            }
        }
        
        // 默认返回黄山市
        return '黄山市';
    }
    
    // 获取当前城市
    const currentCity = getCurrentCity();
    console.log('当前城市:', currentCity);
    
    // 创建单个互动按钮
    function createInteractiveButton() {
        if (document.getElementById('city-interactive-btn')) {
            return document.getElementById('city-interactive-btn');
        }
        
        const button = document.createElement('button');
        button.id = 'city-interactive-btn';
        button.textContent = `🎙️ ${currentCity}`;
        button.style.cssText = `
            position: absolute;
            bottom: -5px;
            left: 91%;
            transform: translateX(-50%);
            padding: 12px 24px;
            font-size: 16px;
            color: #fff;
            background: linear-gradient(135deg, #e2f59e4a, #764ba200);
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 100;
            font-weight: bold;
            white-space: nowrap;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateX(-50%) scale(1.05)';
            button.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateX(-50%) scale(1)';
            button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        });
        
        button.addEventListener('click', () => {
            playCityAudio(currentCity);
        });
        
        return button;
    }
    
    // 播放城市音频
    function playCityAudio(city) {
        const audioPath = audioBasePath + city + '.mp3';
        console.log('播放音频:', audioPath);
        
        // 停止当前音频（如果有）
        if (window.currentAudio) {
            window.currentAudio.pause();
            window.currentAudio.currentTime = 0;
        }
        
        const audio = new Audio(audioPath);
        window.currentAudio = audio;
        
        audio.onended = () => {
            console.log('音频播放结束');
            window.currentAudio = null;
        };
        
        audio.onerror = () => {
            console.log(`音频文件不存在: ${city}.mp3`);
            window.currentAudio = null;
        };
        
        audio.play().catch(e => {
            console.log("音频播放失败", e);
        });
        
        // 触发数字人动作 - 使用自定义挥手动作
        triggerCityAction();
    }
    
    // 触发数字人动作 - 使用自定义挥手动作
    function triggerCityAction() {
        // 停止当前动作
        if (window.actionTimer) {
            clearInterval(window.actionTimer);
            clearTimeout(window.actionTimer);
            window.actionTimer = null;
        }
        
        // 使用自定义挥手动作
        if (window.customWaveHand) {
            window.currentAction = 'customWaveHand';
            window.customWaveHand();
            console.log('触发自定义挥手动作');
        } else if (window.nodHead) {
            // 备用动作：如果挥手动作不存在，使用点头
            window.nodHead();
            console.log('备用动作：点头');
        }
    }
    
    // 调整数字人位置和大小 —— 优化版：无缩放过程
    function adjustAvatarPosition() {
        const avatarContainer = document.getElementById('avatar-container');
        if (!avatarContainer) {
            console.log('avatar-container 不存在');
            return;
        }
        
        // 立即设置容器样式，不延迟、不变化
        avatarContainer.style.cssText = `
            position: absolute !important;
            top: ${AVATAR_CONFIG.positionTop} !important;
            right: ${AVATAR_CONFIG.positionRight} !important;
            transform: translateY(-50%) !important;
            width: ${AVATAR_CONFIG.containerWidth} !important;
            height: ${AVATAR_CONFIG.containerHeight} !important;
            z-index: 20 !important;
            cursor: pointer !important;
            border-radius: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
            background: transparent !important;
            border: none !important;
        `;

        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.style.position = 'relative';
            if (avatarContainer.parentElement !== heroSection) {
                heroSection.appendChild(avatarContainer);
            }
        }

        // 立即设置canvas，不让它有大小变化
        const canvas = avatarContainer.querySelector('canvas');
        if (canvas) {
            canvas.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                object-fit: contain !important;
            `;
        }

        // 模型一加载就设置好目标缩放，彻底消除变大过程
        if (window.vrmModel?.scene) {
            const scale = AVATAR_CONFIG.modelScale;
            window.vrmModel.scene.scale.set(scale, scale, scale);
        }
    }
    
    // 添加按钮到页面
    function addButtonToPage() {
        const button = createInteractiveButton();
        
        // 将按钮添加到 hero-section 或 avatar-container 中
        const heroSection = document.querySelector('.hero-section');
        const avatarContainer = document.getElementById('avatar-container');
        
        if (heroSection) {
            heroSection.appendChild(button);
            console.log('按钮已添加到 hero-section');
        } else if (avatarContainer) {
            avatarContainer.appendChild(button);
            console.log('按钮已添加到 avatar-container');
        } else {
            document.body.appendChild(button);
            console.log('按钮已添加到 body');
        }
    }
    
    // 初始化
    function init() {
        console.log('初始化安徽城市互动模块...');
        
        // 立即执行，无延迟，容器一开始就是目标大小
        adjustAvatarPosition();
        addButtonToPage();
        
        console.log(`当前城市: ${currentCity}`);
        console.log(`音频路径: ${audioBasePath}${currentCity}.mp3`);
        console.log(`数字人配置: 容器=${AVATAR_CONFIG.containerWidth}x${AVATAR_CONFIG.containerHeight}, 模型缩放=${AVATAR_CONFIG.modelScale}`);
    }
    
    // 监听数字人加载完成事件 —— 加载完成后立即设置尺寸，无延迟
    window.addEventListener('vrmModelLoaded', function() {
        console.log('数字人模型已加载，设置最终尺寸...');
        adjustAvatarPosition();
    });
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();