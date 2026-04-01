// ==================== 全局变量 ====================
let currentUser = null;
let selectedFriend = null;
let currentChatUserId = null;
let currentUserId = null;
let currentUserProfile = null;
let messageSubscription = null;
let requestSubscription = null;
let pendingRequests = [];
let unreadMessages = {}; // 未读消息

// ==================== 更新导航栏（根据登录状态） ====================
function updateUserNavLink() {
    const userLinkLi = document.getElementById('user-link');
    if (!userLinkLi) return;
    
    const user = currentUser || JSON.parse(localStorage.getItem('supabase_user') || 'null');
    
    if (user && user.id) {
        userLinkLi.innerHTML = '<a href="../profile.html"></i> 个人主页</a>';
    } else {
        userLinkLi.innerHTML = '<a href="../denglu-zhuce/denglu-zhuce.html"></i> 用户登录与注册</a>';
    }
}

// ==================== DOM 加载完成 ====================
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await SupabaseAPI.getCurrentUser();
    updateUserNavLink();
    
    if (!currentUser) {
        location.href = '../denglu-zhuce/denglu-zhuce.html';
        return;
    }

    currentUserId = currentUser.id;
    currentUserProfile = await SupabaseAPI.getUserProfile(currentUserId);
    updateUserNavLink();

    initPage();
    loadFriends();
    loadPosts();
    bindModalEvents();

    checkAndUpdateBadgeOnly();
    setInterval(checkAndUpdateBadgeOnly, 10000);

    // 加载未读消息 + 监听新消息
    loadUnreadCounts();
    startMessageListener();
});

// 加载初始未读消息数量
async function loadUnreadCounts() {
    unreadMessages = await SupabaseAPI.getUnreadCounts(currentUserId);
    loadFriends();
}

// 实时监听新消息
function startMessageListener() {
    if (!SupabaseAPI?.supabase) return;
    
    messageSubscription = SupabaseAPI.subscribeToMessages(currentUserId, async (msg) => {
        const fromUser = msg.from_user;
        if (fromUser !== selectedFriend) {
            unreadMessages[fromUser] = (unreadMessages[fromUser] || 0) + 1;
        } else {
            await SupabaseAPI.markMessagesAsRead(currentUserId, fromUser);
            delete unreadMessages[fromUser];
        }
        loadFriends();
    });
}

// ==================== Supabase Auth 状态监听 ====================
if (SupabaseAPI && SupabaseAPI.supabase && SupabaseAPI.supabase.auth) {
    SupabaseAPI.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            localStorage.setItem('supabase_user', JSON.stringify(session.user));
            currentUser = session.user;
            updateUserNavLink();
        } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('supabase_user');
            currentUser = null;
            updateUserNavLink();
        }
    });
}

// ==================== 辅助函数 ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.background = type === 'success' ? '#10b981' : '#3b82f6';
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-bell'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

// ==================== 好友申请红点提醒 ====================
const badgeStyle = document.createElement('style');
badgeStyle.textContent = `
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    .request-badge { animation: pulse 0.5s ease; }
    .unread-dot {
        width: 10px; height: 10px; background: #ff4444;
        border-radius: 50%; position: absolute;
        top: 0; right: 0; display: none;
    }
`;
document.head.appendChild(badgeStyle);

function updateFriendRequestBadge(count) {
    const addFriendBtn = document.getElementById('openAddFriendModal');
    if (!addFriendBtn) return;
    let badge = addFriendBtn.querySelector('.request-badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'request-badge';
            addFriendBtn.style.position = 'relative';
            addFriendBtn.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.cssText = `position:absolute;top:-8px;right:-8px;background:#f44336;color:white;font-size:10px;padding:2px 5px;border-radius:10px;min-width:18px;text-align:center;z-index:10;animation:pulse 0.5s ease;cursor:pointer;`;
    } else if (badge) badge.remove();
}

async function checkAndShowFriendRequestBadge() {
    try {
        const requests = await SupabaseAPI.getFriendRequests(currentUserId);
        pendingRequests = requests || [];
        const count = pendingRequests.length;
        updateFriendRequestBadge(count);
        return count;
    } catch (error) {
        console.error('检查好友申请失败:', error);
        return 0;
    }
}

async function checkAndUpdateBadgeOnly() {
    const count = await checkAndShowFriendRequestBadge();
    return count;
}

// ==================== 好友申请弹窗 ====================
async function showFriendRequestsDialog() {
    const requests = await SupabaseAPI.getFriendRequests(currentUserId);
    if (!requests || requests.length === 0) {
        alert('暂无好友申请');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'friend-requests-modal';
    modal.style.cssText = `
        position: fixed;top: 0;left: 0;width: 100%;height: 100%;
        background: rgba(0,0,0,0.5);z-index: 10001;
        display: flex;align-items:center;justify-content:center;
    `;

    modal.innerHTML = `
        <div style="background:white; border-radius:20px; width:450px; max-width:90%; max-height:80%; overflow:auto; padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #f0f0f0;padding-bottom:10px;">
                <h3 style="margin:0;"><i class="fas fa-user-friends" style="color:#ff9800;"></i> 好友申请 (${requests.length})</h3>
                <button class="close-requests-btn" style="background:none;border:none;font-size:28px;cursor:pointer;color:#999;">&times;</button>
            </div>
            <div id="requests-list">
                ${requests.map(req => `
                    <div class="request-item" data-id="${req.id}" data-from="${req.from_user}" style="display:flex;align-items:center;justify-content:space-between;padding:15px 10px;border-bottom:1px solid #eee;">
                        <div style="display:flex;align-items:center;gap:15px;">
                            <div style="width:50px;height:50px;border-radius:50%;overflow:hidden;position:relative;">
                                ${req.from_profile?.avatar ? `<img src="${req.from_profile.avatar}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-user"></i>'}
                            </div>
                            <div>
                                <div style="font-weight:bold;">${escapeHtml(req.from_profile?.nickname || req.from_profile?.username || '用户')}</div>
                                <div style="font-size:12px;color:#999;">${new Date(req.created_at).toLocaleString()}</div>
                                <div style="font-size:12px;color:#ff9800;">想要添加您为好友</div>
                            </div>
                        </div>
                        <div>
                            <button class="accept-request-btn" data-id="${req.id}" data-from="${req.from_user}" style="background:#10b981;color:white;border:none;padding:8px 16px;border-radius:25px;cursor:pointer;margin-right:8px;">同意</button>
                            <button class="reject-request-btn" data-id="${req.id}" style="background:#f44336;color:white;border:none;padding:8px 16px;border-radius:25px;cursor:pointer;">拒绝</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.close-requests-btn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.querySelectorAll('.accept-request-btn').forEach(btn => {
        btn.onclick = async () => {
            await SupabaseAPI.handleFriendRequest(btn.dataset.id, true, btn.dataset.from, currentUserId);
            showToast('已成为好友', 'success');
            loadFriends();
            checkAndUpdateBadgeOnly();
            modal.remove();
        };
    });

    modal.querySelectorAll('.reject-request-btn').forEach(btn => {
        btn.onclick = async () => {
            await SupabaseAPI.handleFriendRequest(btn.dataset.id, false);
            showToast('已拒绝', 'info');
            checkAndUpdateBadgeOnly();
            modal.remove();
        };
    });
}

// ==================== 弹窗事件绑定 ====================
function bindModalEvents() {
    const postModal = document.getElementById('postModal');
    const openPostModalBtn = document.getElementById('openPostModal');
    const closePostModalBtn = postModal.querySelector('.close');
    const submitPostBtn = document.getElementById('submitPostBtn');

    openPostModalBtn.addEventListener('click', () => postModal.style.display = 'block');
    closePostModalBtn.addEventListener('click', () => postModal.style.display = 'none');
    window.onclick = (e) => {
        if (e.target === postModal) postModal.style.display = 'none';
    };

    submitPostBtn.addEventListener('click', async () => {
        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();
        const category = document.getElementById('postCategory').value;

        if (!title || !content || !category) {
            alert('请填写完整信息');
            return;
        }

        const { error } = await SupabaseAPI.supabase
            .from('posts')
            .insert([{
                user_id: currentUser.id,
                title: title,
                content: content,
                category: category
            }]);

        if (!error) {
            alert('发帖成功！');
            postModal.style.display = 'none';
            document.getElementById('postTitle').value = '';
            document.getElementById('postContent').value = '';
            loadPosts();
        } else {
            alert('发帖失败：' + error.message);
        }
    });
}

// ==================== 加载帖子 ====================
async function loadPosts() {
    const { data: posts, error } = await SupabaseAPI.supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    const postsList = document.getElementById('postsList');
    if (error || !posts) {
        postsList.innerHTML = '<div class="empty-friends">加载失败</div>';
        console.error(error);
        return;
    }
    if (posts.length === 0) {
        postsList.innerHTML = '<div class="empty-friends">暂无动态</div>';
        return;
    }

    const postsWithData = await Promise.all(posts.map(async post => {
        const { data: author } = await SupabaseAPI.supabase
            .from('user_profiles')
            .select('nickname, username, avatar')
            .eq('id', post.user_id)
            .single();

        const { data: likes } = await SupabaseAPI.supabase
            .from('likes')
            .select('user_id, user_profiles(nickname, username, avatar)')
            .eq('post_id', post.id);

        const { data: comments } = await SupabaseAPI.supabase
            .from('comments')
            .select('id, content, user_id, user_profiles(nickname, username, avatar)')
            .eq('post_id', post.id);

        return { ...post, author, likes, comments };
    }));

    postsList.innerHTML = postsWithData.map(post => `
    <div class="post-card" data-id="${post.id}" onclick="openPostDetail('${post.id}')">
        <div class="post-user">
            <img src="${post.author?.avatar || 'https://via.placeholder.com/40'}" 
                 class="avatar-img" 
                 onclick="event.stopPropagation(); goToProfile('${post.user_id}')">
            <span>${post.author?.nickname || post.author?.username || '发帖用户'}</span>
            
            ${currentUser.id === post.user_id ? `
            <div class="more-dots" onclick="event.stopPropagation()">
                <span></span><span></span><span></span>
                <div class="dots-menu">
                    <div class="dots-item delete-item">删除</div>
                    <div class="dots-item cancel-item">取消</div>
                </div>
            </div>
            ` : ''}
            
            <label class="post-tag">${post.category}</label>
        </div>

        <h4 class="post-title">${escapeHtml(post.title)}</h4>
        <p class="post-content">${escapeHtml(post.content)}</p>

        <div class="like-avatars" style="display:flex;gap:6px; margin:10px 0;">
            ${post.likes?.slice(0,8).map(l => `
                <img src="${l.user_profiles?.avatar || 'https://via.placeholder.com/26'}" style="width:26px;height:26px;border-radius:50%">
            `).join('') || ''}
        </div>

        <div class="post-actions">
            <button onclick="event.stopPropagation();toggleLike('${post.id}')">❤️ ${post.likes?.length || 0}</button>
            <button onclick="event.stopPropagation();">评论 ${post.comments?.length || 0}</button>
        </div>

        <div class="comment-list">
            ${post.comments?.map(c => `
            <div class="comment-item" 
                 onclick="handleCommentClick(event, '${post.id}', '${escapeHtml(c.user_profiles?.nickname || c.user_profiles?.username)}', '${c.id}', '${c.user_id}')"
                 style="padding:6px 10px; cursor:pointer; border-radius:6px; margin:4px 0;">
                <b>${escapeHtml(c.user_profiles?.nickname || c.user_profiles?.username)}</b>：${escapeHtml(c.content)}
            </div>
            `).join('') || ''}
        </div>

        <div class="comment-input-bar">
            <input id="comment-${post.id}" placeholder="写评论..." onclick="event.stopPropagation()">
            <button onclick="event.stopPropagation();sendComment('${post.id}')">发送</button>
        </div>
    </div>
    `).join('');

    bindMoreDots();
}

// ==================== 更多操作 ====================
function bindMoreDots() {
    document.querySelectorAll('.more-dots').forEach(dot => {
        dot.onclick = e => {
            e.stopPropagation();
            document.querySelectorAll('.dots-menu').forEach(m => m.style.display = 'none');
            dot.querySelector('.dots-menu').style.display = 'block';
        };
    });

    document.querySelectorAll('.delete-item').forEach(item => {
        item.onclick = async e => {
            e.stopPropagation();
            const postId = item.closest('.post-card').dataset.id;
            if (!postId) return alert("获取帖子ID失败");

            try {
                await SupabaseAPI.supabase.from('comments').delete().eq('post_id', postId);
                await SupabaseAPI.supabase.from('likes').delete().eq('post_id', postId);
                const { error } = await SupabaseAPI.supabase.from('posts').delete().eq('id', postId);
                
                if (error) throw error;
                alert("删除成功！");
                loadPosts();
            } catch (err) {
                console.error(err);
                alert("删除失败：" + err.message);
            }
        }
    });

    document.querySelectorAll('.cancel-item').forEach(item => {
        item.onclick = e => {
            e.stopPropagation();
            item.closest('.dots-menu').style.display = 'none';
        }
    });

    document.onclick = () => {
        document.querySelectorAll('.dots-menu').forEach(m => m.style.display = 'none');
    };
}

// ==================== 点赞 ====================
async function toggleLike(postId) {
    const { data: exist } = await SupabaseAPI.supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (exist) {
        await SupabaseAPI.supabase.from("likes").delete().eq("id", exist.id);
    } else {
        await SupabaseAPI.supabase.from("likes").insert([{
            post_id: postId,
            user_id: currentUser.id
        }]);
    }
    loadPosts();
}

function openPostDetail(postId) {
    if (!postId) return;
    localStorage.setItem('currentPostId', postId);
    window.location.href = './post-detail.html';
}

function goToProfile(userId) {
    localStorage.setItem('currentProfileUserId', userId);
    window.location.href = '../feiyitiezi/user-posts.html';
}

// ==================== 页面初始化 ====================
function initPage() {
    const searchTab = document.getElementById('searchTab');
    const recommendTab = document.getElementById('recommendTab');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            searchTab.classList.toggle('active', tab === 'search');
            recommendTab.classList.toggle('active', tab === 'recommend');

            if (tab === 'recommend') {
                loadRecommendedUsers();
            }
        });
    });

    document.getElementById('searchUserBtn').addEventListener('click', searchUsers);

    document.getElementById('openAddFriendModal').addEventListener('click', async () => {
        const count = await checkAndShowFriendRequestBadge();
        if (count > 0) {
            await showFriendRequestsDialog();
        } else {
            document.getElementById('addFriendModal').style.display = 'block';
        }
    });

    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        });
    });
}

// ==================== 加载好友列表（带未读红点） ====================
async function loadFriends() {
    const friends = await SupabaseAPI.getMyFriends(currentUser.id);
    const friendsList = document.getElementById('friendsList');

    if (!friends || friends.length === 0) {
        friendsList.innerHTML = '<div class="empty-friends">暂无好友</div>';
        return;
    }

    friendsList.innerHTML = friends.map(friend => `
        <div class="friend-item" data-id="${friend.id}" style="position:relative;">
            <div style="position:relative;width:32px;height:32px;">
                <img src="${friend.avatar || 'https://via.placeholder.com/32'}" class="friend-avatar">
                <div class="unread-dot" style="display:${unreadMessages[friend.id] ? 'block' : 'none'};"></div>
            </div>
            <div class="friend-info">
                <div class="friend-name">${escapeHtml(friend.nickname || friend.username)}</div>
            </div>
            <button class="del-friend-btn" onclick="deleteFriend('${friend.id}', event)">🗑️</button>
        </div>
    `).join('');

    friendsList.querySelectorAll('.friend-item').forEach(item => {
        item.addEventListener('click', async () => {
            const fid = item.getAttribute('data-id');
            selectedFriend = fid;
            
            // 点击后清除未读 + 标记已读
            delete unreadMessages[fid];
            await SupabaseAPI.markMessagesAsRead(currentUserId, fid);
            
            openChat(fid);
            loadFriends();
        });
    });
}

// ==================== 删除好友 ====================
async function deleteFriend(friendId, e) {
    e.stopPropagation();
    if (!confirm("确定要删除该好友吗？")) return;

    try {
        await SupabaseAPI.deleteFriend(currentUser.id, friendId);
        alert("删除成功，可以重新添加");
        loadFriends();

        if (selectedFriend === friendId) {
            selectedFriend = null;
            document.getElementById('chatHeader').innerText = "请选择好友开始聊天";
            document.getElementById('chatInputArea').style.display = 'none';
        }
    } catch (err) {
        console.error("删除失败:", err);
        alert("删除失败：" + err.message);
    }
}

// ==================== 打开聊天 ====================
async function openChat(friendId) {
    selectedFriend = friendId;
    const friend = await SupabaseAPI.getUserProfile(friendId);
    document.getElementById('chatHeader').innerHTML = `<i class="fas fa-comments"></i> ${escapeHtml(friend.nickname || friend.username)}`;
    document.getElementById('chatInputArea').style.display = 'flex';
    loadChatHistory();
}

// ==================== 加载聊天记录 ====================
async function loadChatHistory() {
    const messages = await SupabaseAPI.getChatHistory(currentUser.id, selectedFriend);
    const chatMsgEl = document.getElementById('chatMessages');
    const myProfile = await SupabaseAPI.getUserProfile(currentUser.id);
    const friendProfile = await SupabaseAPI.getUserProfile(selectedFriend);
    const myAvatar = myProfile?.avatar || 'https://via.placeholder.com/40';
    const friendAvatar = friendProfile?.avatar || 'https://via.placeholder.com/40';

    chatMsgEl.innerHTML = messages.map(msg => `
        <div class="message-item ${msg.from_user === currentUser.id ? 'me' : ''}">
            <div class="message-avatar"><img src="${msg.from_user === currentUser.id ? myAvatar : friendAvatar}"></div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
        </div>
    `).join('');
    chatMsgEl.scrollTop = chatMsgEl.scrollHeight;
}

// ==================== 发送消息 ====================
document.getElementById('sendMessageBtn').addEventListener('click', async () => {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content || !selectedFriend) return;
    await SupabaseAPI.sendMessage(currentUser.id, selectedFriend, content);
    input.value = '';
    loadChatHistory();
});

// ==================== 搜索用户 ====================
async function searchUsers() {
    const keyword = document.getElementById('searchUserInput').value.trim();
    const results = await SupabaseAPI.searchUsers(keyword, currentUser.id);
    const resEl = document.getElementById('searchResults');

    const myFriends = await SupabaseAPI.getMyFriends(currentUser.id);
    const myFriendIds = myFriends.map(f => f.id);

    const filtered = results.filter(u => u.id !== currentUser.id && !myFriendIds.includes(u.id));

    if (filtered.length === 0) {
        resEl.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">未找到用户</div>';
        return;
    }

    resEl.innerHTML = filtered.map(u => `
        <div class="user-result-item">
            <div class="user-result-avatar">
                <img src="${u.avatar || 'https://via.placeholder.com/45'}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div style="flex:1;">
                <div style="font-weight:bold;">${escapeHtml(u.nickname || u.username)}</div>
                <div style="font-size:12px;color:#999;">${u.tags?.slice(0,2).join(' · ') || '暂无标签'}</div>
            </div>
            <button class="add-friend-result-btn" onclick="sendFriendRequest('${u.id}')">加好友</button>
        </div>
    `).join('');
}

// ==================== 发送好友请求 ====================
async function sendFriendRequest(userId) {
    try {
        await SupabaseAPI.sendFriendRequest(currentUser.id, userId);
        showToast("好友申请已发送！", "success");
        document.getElementById('addFriendModal').style.display = 'none';
    } catch (err) {
        console.error(err);
        alert("发送失败：" + err.message);
    }
}

// ==================== 标签推荐同好 ====================
async function loadRecommendedUsers() {
    const recEl = document.getElementById('recommendResults');
    recEl.innerHTML = '<div style="text-align:center;padding:20px;">寻找同好中...</div>';

    const myProfile = await SupabaseAPI.getUserProfile(currentUser.id);
    const myTags = myProfile?.tags || [];
    const myFriends = await SupabaseAPI.getMyFriends(currentUser.id);
    const friendIds = myFriends.map(f => f.id);

    if (myTags.length === 0) {
        recEl.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">请先在个人主页设置喜爱的非遗标签</div>';
        return;
    }

    const recommended = await SupabaseAPI.getRecommendedUsers(currentUser.id, myTags, friendIds);

    if (recommended.length === 0) {
        recEl.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">暂无同好推荐，试试搜索用户吧</div>';
        return;
    }

    recEl.innerHTML = recommended.map(u => `
        <div class="user-result-item">
            <div class="user-result-avatar">
                <img src="${u.avatar || 'https://via.placeholder.com/45'}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div style="flex:1;">
                <div style="font-weight:bold;">${escapeHtml(u.nickname || u.username)}</div>
                <div style="font-size:12px;color:#ff9800;">共同爱好：${myTags.filter(t => (u.tags || []).includes(t)).join('、')}</div>
            </div>
            <button class="add-friend-result-btn" onclick="sendFriendRequest('${u.id}')">加好友</button>
        </div>
    `).join('');
}

// ==================== 评论弹窗 ====================
function showCommentModal(text, leftText, leftAction) {
    const modal = document.getElementById('commentModal');
    const modalText = document.getElementById('modalText');
    const modalLeftBtn = document.getElementById('modalLeftBtn');
    const modalRightBtn = document.getElementById('modalRightBtn');

    modalText.innerText = text;
    modalLeftBtn.innerText = leftText;
    modal.style.display = 'flex';

    modalLeftBtn.onclick = () => {
        modal.style.display = 'none';
        leftAction();
    };
    modalRightBtn.onclick = () => {
        modal.style.display = 'none';
    };
}

// ==================== 评论点击处理 ====================
async function handleCommentClick(e, postId, username, commentId, commentUserId) {
    e.stopPropagation();
    if (commentUserId === currentUser.id) {
        showCommentModal("删除这条评论？", "删除", async () => {
            await SupabaseAPI.supabase.from('comments').delete().eq('id', commentId);
            loadPosts();
        });
    } else {
        showCommentModal(`回复 @${username}`, "回复", () => {
            const input = document.getElementById(`comment-${postId}`);
            input.placeholder = `回复 ${username}：`;
            input.dataset.reply = username;
            input.focus();
        });
    }
}

// ==================== 发送评论 ====================
async function sendComment(postId) {
    const input = document.getElementById(`comment-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    let finalContent = input.dataset.reply 
        ? `@${input.dataset.reply}：${content}` 
        : content;

    await SupabaseAPI.supabase.from('comments').insert([{
        post_id: postId,
        user_id: currentUser.id,
        content: finalContent
    }]);

    input.value = '';
    input.placeholder = '写评论...';
    delete input.dataset.reply;
    loadPosts();
}