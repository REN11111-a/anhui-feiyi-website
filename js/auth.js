// auth.js - 统一导航栏动态更新（v4 - 改进的路径计算）

$(document).ready(function() {
    var $userLink = $('#user-link a');
    if (!$userLink.length) return;

    // 获取当前登录用户
    var currentUser = localStorage.getItem('currentUser');

    // ===== 改进的路径计算方法 =====
    // 检测当前页面是否在子文件夹中
    var pathname = window.location.pathname;
    var prefix = '';
    
    // 检查是否在已知的子文件夹中
    var subfolders = [
        'denglu-zhuce', 'anqing', 'bengbu', 'bozhou', 'chizhou', 'chuzhou',
        'fenleijiansuo', 'fuyang', 'hefei', 'huaibei', 'huainan', 'huangshan',
        'images', 'js', 'liuan', 'maanshan', 'suzhou', 'tonglin', 'women',
        'wuhu', 'xuancheng', '免责声明'
    ];
    
    for (var i = 0; i < subfolders.length; i++) {
        if (pathname.indexOf('/' + subfolders[i] + '/') !== -1) {
            prefix = '../';
            break;
        }
    }

    if (currentUser) {
        // 已登录：显示“个人主页”，链接到根目录下的 profile.html
        var profileHref = prefix + 'profile.html';
        // 如果当前页面已经是个人主页，可以设为 # 避免刷新，但为了统一，仍指向 profile.html
        $userLink.text('个人主页').attr('href', profileHref);
    } else {
        // 未登录：显示“用户登录与注册”，链接到登录页
        var loginHref = prefix + 'denglu-zhuce/denglu-zhuce.html';
        $userLink.text('用户登录与注册').attr('href', loginHref);
    }

    // 可选：如果当前页面就是登录页或注册页，可以禁用链接（但保持文字不变）
    if (pathname.indexOf('denglu-zhuce/denglu-zhuce.html') !== -1 && !currentUser) {
        // 在登录页，链接指向自身，可以改为 # 避免重复跳转
        $userLink.attr('href', '#');
    }
    if (pathname.indexOf('profile.html') !== -1 && currentUser) {
        // 在个人主页，链接指向自身
        $userLink.attr('href', '#');
    }
});