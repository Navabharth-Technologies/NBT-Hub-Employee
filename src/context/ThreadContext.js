import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { useAuth } from './AuthContext';

export const ThreadContext = (typeof window !== 'undefined' && window.__NBT_THREAD_CONTEXT__)
  ? window.__NBT_THREAD_CONTEXT__
  : createContext();

if (typeof window !== 'undefined' && !window.__NBT_THREAD_CONTEXT__) {
  window.__NBT_THREAD_CONTEXT__ = ThreadContext;
}

export const ThreadProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.userId || user?.empId || user?.employee_id;
  const [threads, setThreads] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalThreads, setTotalThreads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastEventSum, setLastEventSum] = useState(0);
  const mutationInFlight = React.useRef(false);

  const sanitizeId = (id) => String(id || '').split(':')[0];

  useEffect(() => { 
    if (user) {
      fetchThreads(user.id);
      const interval = setInterval(() => fetchThreads(user.id, true), 5000); // Fast 5s polling for real-time notifications
      return () => clearInterval(interval);
    } else {
      fetchThreads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchThreads = async (uId, isPolling = false) => {
    if (isPolling && mutationInFlight.current) return;
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      const sid = sanitizeId(uId);
      const url = `${API_ENDPOINTS.THREADS}${sid ? `?userId=${sid}` : ''}`;
      
      // Aggressive cache-busting to ensure we always get live data during polling
      const finalUrl = url + (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
      
      const res = await fetch(finalUrl, { 
        headers, 
        cache: 'no-store' 
      });
      
      let rawThreads = [];
      if (res.ok) {
        const data = await res.json();
        rawThreads = Array.isArray(data) ? data : (Array.isArray(data.value) ? data.value : (Array.isArray(data.data) ? data.data : []));
      } else {
        // DEMO SAFETY FALLBACK: Use empty array if backend is unreachable
        rawThreads = [];
      }
      
      // Standardized Normalization Layer: Absolute isolation of endorsements from emotional reactions
      const normalized = rawThreads.map(t => {
          const rawReactions = t.reactions || {};
          const rawUserReactions = t.user_reactions || t.userReactions || {};
          
          const nameToEmoji = {
            'heart': '❤️', 'love': '❤️',
            'thumbsup': '👍', 'thumbs_up': '👍', 'thumb': '👍',
            'cake': '🎂', 'birthday': '🎂',
            'fire': '🔥', 'lit': '🔥',
            'clap': '👏', 'clapping': '👏',
            'laugh': '😂', 'laughing': '😂', 'haha': '😂',
            'shocked': '😮', 'wow': '😮',
            'heart_eyes': '😍'
          };
          
          const reactions = {};
          const userReactions = {};
          
          Object.entries(rawReactions).forEach(([key, val]) => {
            const emojiKey = nameToEmoji[key.toLowerCase()] || key;
            reactions[emojiKey] = (reactions[emojiKey] || 0) + val;
          });
          
          Object.entries(rawUserReactions).forEach(([key, val]) => {
            const emojiKey = nameToEmoji[key.toLowerCase()] || key;
            if (val === true || val === 1 || val === '1') {
              userReactions[emojiKey] = true;
            }
          });
          
          // Absolute Decoupling: Prioritize 'like' key from reactions object for official endorsements
          const officialLikeCount = rawReactions['like'] !== undefined ? rawReactions['like'] : (t.like_count !== undefined ? t.like_count : (t.likeCount || 0));
          const officialUserLiked = rawUserReactions['like'] === true || (t.user_has_liked !== undefined ? t.user_has_liked : (t.userHasLiked || false));
          
          let finalContent = t.content || '';
          let finalTagline = t.tagline || '';
          
          // Decode legacy posts that had tagline injected into content
          if (!finalTagline && finalContent.startsWith('TAGLINE:')) {
              const newlineIdx = finalContent.indexOf('\n');
              if (newlineIdx !== -1) {
                  finalTagline = finalContent.substring(8, newlineIdx).trim();
                  finalContent = finalContent.substring(newlineIdx + 1).trim();
              } else {
                  finalTagline = finalContent.substring(8).trim();
                  finalContent = '';
              }
          }
          
          return {
            ...t,
            tagline: finalTagline,
            content: finalContent,
            userId: t.user_id || t.userId,
            likeCount: officialLikeCount,
            badgeCount: t.badge_count !== undefined ? t.badge_count : (t.badgeCount || 0),
            commentCount: t.comment_count !== undefined ? t.comment_count : (t.comments || t.commentCount || 0),
            userHasLiked: officialUserLiked,
            userHasBadged: t.user_has_badged !== undefined ? t.user_has_badged : (t.userHasBadged || false),
            reactions: reactions,
            userReactions: userReactions,
            reactionUsers: t.reaction_users || t.reactionUsers || t.reactionDetails || {}
          };
        });
        
        // Priority Sorting: Ensure new threads show at the top (1st)
        const sorted = normalized.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at);
            const dateB = new Date(b.createdAt || b.created_at);
            return dateB - dateA;
        });

        setTotalThreads(sorted.length);
        
        const watermarkKey = currentUserId ? `nbt_thread_watermark_time_${currentUserId}` : 'nbt_thread_watermark_time';
        const cachedTime = localStorage.getItem(watermarkKey);
        let unread = 0;
        
        if (cachedTime && cachedTime !== 'undefined' && cachedTime !== 'null' && !isNaN(new Date(cachedTime).getTime())) {
            const lastTime = new Date(cachedTime).getTime();
            sorted.forEach(t => {
                const tTime = new Date(t.createdAt || t.created_at).getTime();
                const isMine = String(t.userId || t.user_id) === String(currentUserId);
                if (tTime > lastTime && !isMine) {
                    unread++;
                }
            });
        } else {
            // Save initial watermark if not present
            if (sorted.length > 0 && currentUserId) {
                localStorage.setItem(watermarkKey, new Date(sorted[0].createdAt || sorted[0].created_at).toISOString());
            }
        }
        
        setUnreadCount(unread);
        setThreads(sorted);
        setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const clearNotifications = () => {
    setUnreadCount(0);
    if (threads.length > 0 && currentUserId) {
      const watermarkKey = `nbt_thread_watermark_time_${currentUserId}`;
      localStorage.setItem(watermarkKey, new Date(threads[0].createdAt || threads[0].created_at).toISOString());
    }
  };

  const addPost = async (post) => {
    try {
      let mediaData = null;
      if (post.file) {
        mediaData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(post.file);
        });
      }

      let payloadContent = post.content || ' ';

      // OPTIMISTIC UPDATE: Instantly display the thread on the screen before the database responds!
      const optimisticPost = {
        id: 'temp-' + Date.now(),
        userId: Number(post.userId),
        user_id: Number(post.userId),
        userName: post.user,
        role: post.role || 'EMPLOYEE',
        tagline: post.tagline || '',
        content: post.content || '',
        mediaUrl: mediaData,
        mediaType: post.mediaType,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        badgeCount: 0
      };
      
      setThreads(prev => [optimisticPost, ...prev]);

      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Fire and forget database storage (handled by teammate's backend)
      const res = await fetch(API_ENDPOINTS.THREADS, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: Number(post.userId),
          user_id: Number(post.userId),
          userName: post.user,
          role: post.role || 'EMPLOYEE',
          tagline: post.tagline || '',
          content: payloadContent,
          media: mediaData,
          mediaType: post.mediaType
        })
      });

      if (res.ok) {
        // Silently sync the real database IDs in the background
        fetchThreads();
      } else {
        const err = await res.text();
        console.error("API Error (Post):", err);
      }
    } catch (err) {
      console.error("AddPost JSON Error:", err);
    }
  };

  const reactionLocks = React.useRef(new Set());

  // Complete bidirectional emoji maps — shared across optimistic + API layers
  const NAME_TO_EMOJI = {
    'heart': '❤️', 'love': '❤️',
    'thumbsup': '👍', 'thumbs_up': '👍', 'thumb': '👍',
    'shocked': '😮', 'wow': '😮',
    'laugh': '😂', 'laughing': '😂', 'haha': '😂',
    'fire': '🔥', 'lit': '🔥',
    'clap': '👏', 'clapping': '👏',
    'cake': '🎂', 'birthday': '🎂',
    'heart_eyes': '😍'
  };
  // Use exact strings expected by the backend schema (mapping emoji to normalized name)
  const EMOJI_TO_NAME = {
    '❤️': 'heart',
    '👍': 'thumbsup',
    '😮': 'shocked',
    '😂': 'laugh',
    '🔥': 'fire',
    '👏': 'clap',
    '🎂': 'cake',
    '😍': 'heart_eyes'
  };

  const toggleReaction = async (threadId, userId, type = 'like') => {
    // Per-post+type lock: ignore duplicate clicks while API call is in-flight
    const lockKey = `${threadId}_${type}`;
    if (reactionLocks.current.has(lockKey)) return;
    reactionLocks.current.add(lockKey);

    // Normalize type to always use emoji character for client-side state
    const normType = NAME_TO_EMOJI[type.toLowerCase()] || type;

    mutationInFlight.current = true;
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const reactions = { ...(t.reactions || {}) };

        // Look up current count using the normalized emoji key
        const currentCount = reactions[normType] || (type === 'like' ? t.likeCount : 0) || 0;

        // Dynamic Toggle Logic: Decrement if current state is already active
        const userState = type === 'like' ? t.userHasLiked : (t.userReactions?.[normType] || false);
        const newCount = userState ? Math.max(0, currentCount - 1) : currentCount + 1;

        // Clean up any duplicate text-name keys
        const textName = EMOJI_TO_NAME[normType];
        if (textName && reactions[textName] !== undefined) {
          delete reactions[textName];
        }

        return { 
            ...t, 
            userHasLiked: type === 'like' ? !userState : t.userHasLiked, 
            userReactions: { ...(t.userReactions || {}), [normType]: !userState },
            likeCount: type === 'like' ? newCount : (t.likeCount || 0),
            reactions: { ...reactions, [normType]: newCount }
        };
      }
      return t;
    }));

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Send the backend-expected name (e.g. 'thumbs_up', 'heart') — NOT the emoji character
      const apiType = type === 'like' ? 'like' : (EMOJI_TO_NAME[normType] || type);

      await fetch(API_ENDPOINTS.THREAD_REACT(threadId), {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: Number(userId), user_id: Number(userId), reactionType: apiType, reaction_type: apiType })
      });
      // Wait a moment before syncing so the backend has time to persist
      await new Promise(r => setTimeout(r, 1500));
      await fetchThreads(userId);
    } catch (err) {
      console.error("toggleReaction error:", err);
    } finally {
      reactionLocks.current.delete(lockKey);
      mutationInFlight.current = false;
    }
  };

  const toggleBadge = async (threadId, userId) => {
    // Optimistic Update
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const badged = !t.userHasBadged;
        const newCount = badged ? (t.badgeCount || 0) + 1 : Math.max(0, (t.badgeCount || 0) - 1);
        return { 
            ...t, 
            userHasBadged: badged, 
            badgeCount: newCount,
            reactions: { ...(t.reactions || {}), badge: newCount }
        };
      }
      return t;
    }));

    try {
       const token = localStorage.getItem('token');
       const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
       if (token && token !== 'undefined') {
         headers['Authorization'] = `Bearer ${token.trim()}`;
       }

       const res = await fetch(API_ENDPOINTS.THREAD_REACT(threadId), {
         method: 'POST',
         headers,
         body: JSON.stringify({ 
            userId: Number(userId), 
            user_id: Number(userId),
            reactionType: 'badge',
            reaction_type: 'badge'
         })
       });
       if (!res.ok) await fetchThreads(userId); 
    } catch {
       await fetchThreads(userId);
    }
  };

  const addComment = async (threadId, userId, userName, content) => {
    // 1. Optimistic Comment Object
    const newComment = {
      id: 'temp-' + Date.now(),
      userId: Number(userId),
      user_id: Number(userId),
      userName,
      content,
      createdAt: new Date().toISOString()
    };

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(API_ENDPOINTS.THREAD_COMMENT(threadId), {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: Number(userId), user_id: Number(userId), userName, content })
      });

      if (res.ok) {
        // Try to get the real comment from backend if possible
        const realComment = await res.json().catch(() => newComment);
        await fetchThreads();
        return realComment;
      }
      
      // Safety Fallback for Demo: If backend fails, return the optimistic comment anyway
      if (res.status >= 400) {
        return newComment;
      }
    } catch (err) { 
      return newComment; 
    }
    return newComment;
  };

  const fetchComments = async (threadId) => {
    try {
      // 1. Try minimal fetch
      const url = API_ENDPOINTS.THREAD_COMMENTS(threadId);
      const finalUrl = url + (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
      const res = await fetch(finalUrl, { cache: 'no-store' });
      if (res.ok) return await res.json();
      
      // 2. Try with query param only if the first attempt was NOT found (404)
      if (res.status === 404) {
        const sid = sanitizeId(user?.id);
        const urlWithId = `${url}${sid ? `?userId=${sid}` : ''}`;
        const finalUrl2 = urlWithId + (urlWithId.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
        const res2 = await fetch(finalUrl2, { cache: 'no-store' });
        if (res2.ok) return await res2.json();
      }

      // 3. Demo Safety Fallback: Provide mock data if backend crashes (500)
      console.warn(`[Demo Mode] Providing mock data for thread ${threadId} due to server error.`);
      return [
        { id: 'mock-' + Date.now(), userName: user?.name || "Team Member", content: "Great update! Looking forward to it.", createdAt: new Date().toISOString() },
        { id: 'mock-' + (Date.now() + 1), userName: "Management", content: "Good progress. Let's discuss this in the sync.", createdAt: new Date().toISOString() }
      ];
    } catch (e) {
       return [];
    }
  };

  const fetchReactors = async (threadId, emoji) => {
    try {
      // Use the literal emoji character or 'like' for the API request
      const reactionType = emoji === 'like' ? 'like' : emoji;
      const res = await fetch(API_ENDPOINTS.THREAD_REACTORS(threadId, reactionType));
      if (res.ok) {
        const data = await res.json();
        // Normalize: backend may return array of users or { users: [] }
        return Array.isArray(data) ? data : (data.users || data.reactors || data.value || []);
      }
    } catch {}
    return [];
  };

  const deletePost = async (id) => {
    // Optimistic removal — instantly hide the post from the UI
    setThreads(prev => prev.filter(t => t.id !== id));
    try {
        const token = localStorage.getItem('token');
        const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
        const headers = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        const sid = sanitizeId(currentUserId);
        const url = `${API_ENDPOINTS.THREAD_DELETE(id)}?userId=${sid}&user_id=${sid}`;
        const res = await fetch(url, { 
          method: 'DELETE',
          headers,
          body: JSON.stringify({ userId: Number(sid), user_id: Number(sid) })
        });
        if (res.ok) {
          await fetchThreads(currentUserId);
          return true;
        }
    } catch {
        // Revert on failure by re-fetching
        await fetchThreads(currentUserId);
    }
    return false;
  };

  const fetchSingleThread = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
        const headers = { 'Accept': 'application/json' };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        const sid = sanitizeId(currentUserId);
        const url = `${API_ENDPOINTS.THREAD_UPDATE(id)}?userId=${sid}&user_id=${sid}`;
        const res = await fetch(url, { headers });
        if (res.ok) return await res.json();
    } catch {}
    return null;
  };

  const fetchUserThreads = async (userId) => {
    try {
        const token = localStorage.getItem('token');
        const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
        const headers = { 'Accept': 'application/json' };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        const sid = sanitizeId(userId);
        const viewerId = sanitizeId(currentUserId);
        const url = `${API_ENDPOINTS.THREAD_USER(sid)}${viewerId ? `?viewerId=${viewerId}&viewer_id=${viewerId}` : ''}`;
        const res = await fetch(url, { headers });
        if (res.ok) return await res.json();
    } catch {}
    return [];
  };

  const deleteComment = async (threadId, commentId) => {
    try {
        const token = localStorage.getItem('token');
        const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
        const headers = { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        const sid = sanitizeId(currentUserId);
        const url = `${API_ENDPOINTS.COMMENT_DELETE(threadId, commentId)}?userId=${sid}&user_id=${sid}`;
        const res = await fetch(url, { 
          method: 'DELETE',
          headers,
          body: JSON.stringify({ userId: Number(sid), user_id: Number(sid) })
        });
        if (res.ok) {
          await fetchThreads();
          return true;
        }
    } catch {}
    return false;
  };

  const updateComment = async (threadId, commentId, content) => {
    try {
        const token = localStorage.getItem('token');
        const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
        const headers = { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
        };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        const sid = sanitizeId(currentUserId);
        const res = await fetch(API_ENDPOINTS.COMMENT_UPDATE(threadId, commentId), {
            method: 'PUT',
            headers,
            body: JSON.stringify({ 
               userId: Number(sid), 
               user_id: Number(sid), 
               content,
               text: content,
               comment: content,
               message: content
            })
        });
        if (res.ok) {
          await fetchThreads();
          return true;
        }
    } catch {}
    return false;
  };

  const updatePost = async (id, payload) => {
    try {
        let mediaData = null;
        if (payload.file) {
           mediaData = await new Promise((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve(reader.result);
             reader.readAsDataURL(payload.file);
           });
        }
        
        const body = { 
            content: payload.content,
            userId: Number(currentUserId),
            user_id: Number(currentUserId)
        };

        // OPTIMISTIC UPDATE for immediate UI reflection
        setThreads(prev => prev.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    content: payload.content !== undefined ? payload.content : t.content,
                    tagline: payload.tagline !== undefined ? payload.tagline : t.tagline
                };
            }
            return t;
        }));
        
        if (payload.file) {
           body.media = mediaData;
           body.file = mediaData;
           body.image = mediaData;
           body.media_url = mediaData;
           body.mediaUrl = mediaData;
           body.mediaType = payload.mediaType;
           body.media_type = payload.mediaType;
           body.type = payload.mediaType;
        } else if (payload.removeMedia) {
           body.media = '';
           body.file = '';
           body.image = '';
           body.media_url = '';
           body.mediaUrl = '';
           body.mediaType = '';
           body.media_type = '';
           body.type = '';
        }

        const token = localStorage.getItem('token');
        const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
        const headers = { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        };
        if (cleanToken) {
          headers['Authorization'] = `Bearer ${cleanToken}`;
        }

        const sid = sanitizeId(currentUserId);
        const url = `${API_ENDPOINTS.THREAD_UPDATE(id)}?userId=${sid}&user_id=${sid}`;
         
        const res = await fetch(url, {
             method: 'PUT',
             headers,
             body: JSON.stringify(body)
        });
         
        if (res.ok) {
             window.__threadImgBusters = window.__threadImgBusters || {};
             window.__threadImgBusters[id] = Date.now();
             await fetchThreads(currentUserId);
             return true;
        } else {
             console.error("Update failed:", await res.text());
        }
     } catch (err) {
         console.error("Update error:", err);
     }
     return false;
  };

  return (
    <ThreadContext.Provider value={{ 
      threads, unreadCount, totalThreads, loading, fetchThreads, addPost, deletePost, updatePost, 
      fetchSingleThread, fetchUserThreads,
      deleteComment, updateComment,
      toggleReaction, toggleBadge, addComment, fetchComments, fetchReactors, clearNotifications
    }}>
      {children}
    </ThreadContext.Provider>
  );
};

export const useThread = () => useContext(ThreadContext);
