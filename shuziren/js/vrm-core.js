/**
 * VRM数字人核心模块
 * 负责3D场景初始化、模型加载、渲染循环
 * 修改：动态适配不同页面路径，移除硬编码样式
 */

function showLoadingStatus(message) {
    const container = document.getElementById('avatar-container');
    if (!container) return;
    
    let statusDiv = document.getElementById('load-progress');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'load-progress';
        statusDiv.style.position = 'absolute';
        statusDiv.style.bottom = '50px';
        statusDiv.style.left = '50%';
        statusDiv.style.transform = 'translateX(-50%)';
        statusDiv.style.color = 'white';
        statusDiv.style.background = 'rgba(0,0,0,0.7)';
        statusDiv.style.padding = '8px 16px';
        statusDiv.style.borderRadius = '20px';
        statusDiv.style.zIndex = '1000';
        statusDiv.style.fontSize = '14px';
        statusDiv.style.fontWeight = 'bold';
        container.appendChild(statusDiv);
    }
    statusDiv.textContent = message;
}

window.addEventListener('load', function() {
    console.log('开始初始化3D场景...');
    showLoadingStatus('初始化3D场景...');
    
    if (typeof THREE === 'undefined') {
        console.error('THREE 未加载');
        document.getElementById('avatar-container').innerHTML = '<div style="color:red; padding:20px;">THREE.js加载失败</div>';
        return;
    }
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader 未加载');
        document.getElementById('avatar-container').innerHTML = '<div style="color:red; padding:20px;">GLTFLoader加载失败</div>';
        return;
    }
    if (typeof THREE_VRM === 'undefined') {
        console.error('THREE_VRM 未加载');
        document.getElementById('avatar-container').innerHTML = '<div style="color:red; padding:20px;">VRM加载器失败</div>';
        return;
    }
    
    console.log('所有依赖加载成功，开始初始化场景...');
    showLoadingStatus('创建场景...');
    
    window.vrmModel = null;
    window.actionTimer = null;
    window.currentAction = null;
    
    try {
        const container = document.getElementById('avatar-container');
        if (!container) {
            console.error('avatar-container 不存在');
            return;
        }
        
        // 重要：移除硬编码样式，完全由 CSS 控制
        // 容器样式已在 CSS 中定义（如 .about-avatar-wrap），此处不再覆盖
        
        const scene = new THREE.Scene();
        scene.background = null;
        
        const camera = new THREE.PerspectiveCamera(30, 450/700, 0.1, 1000);
        camera.position.set(0, 1.2, 8.4);
        camera.lookAt(0, 1.8, 0);
        window.vrmCamera = camera; 
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(450, 700);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);
        window.vrmRenderer = renderer;
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);
        
        const light1 = new THREE.DirectionalLight(0xffeedd, 0.5);
        light1.position.set(2, 3, 3);
        scene.add(light1);
        
        const light2 = new THREE.DirectionalLight(0xaaccff, 0.25);
        light2.position.set(-2, 1, 2);
        scene.add(light2);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, 1, -3);
        scene.add(backLight);
        
// 动态判断当前页面路径，构建正确的模型路径
// 获取当前页面的完整路径
const currentPath = window.location.pathname;
console.log('当前页面路径:', currentPath);

// 判断是否在子目录中（所有城市页面和功能页面都需要返回上级目录）
const isInSubdirectory = currentPath.includes('/women/') || 
                         currentPath.includes('/huangshan/') || 
                         currentPath.includes('/hefei/') ||
                         currentPath.includes('/anqing/') ||
                         currentPath.includes('/bengbu/') ||
                         currentPath.includes('/bozhou/') ||
                         currentPath.includes('/chizhou/') ||
                         currentPath.includes('/chuzhou/') ||
                         currentPath.includes('/fuyang/') ||
                         currentPath.includes('/huaibei/') ||
                         currentPath.includes('/huainan/') ||
                         currentPath.includes('/maanshan/') ||
                         currentPath.includes('/suzhou/') ||
                         currentPath.includes('/tonglin/') ||
                         currentPath.includes('/wuhu/') ||
                         currentPath.includes('/liuan/') || 
                         currentPath.includes('/xuancheng/') ||
                         currentPath.includes('/denglu-zhuce/') || 
                         currentPath.includes('/fenleijiansuo/') ||
                         currentPath.includes('/user/') ||
                         currentPath.includes('/detail/')||
                         currentPath.includes('/AI/'); 

// 如果在子目录中，使用 ../ 返回上级目录；否则直接使用当前目录
const modelPath = (isInSubdirectory ? '../' : '') + 'shuziren/model.vrm';
console.log('模型加载路径：', modelPath);
showLoadingStatus('加载模型中...');
        
        const loader = new THREE.GLTFLoader();
        if (THREE_VRM.VRMLoaderPlugin) {
            loader.register(plugin => new THREE_VRM.VRMLoaderPlugin(plugin));
            console.log('已注册VRMLoaderPlugin');
        }
        
        loader.load(
            modelPath,
            function(gltf) {
                console.log('GLTF加载成功');
                showLoadingStatus('模型解析中...');
                
                window.vrmModel = gltf.userData.vrm;
                window.vrm = window.vrmModel;
                
                if (!window.vrmModel) {
                    console.error('VRM实例未找到');
                    showLoadingStatus('VRM解析失败');
                    return;
                }
                
                console.log('VRM实例获取成功');
                scene.add(window.vrmModel.scene);
                
                window.vrmModel.scene.scale.set(1.5, 1.5, 1.5);
                window.vrmModel.scene.position.y = -0.2;
                window.vrmModel.scene.rotation.y = 0;
                
                const event = new CustomEvent('vrmModelLoaded', { detail: { vrmModel: window.vrmModel } });
                window.dispatchEvent(event);
                
                console.log('✅ 模型显示成功！');
                showLoadingStatus('加载完成！');
                
                setTimeout(() => {
                    const progressDiv = document.getElementById('load-progress');
                    if (progressDiv) progressDiv.style.display = 'none';
                }, 1000);
            },
            function(progress) {
                const percent = (progress.loaded / progress.total * 100).toFixed(0);
                console.log(`加载进度: ${percent}%`);
                showLoadingStatus(`加载中... ${percent}%`);
            },
            function(error) {
                console.error('模型加载失败:', error);
                console.error('错误详情：', error.message); // 输出详细错误
                showLoadingStatus('模型加载失败');
                document.getElementById('avatar-container').innerHTML += '<div style="color:red; padding:20px;">模型加载失败：' + error.message + '</div>';
            }
        );
        
        function animate() {
            requestAnimationFrame(animate);
            
            const time = Date.now() * 0.002;
            
            if (!window.currentAction && window.vrmModel && window.vrmModel.humanoid) {
                const head = window.vrmModel.humanoid.getNormalizedBoneNode('head');
                if (head) {
                    head.rotation.y = Math.sin(time * 0.3) * 0.15;
                    head.rotation.x = Math.sin(time * 0.5) * 0.05;
                }
                
                const rightArm = window.vrmModel.humanoid.getNormalizedBoneNode('rightUpperArm');
                const leftArm = window.vrmModel.humanoid.getNormalizedBoneNode('leftUpperArm');
                
                if (rightArm) {
                    rightArm.rotation.z = 1.3 + Math.sin(time * 0.8) * 0.03;
                }
                if (leftArm) {
                    leftArm.rotation.z = -1.3 + Math.sin(time * 0.8 + Math.PI) * 0.03;
                }
                
                window.vrmModel.scene.position.y = -0.2 + Math.sin(Date.now() * 0.002) * 0.015;
                
                const spine = window.vrmModel.humanoid.getNormalizedBoneNode('spine');
                if (spine) {
                    spine.rotation.x = Math.sin(time * 0.5) * 0.02;
                }
            }
            
            if (window.vrmModel && typeof window.vrmModel.update === 'function') {
                window.vrmModel.update(0.016);
            }
            
            renderer.render(scene, camera);
        }
        
        animate();
        
    } catch (error) {
        console.error('初始化过程出错:', error);
        document.getElementById('avatar-container').innerHTML = '<div style="color:red; padding:20px;">初始化失败：' + error.message + '</div>';
    }
});
// ==================== 添加数字人右侧竖排气泡按钮 ====================
function createAvatarBubbleButton() {
    // 判断当前页面是否是聊天界面
    const currentPath = window.location.pathname;
    const isChatPage = currentPath.includes('/AI/chat_with_luxiaopang.html') || 
                       currentPath.includes('chat_with_luxiaopang.html');
    
    // 如果是聊天界面，不创建气泡
    if (isChatPage) {
        console.log('当前是聊天界面，不显示气泡按钮');
        return;
    }
    
    console.log('开始创建右侧竖排气泡按钮...');
    
    
    // 等待模型加载完成
    const checkInterval = setInterval(() => {
        if (!window.vrmModel || !window.vrmModel.scene) {
            console.log('模型未就绪，继续等待...');
            return;
        }
        
        clearInterval(checkInterval);
        console.log('模型已就绪，开始创建气泡按钮');
        
        // 获取容器
        const container = document.getElementById('avatar-container');
        if (!container) {
            console.error('找不到 avatar-container');
            return;
        }
        
        // 确保容器有相对定位
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        // 检查是否已有气泡，避免重复创建
        if (document.querySelector('.avatar-bubble-wrapper')) {
            console.log('气泡已存在，跳过创建');
            return;
        }
        
        // 创建气泡按钮容器
        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.className = 'avatar-bubble-wrapper';
        
        // 创建气泡按钮 - 文字竖排
        const bubbleButton = document.createElement('div');
        bubbleButton.className = 'chat-bubble-btn';
       // 修改气泡按钮的 HTML 部分
      bubbleButton.innerHTML = `
      <div class="bubble-content">
          <div class="bubble-arrow"></div>
          <div class="bubble-text">
              <i class="fa-regular fa-comment-dots"></i>
              <div class="vertical-text">
                  点<br>击<br>和<br>我<br>聊<br>天
            </div>
            <i class="fa-regular fa-hand-peace"></i>
        </div>
    </div>
`;
        
        // 添加样式
        const styleId = 'bubble-button-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .avatar-bubble-wrapper {
                    position: absolute;
                    right: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 1000;
                    pointer-events: auto;
                    cursor: pointer;
                    animation: bubbleFloat 3s ease-in-out infinite;
                }
                
                .chat-bubble-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 25px;
                    padding: 15px 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    transition: all 0.3s ease;
                    position: relative;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                }
                
                .bubble-content {
                    position: relative;
                    display: flex;
                    justify-content: center;
                }
                
                .bubble-arrow {
                    position: absolute;
                    left: -10px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 0;
                    height: 0;
                    border-top: 10px solid transparent;
                    border-bottom: 10px solid transparent;
                    border-right: 10px solid #764ba2;
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
                }
                
                .bubble-text {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }
                
                /* 竖排文字样式 */
                .vertical-words {
                    font-size: 18px;
                    font-weight: bold;
                    line-height: 1.6;
                    text-align: center;
                    letter-spacing: 4px;
                    writing-mode: vertical-rl;
                    text-orientation: upright;
                }
                
                .bubble-text i {
                    font-size: 22px;
                    animation: iconWave 1s ease-in-out infinite;
                }
                
                .chat-bubble-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
                }
                
                .chat-bubble-btn:active {
                    transform: scale(0.98);
                }
                
                @keyframes bubbleFloat {
                    0%, 100% {
                        transform: translateY(-50%) translateX(0px);
                    }
                    50% {
                        transform: translateY(-50%) translateX(-5px);
                    }
                }
                
                @keyframes blink {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
                
                .chat-bubble-btn {
                    animation: blink 2s ease-in-out 3;
                }
                
                @keyframes iconWave {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    25% {
                        transform: rotate(15deg);
                    }
                    75% {
                        transform: rotate(-15deg);
                    }
                }
                
                @media (max-width: 768px) {
                    .avatar-bubble-wrapper {
                        right: 10px;
                    }
                    .chat-bubble-btn {
                        padding: 12px 8px;
                    }
                    .vertical-words {
                        font-size: 14px;
                        letter-spacing: 2px;
                    }
                    .bubble-text i {
                        font-size: 18px;
                    }
                    .bubble-arrow {
                        left: -8px;
                        border-right: 8px solid #764ba2;
                        border-top: 8px solid transparent;
                        border-bottom: 8px solid transparent;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // 添加点击事件
        bubbleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('气泡按钮被点击');
            
            // 添加点击动画
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // 跳转到AI聊天界面
            const currentPath = window.location.pathname;
            const isInSubdirectory = currentPath.includes('/women/') || 
                         currentPath.includes('/huangshan/') || 
                         currentPath.includes('/hefei/') ||
                         currentPath.includes('/anqing/') ||
                         currentPath.includes('/bengbu/') ||
                         currentPath.includes('/bozhou/') ||
                         currentPath.includes('/chizhou/') ||
                         currentPath.includes('/chuzhou/') ||
                         currentPath.includes('/fuyang/') ||
                         currentPath.includes('/huaibei/') ||
                         currentPath.includes('/huainan/') ||
                         currentPath.includes('/maanshan/') ||
                         currentPath.includes('/suzhou/') ||
                         currentPath.includes('/tonglin/') ||
                         currentPath.includes('/wuhu/') ||
                         currentPath.includes('/liuan/') || 
                         currentPath.includes('/xuancheng/') ||
                         currentPath.includes('/denglu-zhuce/') || 
                         currentPath.includes('/fenleijiansuo/') ||
                         currentPath.includes('/user/') ||
                         currentPath.includes('/detail/')||
                         currentPath.includes('/AI/'); 
            
            let targetUrl = '';
            if (isInSubdirectory) {
                targetUrl = '../AI/chat_with_luxiaopang.html';
            } else {
                targetUrl = './AI/chat_with_luxiaopang.html';
            }
            
            console.log('跳转到:', targetUrl);
            
            // 添加跳转过渡效果
            document.body.style.transition = 'opacity 0.3s';
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 300);
        });
        
        // 鼠标悬停提示
        bubbleButton.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'bubble-tooltip';
            tooltip.textContent = '✨ 快来和我聊天吧 ✨';
            tooltip.style.cssText = `
                position: absolute;
                right: 100%;
                top: 50%;
                transform: translateY(-50%);
                margin-right: 12px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 1001;
                pointer-events: none;
                font-family: sans-serif;
            `;
            this.appendChild(tooltip);
            setTimeout(() => {
                if (tooltip && tooltip.parentNode) tooltip.remove();
            }, 2000);
        });
        
        bubbleButton.addEventListener('mouseleave', function() {
            const tooltip = this.querySelector('.bubble-tooltip');
            if (tooltip) tooltip.remove();
        });
        
        bubbleWrapper.appendChild(bubbleButton);
        container.appendChild(bubbleWrapper);
        
        console.log('✅ 右侧竖排气泡按钮创建成功（文字竖排）');
        
    }, 500);
}

// 在模型加载成功后调用
if (window.vrmModel) {
    setTimeout(createAvatarBubbleButton, 1000);
} else {
    window.addEventListener('vrmModelLoaded', function() {
        setTimeout(createAvatarBubbleButton, 500);
    });
}

// 备用：如果5秒后还没有气泡，强制创建
setTimeout(() => {
    if (!document.querySelector('.avatar-bubble-wrapper')) {
        console.log('备用方案：强制创建气泡');
        createAvatarBubbleButton();
    }
}, 5000);