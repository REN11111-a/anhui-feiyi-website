/**
 * VRM数字人统一初始化脚本
 * 按顺序加载所有模块
 */

// 确保在DOM加载完成后执行
(function() {
    console.log('VRM数字人模块初始化...');
    
    // 检查是否已经加载过
    if (window.vrmInitialized) return;
    window.vrmInitialized = true;
    
    // 动态加载脚本的函数
    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        script.onerror = function() {
            console.error('脚本加载失败:', src);
        };
        document.head.appendChild(script);
    }

    // 顺序加载各个模块
    const scripts = [
        'shuziren/js/vrm-actions.js',
        'shuziren/js/vrm-core.js',
        'shuziren/js/voice-interaction.js'
    ];
    
    let loadedCount = 0;
    
    function loadNext() {
        if (loadedCount < scripts.length) {
            loadScript(scripts[loadedCount], function() {
                loadedCount++;
                loadNext();
            });
        } else {
            console.log('所有VRM模块加载完成');
        }
    }
    
    loadNext();
})();