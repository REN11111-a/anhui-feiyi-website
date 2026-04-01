const postId = localStorage.getItem('currentPostId');
let currentPost = null;
let currentUser = null;
let isLiked = false;

// 评论弹窗相关变量
let currentComment = null;
let commentAction = null;
window.replyToCommentId = null;
window.replyToUser = null;

// 页面初始化
async function initDetailPage() {
    if (!postId) {
        alert('无效的帖子ID');
        history.back();
        return;
    }

    // 获取当前登录用户
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    if (!currentUser) {
        alert('请先登录');
        location.href = '../denglu-zhuce/denglu-zhuce.html';
        return;
    }

    // 获取帖子详情（包含用户信息）
    const { data: post, error } = await supabaseClient
        .from('posts')
        .select('*, user_profiles(nickname, avatar)')
        .eq('id', postId)
        .maybeSingle();

    if (error || !post) {
        console.error(error);
        alert('加载帖子失败');
        history.back();
        return;
    }

    currentPost = post;
    await loadLikesAndComments();
    renderPostDetail();
}

// 加载点赞和评论数据
async function loadLikesAndComments() {
    // 加载点赞列表
    const { data: likes } = await supabaseClient
        .from('likes')
        .select('user_id, user_profiles(nickname, avatar)')
        .eq('post_id', postId);

    // 加载评论列表
    const { data: comments } = await supabaseClient
        .from('comments')
        .select('id, content, user_id, user_profiles(nickname, avatar)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    currentPost.likes = likes || [];
    currentPost.comments = comments || [];
}

// 渲染帖子详情
function renderPostDetail() {
    // 渲染用户信息
    document.getElementById('avatar').src = currentPost.user_profiles?.avatar || 'https://via.placeholder.com/44';
    document.getElementById('nickname').innerText = currentPost.user_profiles?.nickname || '匿名用户';
    document.getElementById('content').innerText = currentPost.content || '';
    document.getElementById('time').innerText = new Date(currentPost.created_at).toLocaleString();

    // 渲染图片
    const imgContainer = document.getElementById('images');
    imgContainer.innerHTML = '';
    if (currentPost.images && currentPost.images.length > 0) {
        currentPost.images.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            imgContainer.appendChild(img);
        });
    }

    // 渲染点赞状态
    const likeCount = currentPost.likes?.length || 0;
    document.getElementById('likeText').innerText = isLiked ? `已点赞(${likeCount})` : `点赞(${likeCount})`;
    document.getElementById('likeBtn').classList.toggle('liked', isLiked);

    // 渲染点赞用户列表
    const likeUsersContainer = document.getElementById('likeUsers');
    likeUsersContainer.innerHTML = '';
    if (currentPost.likes && currentPost.likes.length > 0) {
        currentPost.likes.forEach(like => {
            const user = like.user_profiles;
            const div = document.createElement('div');
            div.className = 'like-user';
            div.innerHTML = `
                <img src="${user?.avatar || 'https://via.placeholder.com/24'}" class="like-avatar">
                <span>${user?.nickname || '用户'}</span>
            `;
            likeUsersContainer.appendChild(div);
        });
    } else {
        likeUsersContainer.innerHTML = '<span style="color:#999;">暂无点赞</span>';
    }

    // 渲染评论区
    const commentList = document.getElementById('commentList');
    commentList.innerHTML = '';
    if (currentPost.comments && currentPost.comments.length > 0) {
        currentPost.comments.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            item.onclick = () => onCommentClick(c); // 点击评论弹出操作
            item.innerHTML = `
                <img src="${c.user_profiles?.avatar || 'https://via.placeholder.com/36'}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-nickname">${c.user_profiles?.nickname || '匿名'}</div>
                    <div class="comment-text">
                        <i class="fa-solid fa-reply"></i> <!-- 评论左边回复图标 -->
                        ${c.content}
                    </div>
                </div>
            `;
            commentList.appendChild(item);
        });
    } else {
        commentList.innerHTML = '<div style="color:#999;padding:10px 0;">暂无评论</div>';
    }

    // 显示删除按钮（仅作者可见）
    if (currentUser && currentPost && currentUser.id === currentPost.user_id) {
        document.getElementById('deleteBtn').style.display = 'inline-block';
    }
}

// ====================== 新增：评论点击弹窗功能 ======================
function onCommentClick(comment) {
    currentComment = comment;
    if (currentUser.id === comment.user_id) {
        // 自己的评论：删除
        document.getElementById('modalPrimaryBtn').innerText = '删除';
        document.getElementById('modalPrimaryBtn').className = 'modal-btn danger';
        commentAction = 'delete';
    } else {
        // 别人的评论：回复
        document.getElementById('modalPrimaryBtn').innerText = '回复';
        document.getElementById('modalPrimaryBtn').className = 'modal-btn primary';
        commentAction = 'reply';
    }
    document.getElementById('commentModal').style.display = 'flex';
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
    currentComment = null;
    commentAction = null;
}

async function handleCommentAction() {
    if (commentAction === 'delete') {
        // 删除评论
        await supabaseClient.from('comments').delete().eq('id', currentComment.id);
    } else if (commentAction === 'reply') {
        // 回复评论：修改输入框状态，记录回复目标
        const input = document.getElementById('commentInput');
        input.placeholder = `回复 ${currentComment.user_profiles.nickname}：`;
        input.dataset.reply = currentComment.user_profiles.nickname || currentComment.user_profiles.username;
        input.focus();
        // 不再需要全局变量，改用 dataset 存储
        window.replyToCommentId = currentComment.id;
    }
    closeCommentModal();
    await loadLikesAndComments();
    renderPostDetail();
}

// 切换点赞状态
async function toggleLike() {
    if (isLiked) {
        await supabaseClient.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
        isLiked = false;
    } else {
        await supabaseClient.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
        isLiked = true;
    }
    await loadLikesAndComments();
    renderPostDetail();
}

// 发送评论（核心修改：处理回复格式）
async function sendComment() {
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (!content) return;

    let finalContent = '';

    // 如果是回复状态 → 格式：@对方昵称：内容
    if (input.dataset.reply) {
        finalContent = `@${input.dataset.reply}：${content}`;
    } 
    // 普通评论 → 直接发送内容
    else {
        finalContent = content;
    }

    // 插入评论（如果需要关联父评论，可加上 parent_id）
    const insertData = {
        post_id: postId,
        user_id: currentUser.id,
        content: finalContent
    };
    // 如果有父评论ID（回复某条评论），可以加上 parent_id 字段
    if (window.replyToCommentId) {
        insertData.parent_id = window.replyToCommentId;
    }

    await supabaseClient.from('comments').insert([insertData]);

    // 重置输入框状态
    input.value = '';
    input.placeholder = '写评论...';
    delete input.dataset.reply;
    window.replyToCommentId = null;
    window.replyToUser = null;

    await loadLikesAndComments();
    renderPostDetail();
}

// 页面返回
function goBack() {
    history.back();
}

// 删除弹窗控制
function openModal() {
    document.getElementById('deleteModal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

// 删除帖子
async function deletePost() {
    await supabaseClient.from('comments').delete().eq('post_id', postId);
    await supabaseClient.from('likes').delete().eq('post_id', postId);
    await supabaseClient.from('posts').delete().eq('id', postId);
    closeModal();
    history.back();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initDetailPage);