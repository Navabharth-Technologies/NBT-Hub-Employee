import React, { useState, useEffect, useRef } from 'react';
import { useThread } from '../context/ThreadContext';
import { useAuth } from '../context/AuthContext';
import {
    Heart, MessageSquare, Award, Smile,
    Send, MoreHorizontal, User, Share2, Cake, Gift, Plus, ChevronLeft,
    Trash2, Edit3, X, Check, Image as ImageIcon, Film, XCircle, Trash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { API_ENDPOINTS, BASE_URL } from '../config';

const EMOJI_LIST = ['❤️', '👍', '😮', '😂', '🔥', '👏', '🎂'];

export default function ThreadScreen() {
    const navigate = useNavigate();
    const { threads, unreadCount, loading, clearNotifications, addPost, deletePost, updatePost, deleteComment, updateComment, toggleReaction, toggleBadge, addComment, fetchComments, fetchReactors } = useThread();
    const { user } = useAuth();
    const currentUserId = user?.id || user?.userId || user?.empId || user?.employee_id;

    const [tagline, setTagline] = useState('');
    const [newPost, setNewPost] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [activeCommentPost, setActiveCommentPost] = useState(null);
    const [flyingEmoji, setFlyingEmoji] = useState(null);
    const [userProfiles, setUserProfiles] = useState({});
    const [postComments, setPostComments] = useState({});
    const [loadingComments, setLoadingComments] = useState({});
    const [editingPostId, setEditingPostId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const isMobile = winWidth < 768;
    const isTablet = winWidth < 1024;
    const [reactorModal, setReactorModal] = useState(null); // { postId, emoji, users, count }
    const [loadingReactors, setLoadingReactors] = useState(false);
    const [fullscreenMedia, setFullscreenMedia] = useState(null); // { src, type }
    const [errorNotif, setErrorNotif] = useState(null); // { message }

    const [editMediaFile, setEditMediaFile] = useState(null);
    const [editMediaType, setEditMediaType] = useState(null);
    const [editMediaPreview, setEditMediaPreview] = useState(null);
    const [editRemoveMedia, setEditRemoveMedia] = useState(false);
    const editFileInputRef = useRef(null);

    const showError = (message) => {
        setErrorNotif({ message });
        setTimeout(() => setErrorNotif(null), 4000);
    };

    useEffect(() => {
        fetchProfiles();
        clearNotifications();
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Clear notifications in real-time as threads update while user is on this screen
    useEffect(() => {
        if (threads.length > 0) clearNotifications();
    }, [threads]);

    const fetchProfiles = async () => {
        try {
            const resp = await fetch(API_ENDPOINTS.USERS);
            if (resp.ok) {
                const data = await resp.json();
                const userList = Array.isArray(data) ? data : (data.value || []);
                const map = {};
                userList.forEach(u => {
                    const uid = String(u.id || u.empId || u.userId || u.employee_id);
                    if (uid) map[uid] = u;
                });
                setUserProfiles(map);
            }
        } catch (err) { console.error("Profiles error:", err); }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMediaFile(file);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
        setMediaPreview(URL.createObjectURL(file));
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEditFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setEditMediaFile(file);
        setEditMediaType(file.type.startsWith('video') ? 'video' : 'image');
        setEditMediaPreview(URL.createObjectURL(file));
        setEditRemoveMedia(false);
    };

    const handlePost = async () => {
        if (!newPost.trim() && !mediaFile) return;
        setUploading(true);
        try {
            await addPost({
                userId: currentUserId,
                user: user?.name || 'User',
                role: user?.role?.toUpperCase() || 'EMPLOYEE',
                tagline: tagline,
                content: newPost,
                file: mediaFile,
                mediaType: mediaType
            });
            setNewPost('');
            setTagline('');
            clearMedia();
        } catch (err) {
            console.error("Post Error:", err);
        } finally {
            setUploading(false);
        }
    };

    const onToggleLike = async (id, type = 'like') => await toggleReaction(id, currentUserId, type);

    const [commentText, setCommentText] = useState('');
    const handleAddComment = async (id) => {
        if (!commentText.trim()) return;
        const success = await addComment(id, currentUserId, user?.name || 'User', commentText);
        if (success) {
            setCommentText('');
            const comments = await fetchComments(id);
            setPostComments(prev => ({ ...prev, [id]: comments }));
        }
    };

    const handleOpenComments = async (postId) => {
        if (activeCommentPost === postId) { setActiveCommentPost(null); return; }
        setActiveCommentPost(postId);
        setLoadingComments(prev => ({ ...prev, [postId]: true }));
        const comments = await fetchComments(postId);
        setPostComments(prev => ({ ...prev, [postId]: comments }));
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
    };

    const onReact = (id, emoji, e) => {
        const x = e.clientX;
        const y = e.clientY;
        setFlyingEmoji({ emoji, x, y, postId: id });
        setActiveEmojiPicker(null);

        // Emotional Reaction - Distinct from the footer 'Like' action
        onToggleLike(id, emoji);

        setTimeout(() => setFlyingEmoji(null), 3500);
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        // Use YYYY/MM/DD format to force local time interpretation across all browsers
        const d = new Date(typeof ts === 'string' ? ts.replace(/-/g, '/').replace('T', ' ').split('.')[0] : ts);
        if (isNaN(d.getTime())) return '...';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
    };

    const openReactorsModal = async (post, emoji) => {
        const cachedData = post.reactionUsers?.[emoji] || post.reactionDetails?.[emoji] || [];
        const fallbackCount = emoji === 'like'
            ? (post.likeCount || 0)
            : (post.reactions?.[emoji] || 0);
        const dynamicCount = cachedData.length > 0 ? cachedData.length : fallbackCount;

        // Open modal immediately with cached/count data
        setReactorModal({
            postId: post.id,
            emoji: emoji === 'like' ? '❤️' : emoji,
            users: cachedData,
            count: dynamicCount
        });

        // Fetch live reactor list from API
        setLoadingReactors(true);
        try {
            let liveUsers = await fetchReactors(post.id, emoji);

            // If 'like' returns empty, the backend may store likes as '❤️' — retry
            if ((!liveUsers || liveUsers.length === 0) && emoji === 'like') {
                liveUsers = await fetchReactors(post.id, '❤️');
            }

            if (liveUsers && liveUsers.length > 0) {
                setReactorModal(prev => prev ? { ...prev, users: liveUsers, count: liveUsers.length } : null);
            }
        } catch { }
        setLoadingReactors(false);
    };

    const styles = {
        container: { minHeight: '100vh', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', padding: isMobile ? '15px 20px' : (isTablet ? '25px 50px' : '40px 100px'), maxWidth: '100%', margin: '0', boxSizing: 'border-box' },
        card: { backgroundColor: 'white', borderRadius: isMobile ? '25px' : '40px', padding: isMobile ? '20px' : '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: '1px solid #eef2f6' },
        tagInput: { width: '100%', padding: isMobile ? '10px 15px' : '12px 20px', borderRadius: '15px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontSize: isMobile ? '11px' : '14px', fontWeight: '900', color: '#315A9E', outline: 'none', marginBottom: '12px' },
        mainInput: { width: '100%', padding: isMobile ? '12px' : '20px', borderRadius: '20px', border: '1.5px solid #f1f5f9', background: '#f8fafc', fontSize: isMobile ? '13px' : '16px', fontWeight: '600', color: '#0B1E3F', outline: 'none', resize: 'none', minHeight: isMobile ? '80px' : '100px' },
        mediaBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '8px 12px' : '10px 18px', borderRadius: '12px', border: '1.5px solid #eef2f6', background: 'white', cursor: 'pointer', fontSize: isMobile ? '10px' : '12px', fontWeight: '800', color: '#64748b' },
        postBtn: { padding: isMobile ? '10px 15px' : '12px 30px', backgroundColor: '#315A9E', color: 'white', border: 'none', borderRadius: '15px', fontWeight: '1000', cursor: 'pointer', fontSize: isMobile ? '10px' : '13px', textTransform: 'uppercase' },
        threadCard: { backgroundColor: 'white', borderRadius: isMobile ? '25px' : '40px', padding: isMobile ? '15px 20px' : '24px 30px', border: '1.5px solid #CBD5E1', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', marginBottom: '20px', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
        taglineBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '8px', background: '#f0f9ff', color: '#315A9E', fontSize: isMobile ? '8px' : '9px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '12px', border: '1px solid #e0f2fe' },
        postMedia: { marginTop: '20px', borderRadius: '25px', overflow: 'hidden', border: '1.5px solid #f8fafc', maxHeight: isMobile ? '300px' : '380px', maxWidth: '100%', width: 'fit-content', backgroundColor: '#fdfdfd', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' },
        footer: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '15px', gap: isMobile ? '5px' : '10px', flexWrap: isMobile ? 'wrap' : 'nowrap' },
        action: (active, color) => ({
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '4px' : '8px',
            color: active ? 'white' : color,
            backgroundColor: active ? color : '#f8fafc',
            padding: isMobile ? '6px 8px' : '8px 16px',
            borderRadius: '12px',
            fontSize: isMobile ? '9px' : (isTablet ? '11px' : '12px'),
            fontWeight: '900',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: active ? `1.5px solid ${color}` : '1.5px solid #f1f5f9',
            position: 'relative',
            flex: isMobile ? '1 1 auto' : 'none',
            justifyContent: 'center'
        }),
        emojiPicker: {
            position: 'absolute',
            bottom: '100%',
            left: '0',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            gap: '8px',
            marginBottom: '10px',
            border: '1px solid #eef2f6',
            zIndex: 100
        },
        reactionBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'white',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '600',
            border: '1px solid #f1f5f9',
            cursor: 'pointer'
        },
        modalOverlay: {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        },
        modalContent: {
            backgroundColor: 'white',
            borderRadius: '30px',
            width: '90%',
            maxWidth: '400px',
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            position: 'relative'
        }
    };

    if (loading) {
        return (
            <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        style={{
                            width: '80px',
                            height: '80px',
                            border: '4px solid rgba(49, 90, 158, 0.1)',
                            borderTop: '4px solid #315A9E',
                            borderRight: '4px solid #315A9E',
                            borderRadius: '50%',
                            boxShadow: '0 0 20px rgba(49, 90, 158, 0.1)'
                        }}
                    />
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                            marginTop: '30px',
                            color: '#315A9E',
                            fontWeight: '900',
                            fontSize: '14px',
                            letterSpacing: '3px',
                            textTransform: 'uppercase'
                        }}
                    >
                        Syncing Team Feed
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* CREATE THREAD */}
            <div style={{ ...styles.card, borderTop: '5px solid #FDB913' }}>
                <input id="thread-tagline-input" style={styles.tagInput} placeholder="Add a tagline..." value={tagline} onChange={e => setTagline(e.target.value)} />
                <textarea id="thread-content-input" style={styles.mainInput} placeholder="Share an update with the team..." value={newPost} onChange={e => setNewPost(e.target.value)} />

                <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept="image/*,video/*" />

                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', alignItems: 'center' }}>
                    <div style={styles.mediaBtn} onClick={() => fileInputRef.current?.click()}><ImageIcon size={18} color="#10b981" /> Photo</div>
                    <div style={styles.mediaBtn} onClick={() => fileInputRef.current?.click()}><Film size={18} color="#ef4444" /> Video</div>
                    <div style={{ flex: 1 }} />
                    <button style={styles.postBtn} onClick={handlePost} disabled={uploading}>
                        {uploading ? 'Publishing...' : 'Publish Thread'}
                    </button>
                </div>

                {mediaPreview && (
                    <div style={{ marginTop: '20px', position: 'relative', borderRadius: '25px', overflow: 'hidden', maxWidth: '400px' }}>
                        <XCircle size={24} color="white" style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', zIndex: 10 }} onClick={clearMedia} />
                        {mediaType === 'video' ? (<video src={mediaPreview} controls style={{ width: '100%', display: 'block' }} />) : (<img src={mediaPreview} alt="" style={{ width: '100%', display: 'block' }} />)}
                    </div>
                )}
            </div>

            {/* THREAD FEED */}
            <AnimatePresence>
                {uploading && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ ...styles.card, background: '#f0f9ff', border: '1.5px dashed #315A9E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ width: '20px', height: '20px', border: '3px solid rgba(49, 90, 158, 0.1)', borderTop: '3px solid #315A9E', borderRadius: '50%' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#315A9E', letterSpacing: '1px', textTransform: 'uppercase' }}>Broadcasting your update...</span>
                    </motion.div>
                )}
            </AnimatePresence>
            {threads.map(post => {
                const authorId = user?.id || user?.empId || user?.userId || user?.employee_id;
                const uid = post.userId || post.user_id;
                const ts = post.createdAt;

                const authorIdMatch = authorId && uid && String(authorId) === String(uid);
                const nameMatch = (user?.name && (post.userName || post.user)) && (user.name === (post.userName || post.user));
                const isAuthor = authorIdMatch || nameMatch;

                const isLead = user?.role === 'TEAMLEADER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
                const canManage = isAuthor;
                const isEditing = editingPostId === post.id;
                const pLiked = post.userHasLiked || false;
                const activeReaction = pLiked ? '❤️' : Object.keys(post.userReactions || {}).find(k => post.userReactions[k] === true);
                const likeCount = post.likeCount || 0;
                const commentCount = post.commentCount || 0;

                return (
                    <div key={post.id} style={styles.threadCard}>
                        {post.tagline && <div style={styles.taglineBadge}>{post.tagline}</div>}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '15px', backgroundColor: '#0B1E3F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(11, 30, 63, 0.15)' }}>
                                    {(() => {
                                        const profile = userProfiles[uid] || Object.values(userProfiles).find(p => p.name === (post.userName || post.user));
                                        const pic = profile?.profileImage || profile?.profilePicture || profile?.profile_image || profile?.profile_picture || profile?.avatar || post.userImage;
                                        if (pic) {
                                            const src = pic.startsWith('http') ? pic : `${BASE_URL}${pic.startsWith('/') ? pic : '/' + pic}`;
                                            return <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />;
                                        }
                                        return (profile?.name || post.user_name || post.userName || post.user || '?').charAt(0).toUpperCase();
                                    })()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-0.3px' }}>{userProfiles[uid]?.name || post.user_name || post.userName || post.user || 'Collaborator'}</div>
                                    <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#315A9E', fontWeight: '900', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>
                                        {userProfiles[uid]?.role || post.role || 'Member'} •
                                        {(post.emp_id || post.empId || uid) && ` ID: ${post.emp_id || post.empId || uid} • `}
                                        {formatTime(ts)}
                                    </div>
                                </div>
                            </div>

                            {canManage && (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                        onClick={() => {
                                            setEditingPostId(post.id);
                                            setEditContent(post.content);
                                            setEditMediaFile(null);
                                            setEditMediaPreview(null);
                                            setEditRemoveMedia(false);
                                        }}
                                        style={{ border: 'none', background: '#f8fafc', color: '#315A9E', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Edit post"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={() => deletePost(post.id)}
                                        style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Delete post"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '14px', fontSize: isMobile ? '13px' : '15px', color: '#0B1E3F', lineHeight: '1.6', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <textarea
                                        id={`thread-edit-content-input-${post.id}`}
                                        style={{ ...styles.mainInput, minHeight: '80px', padding: '15px' }}
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                    />

                                    <input type="file" ref={editFileInputRef} onChange={handleEditFileSelect} hidden accept="image/*,video/*" />
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <div style={styles.mediaBtn} onClick={() => editFileInputRef.current?.click()}>
                                            <ImageIcon size={18} color="#10b981" /> Replace Photo/Video
                                        </div>
                                        {(editMediaPreview || post.media_url || post.mediaUrl || post.media || post.image || post.media_path || post.file_path) && !editRemoveMedia && (
                                            <div style={{ ...styles.mediaBtn, color: '#ef4444' }} onClick={() => { setEditRemoveMedia(true); setEditMediaFile(null); setEditMediaPreview(null); }}>
                                                <Trash2 size={18} color="#ef4444" /> Remove Media
                                            </div>
                                        )}
                                    </div>

                                    {(editMediaPreview && !editRemoveMedia) && (
                                        <div style={{ marginTop: '10px', position: 'relative', borderRadius: '15px', overflow: 'hidden', maxWidth: '300px' }}>
                                            <XCircle size={24} color="white" style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', zIndex: 10 }} onClick={() => { setEditMediaFile(null); setEditMediaPreview(null); }} />
                                            {editMediaType === 'video' ? (<video src={editMediaPreview} controls style={{ width: '100%', display: 'block' }} />) : (<img src={editMediaPreview} alt="" style={{ width: '100%', display: 'block' }} />)}
                                        </div>
                                    )}

                                    {(!editMediaPreview && !editRemoveMedia) && (() => {
                                        const mediaPath = post.media_url || post.mediaUrl || post.media || post.image || post.media_path || post.file_path;
                                        if (!mediaPath || typeof mediaPath !== 'string') return null;
                                        const isVideo = post.media_type === 'video' || post.mediaType === 'video' || mediaPath.toLowerCase().includes('video') || mediaPath.toLowerCase().endsWith('.mp4');
                                        let src = mediaPath;
                                        if (!mediaPath.startsWith('http') && !mediaPath.startsWith('data:')) {
                                            const separator = mediaPath.startsWith('/') ? '' : '/';
                                            src = `${BASE_URL}${separator}${mediaPath}`;
                                        }
                                        return (
                                            <div style={{ marginTop: '10px', borderRadius: '15px', overflow: 'hidden', maxWidth: '300px', opacity: 0.5 }}>
                                                {isVideo ? (<video src={src} controls style={{ width: '100%', display: 'block' }} />) : (<img src={src} style={{ width: '100%', display: 'block' }} alt="" />)}
                                            </div>
                                        );
                                    })()}

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                        <button
                                            onClick={async () => {
                                                const success = await updatePost(post.id, {
                                                    content: editContent,
                                                    file: editMediaFile,
                                                    mediaType: editMediaType,
                                                    removeMedia: editRemoveMedia
                                                });
                                                if (success) {
                                                    setEditingPostId(null);
                                                    setEditMediaFile(null);
                                                    setEditMediaPreview(null);
                                                    setEditRemoveMedia(false);
                                                }
                                            }}
                                            style={{ backgroundColor: '#315A9E', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
                                        >
                                            SAVE
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingPostId(null);
                                                setEditMediaFile(null);
                                                setEditMediaPreview(null);
                                                setEditRemoveMedia(false);
                                            }}
                                            style={{ background: 'none', border: '1.5px solid #e2e8f0', color: '#64748b', padding: '8px 20px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                post.content
                            )}
                        </div>

                        {/* Support multiple field names and direct base64/relative URLs with type safety */}
                        {!isEditing && (() => {
                            const mediaPath = post.media_url || post.mediaUrl || post.media || post.image || post.media_path || post.file_path;
                            if (!mediaPath || typeof mediaPath !== 'string') return null;
                            const isVideo = post.media_type === 'video' || post.mediaType === 'video' || mediaPath.toLowerCase().includes('video') || mediaPath.toLowerCase().endsWith('.mp4');

                            let src = mediaPath;
                            if (!mediaPath.startsWith('http') && !mediaPath.startsWith('data:')) {
                                const separator = mediaPath.startsWith('/') ? '' : '/';
                                src = `${BASE_URL}${separator}${mediaPath}`;
                            }
                            return (
                                <div style={styles.postMedia}>
                                    {isVideo ? (
                                        <video src={src} controls style={{ maxWidth: '100%', maxHeight: '380px', display: 'block' }} />
                                    ) : (
                                        <img
                                            src={src}
                                            style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                                            alt=""
                                            onClick={() => setFullscreenMedia({ src, type: 'image' })}
                                        />
                                    )}
                                </div>
                            );
                        })()}



                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                            {post.reactions && Object.entries(post.reactions).map(([emoji, count]) => {
                                // Only render actual emoji reactions — skip metadata keys like 'like', 'badge', 'total', 'count'
                                if (!EMOJI_LIST.includes(emoji)) return null;
                                if (!count || count <= 0) return null;
                                const hasReacted = post.userReactions?.[emoji] === true;
                                return (
                                    <div
                                        key={emoji}
                                        style={{ ...styles.reactionBadge, backgroundColor: hasReacted ? '#f0f9ff' : 'white', borderColor: hasReacted ? '#315A9E' : '#f1f5f9' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openReactorsModal(post, emoji);
                                        }}
                                    >
                                        <span>{emoji}</span>
                                        <span style={{ color: hasReacted ? '#315A9E' : '#64748b' }}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={styles.footer}>
                            <div
                                onClick={() => onToggleLike(post.id)}
                                onMouseEnter={() => setActiveEmojiPicker(post.id)}
                                onMouseLeave={() => setActiveEmojiPicker(null)}
                                style={{ ...styles.action(!!activeReaction, '#ef4444'), gap: '6px', minWidth: isMobile ? '44px' : '56px' }}
                            >
                                {activeReaction ? (
                                    <span style={{ fontSize: isMobile ? '16px' : '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {activeReaction}
                                    </span>
                                ) : (
                                    <Heart size={isMobile ? 16 : 18} fill="none" stroke="#ef4444" strokeWidth={2.5} />
                                )}
                                {likeCount > 0 && (
                                    <span style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: '900' }}>{likeCount}</span>
                                )}

                                <AnimatePresence>
                                    {activeEmojiPicker === post.id && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                            style={styles.emojiPicker}
                                        >
                                            {EMOJI_LIST.map(emoji => (
                                                <div
                                                    key={emoji}
                                                    style={{ fontSize: '24px', cursor: 'pointer', transition: 'transform 0.1s' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReact(post.id, emoji, e);
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.3)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    {emoji}
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div onClick={() => handleOpenComments(post.id)} style={styles.action(activeCommentPost === post.id, '#315A9E')}>
                                <MessageSquare size={18} strokeWidth={2.5} />
                                <span style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: '900' }}>{commentCount}</span>
                            </div>
                        </div>

                        {activeCommentPost === post.id && (
                            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '25px' }}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <input
                                        id={`thread-comment-input-${post.id}`}
                                        style={{ flex: 1, padding: '12px 18px', borderRadius: '12px', border: '1.5px solid #eef2f6', fontSize: '14px', outline: 'none' }}
                                        placeholder="Add a comment..."
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                                    />
                                    <button
                                        id={`thread-comment-post-btn-${post.id}`}
                                        style={{ padding: '0 20px', background: '#315A9E', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
                                        onClick={() => handleAddComment(post.id)}
                                    >
                                        Post
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                    {loadingComments[post.id] ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }}>
                                            <div className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#315A9E' }} />
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Fetching conversations...</div>
                                        </div>
                                    ) : (postComments[post.id] || []).length > 0 ? (
                                        <>
                                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '-5px' }}>Conversation Thread</div>
                                            {(postComments[post.id] || []).map(c => {
                                                const cUser = c.userName || c.user_name || c.name || 'User';
                                                const cText = c.content || c.text || c.comment || c.message || '...';
                                                const commentAuthorId = c.userId || c.user_id;
                                                const isMyComment = (authorId && commentAuthorId && String(authorId) === String(commentAuthorId)) || (user?.name === cUser);

                                                return (
                                                    <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#315A9E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '1000', flexShrink: 0, boxShadow: '0 4px 10px rgba(49, 90, 158, 0.2)' }}>
                                                            {cUser.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div style={{ flex: 1, padding: '15px', background: 'white', borderRadius: '20px', border: '1.5px solid #f1f5f9', position: 'relative' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '12px', fontWeight: '1000', color: '#0B1E3F' }}>{cUser}</span>
                                                                {isMyComment && (
                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                        <button onClick={() => { setEditingCommentId(c.id); setEditCommentContent(cText); }} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}><Edit3 size={13} /></button>
                                                                        <button onClick={async () => {
                                                                            const success = await deleteComment(post.id, c.id);
                                                                            if (success) {
                                                                                const comments = await fetchComments(post.id);
                                                                                setPostComments(prev => ({ ...prev, [post.id]: comments }));
                                                                            }
                                                                        }} style={{ border: 'none', background: 'none', color: '#fda4af', cursor: 'pointer', padding: '2px' }}><Trash2 size={13} /></button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {editingCommentId === c.id ? (
                                                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    <textarea
                                                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #315A9E', fontSize: '13px', outline: 'none', minHeight: '60px', background: '#f8fafc' }}
                                                                        value={editCommentContent}
                                                                        onChange={e => setEditCommentContent(e.target.value)}
                                                                        autoFocus
                                                                    />
                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                        <button onClick={async () => {
                                                                            const success = await updateComment(post.id, c.id, editCommentContent);
                                                                            if (success) {
                                                                                const comments = await fetchComments(post.id);
                                                                                setPostComments(prev => ({ ...prev, [post.id]: comments }));
                                                                                setEditingCommentId(null);
                                                                            }
                                                                        }} style={{ fontSize: '11px', fontWeight: '900', color: 'white', background: '#315A9E', border: 'none', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer' }}>UPDATE</button>
                                                                        <button onClick={() => setEditingCommentId(null)} style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', background: 'none', border: '1.5px solid #e2e8f0', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer' }}>CANCEL</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600', lineHeight: '1.5' }}>{cText}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8', fontSize: '12px', fontWeight: '800', border: '1.5px dashed #eef2f6', borderRadius: '20px' }}>
                                            No comments yet. Start the conversation!
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* ERROR NOTIFICATION POPUP */}
            <AnimatePresence>
                {errorNotif && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 30 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 99999,
                            backgroundColor: 'white',
                            borderRadius: '24px',
                            padding: '28px 36px',
                            boxShadow: '0 20px 60px rgba(239,68,68,0.2), 0 4px 20px rgba(0,0,0,0.12)',
                            border: '1.5px solid #fecaca',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            maxWidth: '340px',
                            width: '90%',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '22px' }}>⚠️</span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F' }}>Connection Error</div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', lineHeight: '1.5' }}>{errorNotif.message}</div>
                        <button
                            onClick={() => setErrorNotif(null)}
                            style={{ marginTop: '4px', padding: '8px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                        >
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {flyingEmoji && (
                    <motion.div initial={{ left: flyingEmoji.x, top: flyingEmoji.y, opacity: 0 }} animate={{ y: [0, -100, -200], x: [0, 50, -50], opacity: [0, 1, 0], scale: [1, 2, 1] }} transition={{ duration: 2 }} style={{ position: 'fixed', fontSize: '50px', zIndex: 999 }}>{flyingEmoji.emoji}</motion.div>
                )}

                {reactorModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.modalOverlay}
                        onClick={() => setReactorModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={styles.modalContent}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '18px', fontWeight: '1000', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '24px' }}>{reactorModal.emoji}</span>
                                    <span style={{ background: '#f0f9ff', color: '#315A9E', borderRadius: '8px', padding: '2px 10px', fontSize: '14px' }}>
                                        {reactorModal.users.length > 0 ? reactorModal.users.length : reactorModal.count}
                                    </span>
                                </div>
                                <X size={24} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setReactorModal(null)} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                                {loadingReactors ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '15px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                                <div style={{ height: '14px', width: '120px', backgroundColor: '#e2e8f0', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                            </div>
                                        ))}
                                    </div>
                                ) : reactorModal.users && reactorModal.users.length > 0 ? reactorModal.users.map((reactor, idx) => {
                                    const name = typeof reactor === 'string' ? reactor
                                        : (reactor?.name || reactor?.userName || reactor?.user_name
                                            || reactor?.username || reactor?.fullName || reactor?.full_name
                                            || reactor?.displayName || reactor?.display_name
                                            || reactor?.emp_name || reactor?.employee_name || 'Unknown');
                                    const role = typeof reactor === 'object'
                                        ? (reactor?.role || reactor?.designation || reactor?.userRole || '') : '';
                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '15px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#315A9E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', flexShrink: 0 }}>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0B1E3F' }}>{name}</div>
                                                {role && <div style={{ fontSize: '11px', color: '#315A9E', fontWeight: '700', textTransform: 'uppercase' }}>{role}</div>}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8', fontSize: '13px' }}>
                                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{reactorModal.emoji}</div>
                                        <div style={{ fontWeight: '700', color: '#64748b' }}>{reactorModal.count} {reactorModal.count === 1 ? 'person' : 'people'} reacted</div>
                                        <div style={{ marginTop: '4px', fontSize: '12px' }}>Detailed list not available from server</div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {fullscreenMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setFullscreenMedia(null)}
                        style={{
                            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
                            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'zoom-out', padding: '20px'
                        }}
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setFullscreenMedia(null)}
                            style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </motion.button>

                        <motion.img
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={fullscreenMedia.src}
                            alt="Fullscreen"
                            style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '12px', boxShadow: '0 30px 100px rgba(0,0,0,0.5)', objectFit: 'contain' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}