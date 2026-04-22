let currentUser = null;
let profileUserId = null;
let isMyProfile = false;
let isManageMode = false;
let selectedPosts = new Set();

// ==================== 更新导航栏（根据登录状态） ====================
function updateUserNavLink() {
    const userLinkLi = document.getElementById('user-link');
    if (!userLinkLi) return;
    
    const user = currentUser || JSON.parse(localStorage.getItem('supabase_user') || 'null');
    
    if (user && user.id) {
        userLinkLi.innerHTML = '<a href="../profile.html">个人主页</a>';
    } else {
        userLinkLi.innerHTML = '<a href="../denglu-zhuce/denglu-zhuce.html">用户登录与注册</a>';
    }
}

// ==================== DOM 加载完成 ====================
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    
    updateUserNavLink();
    
    if (!currentUser) {
        alert('请先登录');
        location.href = '../denglu-zhuce/denglu-zhuce.html';
        return;
    }

    localStorage.setItem('supabase_user', JSON.stringify(currentUser));

    profileUserId = localStorage.getItem('currentProfileUserId') || currentUser.id;
    isMyProfile = currentUser.id === profileUserId;

    await loadUserProfileFromSupabase();
    await loadMoments();
    
    // 从数据库加载封面（替代原来的 loadSavedCover）
    await loadCoverFromDatabase(profileUserId);

    const actionBtns = document.getElementById('profileActions');
    const coverEditBtn = document.getElementById('coverEditBtn');
    if (isMyProfile) {
        if (actionBtns) actionBtns.style.display = 'flex';
        if (coverEditBtn) coverEditBtn.style.display = 'flex';
        // 初始化封面上传功能（仅当是自己的主页时）
        initCoverFunction();
    } else {
        if (actionBtns) actionBtns.style.display = 'none';
        if (coverEditBtn) coverEditBtn.style.display = 'none';
    }

    const manageBtn = document.getElementById('manageBtn');
    const cancelManage = document.getElementById('cancelManage');
    const deleteSelected = document.getElementById('deleteSelected');
    
    if (manageBtn) manageBtn.onclick = enterManageMode;
    if (cancelManage) cancelManage.onclick = exitManageMode;
    if (deleteSelected) deleteSelected.onclick = deleteSelectedPosts;
});

// ==================== Supabase Auth 状态监听 ====================
if (supabaseClient && supabaseClient.auth) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            localStorage.setItem('supabase_user', JSON.stringify(session.user));
            currentUser = session.user;
            updateUserNavLink();
            if (profileUserId) {
                loadUserProfileFromSupabase();
                loadMoments();
            }
        } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('supabase_user');
            currentUser = null;
            updateUserNavLink();
            location.href = '../denglu-zhuce/denglu-zhuce.html';
        }
    });
}

// 进入管理模式
function enterManageMode() {
    isManageMode = true;
    selectedPosts.clear();
    loadMoments();
    const manageBar = document.getElementById('manageBar');
    if (manageBar) manageBar.style.display = 'flex';
}

// 退出管理模式
function exitManageMode() {
    isManageMode = false;
    selectedPosts.clear();
    loadMoments();
    const manageBar = document.getElementById('manageBar');
    if (manageBar) manageBar.style.display = 'none';
}

// ==================== 【最简单有效】勾选功能 ====================
window.toggleSelect = function(id) {
    if (selectedPosts.has(id)) {
        selectedPosts.delete(id);
    } else {
        selectedPosts.add(id);
    }
};

// 批量删除
async function deleteSelectedPosts() {
    if (selectedPosts.size === 0) {
        alert('请先选择要删除的帖子！');
        return;
    }
    if (!confirm('确定删除选中的帖子？')) return;

    try {
        const ids = Array.from(selectedPosts);
        await supabaseClient.from('likes').delete().in('post_id', ids);
        await supabaseClient.from('comments').delete().in('post_id', ids);
        await supabaseClient.from('posts').delete().in('id', ids);
        alert('删除成功！');
        exitManageMode();
    } catch (e) {
        console.error(e);
        alert('删除失败');
    }
}

// ==================== 【核心修复】正确读取个人简介 ====================
async function loadUserProfileFromSupabase() {
    try {
        const { data: profile, error } = await supabaseClient
            .from('user_profiles')
            .select('nickname, intro, avatar, cover_image')
            .eq('id', profileUserId)
            .single();

        if (error || !profile) {
            console.warn('未找到用户资料或查询出错:', error);
            const avatarEl = document.getElementById('profileAvatar');
            const nameEl = document.getElementById('profileName');
            const bioEl = document.getElementById('profileBio');
            if (avatarEl) avatarEl.src = 'https://via.placeholder.com/90';
            if (nameEl) nameEl.textContent = '用户名';
            if (bioEl) bioEl.textContent = '这个人很懒，什么都没写~';
            return;
        }

        console.log('成功加载用户资料:', profile);
        
        const avatarEl = document.getElementById('profileAvatar');
        const nameEl = document.getElementById('profileName');
        const bioEl = document.getElementById('profileBio');
        
        // 正确设置头像
        if (avatarEl) {
            avatarEl.src = profile.avatar && profile.avatar !== 'null' ? profile.avatar : 'https://via.placeholder.com/90';
        }
        
        // 正确设置昵称
        if (nameEl) {
            nameEl.textContent = profile.nickname && profile.nickname !== 'null' ? profile.nickname : '用户名';
        }
        
        // 正确设置个人简介 - 核心修复点
        if (bioEl) {
            // 直接使用数据库中的 intro 字段
            const introText = profile.intro && profile.intro.trim() !== '' ? profile.intro : '这个人很懒，什么都没写~';
            bioEl.textContent = introText;
            console.log('已设置个人简介:', introText);
        }
        
        // 加载封面图片
        if (profile.cover_image && profile.cover_image !== 'null') {
            updateCoverBackground(profile.cover_image);
        } else {
            updateCoverBackground(null);
        }
        
        // 同时将简介存储到 localStorage 作为备份（可选）
        if (profile.intro) {
            localStorage.setItem('user_bio_' + profileUserId, profile.intro);
        }
        
    } catch (err) {
        console.error('加载用户资料失败', err);
        // 发生错误时显示默认内容
        const bioEl = document.getElementById('profileBio');
        if (bioEl) bioEl.textContent = '这个人很懒，什么都没写~';
    }
}

// ==================== 【核心修复】loadMoments ====================
async function loadMoments() {
    const timeline = document.getElementById('momentTimeline');
    if (!timeline) return;
    
    try {
        const { data: moments, error } = await supabaseClient
            .from('posts')
            .select(`*,likes:likes(count),comments:comments(count)`)
            .eq('user_id', profileUserId)
            .order('created_at', { ascending: false });

        if (error) {
            timeline.innerHTML = '<div class="empty-timeline">加载失败</div>';
            return;
        }

        if (!moments || moments.length === 0) {
            timeline.innerHTML = '<div class="empty-timeline">还没有发布过动态~</div>';
            return;
        }

        const momentsWithCounts = moments.map(m => ({
            ...m,
            likes: m.likes?.[0]?.count || 0,
            comments_count: m.comments?.[0]?.count || 0
        }));

        const html = momentsWithCounts.map(m => `
            <div class="moment-card" data-id="${m.id}" onclick="openPostDetail('${m.id}')" style="padding:15px; border-bottom:1px solid #f0f0f0; background:white; border-radius:8px; margin-bottom:10px; display:flex;align-items:flex-start;gap:10px;">
            
                <!-- 完美复选框 -->
                ${isManageMode ? `
                <div onclick="event.stopPropagation()">
                    <input type="checkbox" style="transform:scale(1.3);margin-top:3px;" onchange="toggleSelect('${m.id}')">
                </div>
                ` : ''}
                
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px; color:#999;">
                        ${m.category ? `<span style="background:#f5f5f5; padding:2px 8px; border-radius:12px; font-size:12px;">${escapeHtml(m.category)}</span>` : ''}
                    </div>
                    ${m.title ? `<h3 class="moment-title" style="font-size:18px; font-weight:500; margin:0 0 6px 0; color:#333;">${escapeHtml(m.title)}</h3>` : ''}
                    <div class="moment-content" style="font-size:15px; color:#666; margin-bottom:10px; line-height:1.5;">${escapeHtml(m.content)}</div>
                    <div style="font-size:13px; color:#999; margin-bottom:10px;">${formatTime(m.created_at)}</div>
                    <div class="moment-actions" style="display:flex; gap:30px; padding-top:8px; border-top:1px solid #f5f5f5;">
                        <button onclick="event.stopPropagation(); likeMoment('${m.id}')" style="background:none; border:none; color:#666; font-size:14px; display:flex; align-items:center; gap:5px; cursor:pointer;">
                            <i class="fa-solid fa-thumbs-up"></i> <span class="like-count-${m.id}">${m.likes}</span>
                        </button>
                        <button onclick="event.stopPropagation(); openComment('${m.id}')" style="background:none; border:none; color:#666; font-size:14px; display:flex; align-items:center; gap:5px; cursor:pointer;">
                            <i class="fa-solid fa-comment"></i> ${m.comments_count}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        timeline.innerHTML = html;
    } catch (err) {
        console.error('加载动态失败', err);
        timeline.innerHTML = '<div class="empty-timeline">加载失败</div>';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(time) {
    const d = new Date(time);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

async function likeMoment(id) {
    try {
        const { data: exist } = await supabaseClient
            .from('likes')
            .select('id')
            .eq('post_id', id)
            .eq('user_id', currentUser.id)
            .maybeSingle();

        let newCount;
        if (exist) {
            await supabaseClient.from('likes').delete().eq('id', exist.id);
            newCount = -1;
        } else {
            await supabaseClient.from('likes').insert([{ post_id: id, user_id: currentUser.id }]);
            newCount = 1;
        }
        
        const likeSpan = document.querySelector(`.like-count-${id}`);
        if (likeSpan) {
            const currentCount = parseInt(likeSpan.textContent) || 0;
            likeSpan.textContent = currentCount + newCount;
        } else {
            loadMoments();
        }
    } catch (err) {
        console.error('点赞失败', err);
    }
}

function openComment(id) {
    localStorage.setItem('currentPostId', id);
    window.location.href = '../feiyitiezi/post-detail.html';
}

// 打开帖子
function openPostDetail(postId) {
    localStorage.setItem('currentPostId', postId);
    window.location.href = '../haoyouhudong/post-detail.html';
}

async function setGlobalPrivacy() {
    const idx = prompt('0-全部 1-半年 2-三天', 0);
    const values = ['all', 'half', 'three'];
    await supabaseClient.from('user_profiles').update({ global_privacy: values[idx] }).eq('id', currentUser.id);
    alert('设置成功');
}

// ==================== 封面图片管理（Base64存储版）====================

// 初始化封面功能
function initCoverFunction() {
    const coverEditBtn = document.getElementById('coverEditBtn');
    const coverInput = document.getElementById('coverInput');
    
    if (!coverEditBtn || !coverInput) return;
    
    // 移除旧的事件监听器（避免重复绑定）
    const newCoverEditBtn = coverEditBtn.cloneNode(true);
    const newCoverInput = coverInput.cloneNode(true);
    coverEditBtn.parentNode.replaceChild(newCoverEditBtn, coverEditBtn);
    coverInput.parentNode.replaceChild(newCoverInput, coverInput);
    
    // 重新绑定事件
    newCoverEditBtn.addEventListener('click', () => {
        newCoverInput.click();
    });
    
    newCoverInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('请选择图片格式文件！');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('图片不能超过5MB！');
            return;
        }
        
        await uploadCoverImage(file);
    });
}

// 上传封面图片（直接存储Base64到数据库）
async function uploadCoverImage(file) {
    const coverEditBtn = document.getElementById('coverEditBtn');
    const originalText = coverEditBtn.innerHTML;
    
    coverEditBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 上传中...';
    coverEditBtn.disabled = true;
    
    try {
        const userId = profileUserId;
        
        // 压缩图片
        const compressedFile = await compressImage(file, 800, 0.7);
        
        // 读取文件为Base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(compressedFile);
        });
        
        // 存储Base64到数据库
        const { error: updateError } = await supabaseClient
            .from('user_profiles')
            .update({ 
                cover_image: base64,
            })
            .eq('id', userId);
        
        if (updateError) {
            console.error('保存封面失败:', updateError);
            alert('保存失败：' + updateError.message);
            return;
        }
        
        // 更新页面背景
        updateCoverBackground(base64);
        alert('封面更新成功！');
        
    } catch (error) {
        console.error('上传封面出错:', error);
        alert('上传失败，请重试');
    } finally {
        coverEditBtn.innerHTML = originalText;
        coverEditBtn.disabled = false;
        const coverInput = document.getElementById('coverInput');
        if (coverInput) coverInput.value = '';
    }
}

// 图片压缩函数
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type, quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// 更新页面封面背景
function updateCoverBackground(coverUrl) {
    const coverDiv = document.querySelector('.profile-cover');
    if (!coverDiv) return;
    
    if (coverUrl && coverUrl !== 'null') {
        coverDiv.style.background = `url(${coverUrl})`;
        coverDiv.style.backgroundSize = 'cover';
        coverDiv.style.backgroundPosition = 'center';
        
        // 添加半透明遮罩
        let overlay = coverDiv.querySelector('.cover-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'cover-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.3);
                border-radius: 16px;
                pointer-events: none;
            `;
            coverDiv.insertBefore(overlay, coverDiv.firstChild);
        }
    } else {
        // 恢复默认渐变背景
        coverDiv.style.background = 'linear-gradient(135deg, #ff6868 0%, #764ba200 100%)';
        const overlay = coverDiv.querySelector('.cover-overlay');
        if (overlay) overlay.remove();
    }
}

// 从数据库加载封面图片
async function loadCoverFromDatabase(userId) {
    try {
        const { data: userData, error } = await supabaseClient
            .from('user_profiles')
            .select('cover_image')
            .eq('id', userId)
            .single();
        
        if (!error && userData && userData.cover_image && userData.cover_image !== 'null') {
            updateCoverBackground(userData.cover_image);
        } else {
            updateCoverBackground(null);
        }
    } catch (error) {
        console.error('加载封面失败:', error);
        updateCoverBackground(null);
    }
}

// ==================== 发布弹窗 ====================
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('publishModal');
    const openBtn = document.querySelector('button[onclick*="publish.html"]');
    const closeBtn = modal ? modal.querySelector('.close-modal') : null;
    const submitBtn = document.getElementById('submitPostBtn');

    if (openBtn) {
        openBtn.setAttribute('onclick', 'openPublishModal()');
    }
    
    window.openPublishModal = () => {
        if (modal) modal.style.display = 'flex';
    };

    window.closePublishModal = () => {
        if (modal) modal.style.display = 'none';
        const titleInput = document.getElementById('postTitle');
        const contentInput = document.getElementById('postContent');
        const categorySelect = document.getElementById('postCategory');
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        if (categorySelect) categorySelect.value = '';
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', window.closePublishModal);
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) window.closePublishModal();
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const title = document.getElementById('postTitle')?.value.trim() || '';
            const content = document.getElementById('postContent')?.value.trim() || '';
            const category = document.getElementById('postCategory')?.value || '';

            if (!title || !content || !category) {
                alert('请填写完整信息！');
                return;
            }

            try {
                await supabaseClient.from('posts').insert([{
                    user_id: currentUser.id,
                    title: title,
                    content: content,
                    category: category,
                    created_at: new Date().toISOString()
                }]);
                alert('发布成功！');
                window.closePublishModal();
                loadMoments();
            } catch (err) {
                console.error('发布失败:', err);
                alert('发布失败，请重试');
            }
        });
    }
});
