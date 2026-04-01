const SUPABASE_URL = "https://tmybqhnldswwwreikwvt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gSFRZVYpIuGZFqyLzU1BGw_8yrXfdXX";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    
    try {
        const { data: existingProfile } = await supabaseClient
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
        
        if (!existingProfile) {
            const username = user.user_metadata?.username || user.email?.split('@')[0] || '用户';
            await supabaseClient
                .from('user_profiles')
                .insert({
                    id: user.id,
                    username: username,
                    nickname: username,
                    tags: [],
                    created_at: new Date().toISOString()
                });
        }
    } catch (err) {}
    
    return user;
}

async function getCurrentUser() {
    return await checkAuth();
}

async function getUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', userId);
    
    if (error || !data || data.length === 0) return null;
    return data[0];
}

async function searchUsers(keyword, excludeUserId) {
    let query = supabaseClient
        .from('user_profiles')
        .select('id, username, nickname, avatar, tags')
        .neq('id', excludeUserId);
    
    if (keyword && keyword.trim()) {
        query = query.or(`username.ilike.%${keyword}%, nickname.ilike.%${keyword}%`);
    }
    
    const { data, error } = await query.limit(50);
    if (error) return [];
    return data;
}

async function getMyFriends(userId) {
    const { data: friendships, error } = await supabaseClient
        .from('friendships')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');
    
    if (error || !friendships || friendships.length === 0) {
        return [];
    }
    
    const friendIds = friendships.map(f => f.friend_id);
    const { data: friends } = await supabaseClient
        .from('user_profiles')
        .select('id, username, nickname, avatar, tags')
        .in('id', friendIds);
    
    return friends || [];
}

async function sendFriendRequest(fromUserId, toUserId) {
    try {
        const { data: existingFriendship } = await supabaseClient
            .from('friendships')
            .select('id')
            .eq('user_id', fromUserId)
            .eq('friend_id', toUserId)
            .maybeSingle();
        
        if (existingFriendship) {
            return { success: false, error: '已经是好友了' };
        }
        
        await supabaseClient
            .from('friend_requests')
            .delete()
            .eq('from_user', fromUserId)
            .eq('to_user', toUserId);
        
        const { error } = await supabaseClient
            .from('friend_requests')
            .insert({ 
                from_user: fromUserId, 
                to_user: toUserId,
                status: 'pending'
            });
        
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getFriendRequests(userId) {
    const { data, error } = await supabaseClient
        .from('friend_requests')
        .select('id, from_user, status, created_at')
        .eq('to_user', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    
    if (error || !data) return [];

    for (let req of data) {
        const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('id, username, nickname, avatar')
            .eq('id', req.from_user);
        req.from_profile = profile && profile[0];
    }

    return data;
}

async function handleFriendRequest(requestId, accept, fromUserId, toUserId) {
    if (accept) {
        await supabaseClient
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);
        
        await supabaseClient
            .from('friendships')
            .insert([
                { user_id: fromUserId, friend_id: toUserId },
                { user_id: toUserId, friend_id: fromUserId }
            ]);
        
        return { success: true };
    } else {
        await supabaseClient
            .from('friend_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);
        return { success: true };
    }
}

async function deleteFriend(userId, friendId) {
    await supabaseClient
        .from('friendships')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', friendId);
    
    await supabaseClient
        .from('friendships')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', userId);
    
    return { success: true };
}

async function sendMessage(fromUserId, toUserId, content) {
    const { error } = await supabaseClient
        .from('messages')
        .insert({
            from_user: fromUserId,
            to_user: toUserId,
            content: content,
            read: false
        });
    
    return { success: !error };
}

async function getChatHistory(userId, otherUserId, limit = 100) {
    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(from_user.eq.${userId},to_user.eq.${otherUserId}),and(from_user.eq.${otherUserId},to_user.eq.${userId})`)
        .order('created_at', { ascending: true })
        .limit(limit);
    
    if (error) return [];
    return data || [];
}

// 标记消息已读（核心）
async function markMessagesAsRead(userId, fromUserId) {
    await supabaseClient
        .from('messages')
        .update({ read: true })
        .eq('to_user', userId)
        .eq('from_user', fromUserId)
        .eq('read', false);
}

// 获取未读消息数量（给红点用）
async function getUnreadCounts(userId) {
    const { data, error } = await supabaseClient
        .from('messages')
        .select('from_user')
        .eq('to_user', userId)
        .eq('read', false);
    
    if (error) return {};
    
    const counts = {};
    data.forEach(msg => {
        counts[msg.from_user] = (counts[msg.from_user] || 0) + 1;
    });
    return counts;
}

// 实时监听新消息
function subscribeToMessages(userId, onNewMessage) {
    return supabaseClient
        .channel('messages-channel-' + userId)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user=eq.${userId}`
        }, (payload) => onNewMessage(payload.new))
        .subscribe();
}

function subscribeToFriendRequests(userId, onNewRequest) {
    return supabaseClient
        .channel('requests-channel-' + userId)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `to_user=eq.${userId}`
        }, async (payload) => {
            const { data: profile } = await supabaseClient
                .from('user_profiles')
                .select('username, nickname, avatar')
                .eq('id', payload.new.from_user);
            onNewRequest({ ...payload.new, from_profile: profile && profile[0] });
        })
        .subscribe();
}

async function getPosts(limit = 50) {
    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error || !data) return [];

    for (let post of data) {
        const { data: author } = await supabaseClient
            .from('user_profiles')
            .select('id, username, nickname, avatar')
            .eq('id', post.user_id);
        post.author = author && author[0];
    }

    return data;
}

async function createPost(userId, title, content, category) {
    const { error } = await supabaseClient
        .from('posts')
        .insert({
            user_id: userId,
            title: title,
            content: content,
            category: category
        });
    
    return { success: !error };
}

async function getRecommendedUsers(userId, userTags, myFriendsIds) {
    if (!userTags || userTags.length === 0) return [];
    
    const { data: allUsers } = await supabaseClient
        .from('user_profiles')
        .select('id, username, nickname, avatar, tags')
        .neq('id', userId);
    
    const filtered = allUsers.filter(user => !myFriendsIds.includes(user.id));
    
    const scored = filtered.map(user => {
        let matchCount = 0;
        const userTagList = user.tags || [];
        userTags.forEach(tag => {
            if (userTagList.includes(tag)) matchCount++;
        });
        return { ...user, matchCount };
    }).filter(u => u.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 10);
    
    return scored;
}

window.SupabaseAPI = {
    supabase: supabaseClient,
    checkAuth,
    getCurrentUser,
    getUserProfile,
    searchUsers,
    getMyFriends,
    sendFriendRequest,
    getFriendRequests,
    handleFriendRequest,
    deleteFriend,
    sendMessage,
    getChatHistory,
    markMessagesAsRead,
    getUnreadCounts,
    subscribeToMessages,
    subscribeToFriendRequests,
    getPosts,
    createPost,
    getRecommendedUsers
};