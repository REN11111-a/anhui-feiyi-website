let supabase = null;  // ✅ 先声明为 null
let currentUser = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // ✅ 等待 SupabaseAPI 加载完成
    let waitCount = 0;
    while (typeof SupabaseAPI === 'undefined' && waitCount < 30) {
        await new Promise(r => setTimeout(r, 100));
        waitCount++;
    }
    if (typeof SupabaseAPI === 'undefined') {
        alert('系统加载失败，请刷新页面重试');
        return;
    }
    
    // ✅ 在这里赋值，此时 SupabaseAPI 已经存在
    supabase = SupabaseAPI.supabase;
    
    // 获取当前登录用户
    currentUser = await SupabaseAPI.getCurrentUser();
    if (!currentUser) {
        alert('请先登录');
        location.href = '../denglu-zhuce/denglu-zhuce.html';
        return;
    }

    // 加载帖子列表
    await loadPosts();
    // 绑定三个点交互
    bindMoreDots();
});

// 加载所有帖子
async function loadPosts() {
    // ✅ 安全检查
    if (!supabase) {
        console.error('supabase 未初始化');
        return;
    }
    
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    const postList = document.querySelector('.post-list');
    if (!posts || posts.length === 0) {
        postList.innerHTML = '<div style="text-align:center;color:#999;padding:20px">暂无帖子</div>';
        return;
    }

    postList.innerHTML = posts.map(post => `
        <div class="post-item" data-id="${post.id}">
            ${post.user_id === currentUser.id ? `
            <div class="more-dots">
                <span></span><span></span><span></span>
                <div class="dots-menu">
                    <div class="dots-item delete-item">删除选择</div>
                    <div class="dots-item cancel-item">取消选择</div>
                </div>
            </div>
            ` : ''}

            <div class="post-user">
                <img src="${post.author_avatar || 'https://via.placeholder.com/40'}" alt="头像">
                <span>${post.author_name || '用户'}</span>
                <span class="post-tag">${post.category || '传统音乐'}</span>
            </div>
            <div class="post-content">
                <h3>${post.title || ''}</h3>
                <p>${post.content}</p>
            </div>
            <div class="post-actions">
                <span>❤️ ${post.likes_count || 0}</span>
                <span>评论 ${post.comments_count || 0}</span>
            </div>
            <div class="comment-list">
                ${(post.comments || []).map(comment => `
                    <div style="font-size:13px;color:#666;margin:5px 0">
                        ${comment.author_name}: ${comment.content}
                    </div>
                `).join('')}
            </div>
            <div class="comment-input">
                <input type="text" placeholder="写评论..." class="comment-input-${post.id}">
                <button onclick="submitComment('${post.id}')">发送</button>
            </div>
        </div>
    `).join('');

    bindMoreDots();
}

// 绑定三个点交互
function bindMoreDots() {
    document.querySelectorAll('.more-dots').forEach(dot => {
        dot.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dots-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            const menu = dot.querySelector('.dots-menu');
            if (menu) menu.style.display = 'block';
        };
    });

    document.querySelectorAll('.delete-item').forEach(item => {
        item.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm('确定要删除这个帖子吗？')) return;
            const postId = item.closest('.post-item').dataset.id;
            await supabase.from('posts').delete().eq('id', postId);
            loadPosts();
        };
    });

    document.querySelectorAll('.cancel-item').forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            const menu = item.closest('.dots-menu');
            if (menu) menu.style.display = 'none';
        };
    });

    document.onclick = () => {
        document.querySelectorAll('.dots-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    };
}

// 提交评论
async function submitComment(postId) {
    if (!supabase) {
        console.error('supabase 未初始化');
        return;
    }
    const input = document.querySelector(`.comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    await supabase.from('comments').insert([{
        post_id: postId,
        user_id: currentUser.id,
        content: content
    }]);

    input.value = '';
    loadPosts();
}
