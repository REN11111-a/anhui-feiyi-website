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
    loadSavedCover();

    const actionBtns = document.getElementById('profileActions');
    const coverEditBtn = document.getElementById('coverEditBtn');
    if (isMyProfile) {
        actionBtns.style.display = 'flex';
        coverEditBtn.style.display = 'flex';
    } else {
        actionBtns.style.display = 'none';
        coverEditBtn.style.display = 'none';
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

async function loadUserProfileFromSupabase() {
    try {
        const { data: profile, error } = await supabaseClient
            .from('user_profiles')
            .select('nickname, intro, avatar')
            .eq('id', profileUserId)
            .single();

        if (error || !profile) {
            const avatarEl = document.getElementById('profileAvatar');
            const nameEl = document.getElementById('profileName');
            const bioEl = document.getElementById('profileBio');
            if (avatarEl) avatarEl.src = 'https://via.placeholder.com/90';
            if (nameEl) nameEl.textContent = '用户名';
            if (bioEl) bioEl.textContent = '这个人很懒，什么都没写~';
            return;
        }

        const avatarEl = document.getElementById('profileAvatar');
        const nameEl = document.getElementById('profileName');
        const bioEl = document.getElementById('profileBio');
        
        if (avatarEl) avatarEl.src = profile.avatar || 'https://via.placeholder.com/90';
        if (nameEl) nameEl.textContent = profile.nickname || '用户名';
        if (bioEl) bioEl.textContent = profile.intro || '这个人很懒，什么都没写~';
    } catch (err) {
        console.error('加载用户资料失败', err);
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

// ==================== 封面 ====================
document.addEventListener('DOMContentLoaded', () => {
    const coverInput = document.getElementById('coverInput');
    const coverEditBtn = document.getElementById('coverEditBtn');
    const profileCover = document.querySelector('.profile-cover');

    if (coverEditBtn && coverInput) {
        coverEditBtn.addEventListener('click', () => coverInput.click());

        coverInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) {
                alert('请选择图片格式文件！');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const coverUrl = event.target.result;
                if (profileCover) {
                    profileCover.style.background = `url(${coverUrl}) center center / cover`;
                }
                localStorage.setItem('cover_' + profileUserId, coverUrl);
                supabaseClient.from('user_profiles').update({ cover: coverUrl }).eq('id', profileUserId);
            };
            reader.readAsDataURL(file);
        });
    }
});

function loadSavedCover() {
    const profileCover = document.querySelector('.profile-cover');
    const saved = localStorage.getItem('cover_' + profileUserId);
    if (saved && profileCover) {
        profileCover.style.background = `url(${saved}) center center / cover`;
    } else if (profileCover) {
        profileCover.style.background = "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop') center center / cover";
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
