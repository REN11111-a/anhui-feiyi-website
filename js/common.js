// js/common.js
/**
 * 通用浏览历史记录函数
 * @param {string} heritageName - 非遗名称
 */
function addBrowseHistory(heritageName) {
    if (!heritageName || heritageName.trim() === '') {
        console.warn('非遗名称不能为空，无法记录浏览历史');
        return;
    }

    let browseHistory = JSON.parse(localStorage.getItem('browseHistory')) || [];
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newRecord = { name: heritageName.trim(), time: timeStr };

    // 去重：删除同名旧记录
    browseHistory = browseHistory.filter(item => item.name !== newRecord.name);
    // 新记录置顶
    browseHistory.unshift(newRecord);
    // 限制最多10条
    if (browseHistory.length > 10) browseHistory = browseHistory.slice(0, 10);

    localStorage.setItem('browseHistory', JSON.stringify(browseHistory));
}