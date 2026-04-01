let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    loadPosts();
});

async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').eq('user_id', currentUser.id);
    const list = document.getElementById('postList');
    list.innerHTML = data.map(item => `
        <div class="post-item">
            <input type="checkbox" class="post-checkbox" data-id="${item.id}">
            <span>${item.content.substring(0, 30)}...</span>
        </div>
    `).join('');
}

document.getElementById('deleteSelected').onclick = async () => {
    const checks = document.querySelectorAll('.post-checkbox:checked');
    const ids = Array.from(checks).map(c => c.dataset.id);
    if (ids.length === 0) return alert('请选择要删除的动态');
    if (confirm(`确定删除 ${ids.length} 条动态吗？`)) {
        await supabase.from('posts').delete().in('id', ids);
        alert('删除成功');
        loadPosts();
    }
};