import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Star, Medal, ArrowLeft, Trophy, Calendar, Users, Zap, X, ChevronRight } from 'lucide-react';
import { BASE_URL, API_ENDPOINTS } from '../config';
import { useAuth } from '../context/AuthContext';

const AwardsScreen = ({ onBack }) => {
    const { user } = useAuth();
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
    const [rewardData, setRewardData] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [grantLoading, setGrantLoading] = useState(false);
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [showJsonInspector, setShowJsonInspector] = useState(false);
    
    // Grant options fetched from backend (replaces the old hardcoded GRANT_OPTIONS)
    const [grantOptions, setGrantOptions] = useState({ TL: [], PM: [], HR: [] });
    const [grantOptionsLoading, setGrantOptionsLoading] = useState(false);
    
    // Modal State for Public Profile
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberRewards, setMemberRewards] = useState([]);
    const [memberPoints, setMemberPoints] = useState(0);
    const [memberLoading, setMemberLoading] = useState(false);
    
    // Form State for Granting Rewards
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedRewardId, setSelectedRewardId] = useState('');
    const [activeCategory, setActiveCategory] = useState('TL');
    const [showGrantModal, setShowGrantModal] = useState(false);

    // Default fallback grant options (used only if backend is unreachable)
    const FALLBACK_GRANT_OPTIONS = {
        TL: [
            { id: 'TL_1', title: 'Visionary Lead', rep: 250, icon: <Zap size={18} /> },
            { id: 'TL_2', title: 'Impact Award', rep: 200, icon: <Award size={18} /> }
        ],
        PM: [
            { id: 'PM_1', title: 'Goal Achiever', rep: 300, icon: <Star size={18} /> },
            { id: 'PM_2', title: 'Sprint Master', rep: 150, icon: <Zap size={18} /> }
        ],
        HR: [
            { id: 'HR_1', title: 'Cultural Pillar', rep: 500, icon: <Medal size={18} /> },
            { id: 'HR_2', title: 'Peer Mentor', rep: 100, icon: <Users size={18} /> }
        ]
    };

    const activeGrantOptions = (grantOptions[activeCategory] && grantOptions[activeCategory].length > 0)
        ? grantOptions[activeCategory]
        : (FALLBACK_GRANT_OPTIONS[activeCategory] || []);

    const canGrant = ['Admin', 'HR', 'PM', 'Manager', 'TL', 'CEO', 'Super Admin', 'SuperAdmin'].includes(user?.role || '');

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [quizHistory, setQuizHistory] = useState([]);

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const rawId = String(user?.id || user?.employee_id || user?.userId || user?.empId || user?.email || '');
                const safeUid = decodeURIComponent(rawId).replace(/:1$/, '').split(':')[0];
                if (!safeUid) return;

                const token = localStorage.getItem('token');
                const headers = { 'Accept': 'application/json' };
                if (token && !token.startsWith('joinee-')) headers['Authorization'] = `Bearer ${token}`;

                const [myRes, userRes, allRes, dailyLeadRes, genLeadRes, empRes] = await Promise.all([
                    fetch(`${API_ENDPOINTS.REWARDS_MY}?userId=${safeUid}`, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_USER(safeUid), { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_ALL, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/leaderboard/daily`, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/fun-quizzes/leaderboard`, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.EMPLOYEES || API_ENDPOINTS.USERS, { headers }).catch(() => null)
                ]);

                let combinedHistory = [];
                let serverTotal = 0;

                if (myRes && myRes.ok) {
                    const data = await myRes.json();
                    const list = Array.isArray(data) ? data : (data.history || data.awards || data.data || []);
                    combinedHistory = [...combinedHistory, ...list];
                    serverTotal = Math.max(serverTotal, data.totalPoints || data.total_points || 0);
                }
                
                if (userRes && userRes.ok) {
                    const data = await userRes.json();
                    const list = Array.isArray(data) ? data : (data.history || data.awards || data.data || []);
                    combinedHistory = [...combinedHistory, ...list];
                    serverTotal = Math.max(serverTotal, data.totalPoints || data.total_points || 0);
                }

                if (allRes && allRes.ok) {
                    const allData = await allRes.json();
                    const list = Array.isArray(allData) ? allData : (allData.data || allData.rewards || []);
                    const myItems = list.filter(r => {
                        const rId = String(r.userId || r.user_id || r.employee_id || r.empId || '').toLowerCase();
                        return rId === safeUid.toLowerCase() || 
                               rId === rawId.toLowerCase() || 
                               rId.split(':')[0] === safeUid.toLowerCase() ||
                               (user?.email && rId === user.email.toLowerCase());
                    });
                    combinedHistory = [...combinedHistory, ...myItems];
                }

                // Deduplicate by ID or timestamp+title
                const uniqueItems = [];
                const seenKeys = new Set();
                combinedHistory.forEach(item => {
                    const key = item.id || `${item.created_at}_${item.reward_name || item.title}_${item.points}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        uniqueItems.push(item);
                    }
                });

                setRewardData({
                    history: uniqueItems,
                    totalPoints: serverTotal
                });
                
                // Merge Daily and General leaderboards for accurate all-time rankings
                const dailyData = dailyLeadRes && dailyLeadRes.ok ? await dailyLeadRes.json() : [];
                const genData = genLeadRes && genLeadRes.ok ? await genLeadRes.json() : [];
                const combinedLeaderboard = [
                    ...(Array.isArray(dailyData) ? dailyData : (dailyData?.data || [])),
                    ...(Array.isArray(genData) ? genData : (genData?.data || []))
                ];
                setLeaderboard(combinedLeaderboard);

                if (empRes && empRes.ok) {
                    const el = await empRes.json();
                    setEmployees(Array.isArray(el) ? el : (el.data || []));
                }

                
            } catch (err) {
                // Fetch failed silently — awards data shows empty state
            } finally {
                setLoading(false);
            }
        };
        fetchRewards();
    }, [user]);


    const getRankSuffix = (rank) => {
        if (!rank || rank === 'N/A' || rank === 0) return '';
        const j = rank % 10, k = rank % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    };

    // 1. Unified History & Point Calculation with Strict Deduplication
    // We first deduplicate the Quiz history to ensure only the highest score per day is counted
    const dailyQuizMap = {};
    quizHistory.forEach(q => {
        const dateKey = formatDate(q.created_at);
        if (!dailyQuizMap[dateKey] || (q.points || 0) > dailyQuizMap[dateKey].points) {
            dailyQuizMap[dateKey] = q;
        }
    });
    const dedupedQuizHistory = Object.values(dailyQuizMap);

    const rawServerHistory = Array.isArray(rewardData) ? rewardData : (rewardData?.history || rewardData?.awards || rewardData?.data || rewardData?.rewards || []);
    const serverTotalPoints = Number(rewardData?.totalPoints || rewardData?.total_points || (Array.isArray(rewardData) ? 0 : rewardData?.points) || 0);
    
    // 2. Combine with server history, avoiding overlapping quiz entries
    const uniqueHistory = [...dedupedQuizHistory];
    rawServerHistory.forEach(item => {
        const isQuiz = String(item.reward_name || item.rewardName || item.title || '').toUpperCase().includes('QUIZ');
        const dateKey = formatDate(item.created_at || item.date);
        
        const alreadyHasQuizForThisDay = isQuiz && dedupedQuizHistory.some(q => formatDate(q.created_at) === dateKey);
        
        if (!alreadyHasQuizForThisDay) {
            uniqueHistory.push(item);
        }
    });

    // 3. Final Point Calculation — Fully Dynamic & Accurate
    // Source 1: Sum of all unique history items (including Saturday grants)
    const totalPointsFromHistory = uniqueHistory.reduce((sum, item) => sum + Number(item.points || item.rep || 0), 0);

    // Source 2: Build leaderboard from all participants to find global rank
    const liveMap = new Map();
    leaderboard.forEach(s => {
        const targetId = s.employee_id || s.user_id || s.id;
        let name = s.employee_name || s.name;
        if (!name && String(targetId) === String(user?.id || user?.employee_id || '').split(':')[0]) {
            name = user?.name || user?.employee_name || 'You';
        } else if (!name) {
            name = `Employee ${targetId}`;
        }
        const score = Number(s.total_score || s.points || s.quiz_score || s.score || 0);
        if (score > 0) {
            liveMap.set(name, Math.max(liveMap.get(name) || 0, score));
        }
    });

    const sortedLeaderboard = Array.from(liveMap, ([name, score]) => ({ name, score }))
        .filter(u => {
            const n = String(u.name || '').toUpperCase();
            return !n.includes('DINESH') && !n.includes('HR') && !n.includes('ADMIN');
        })
        .sort((a, b) => b.score - a.score);

    // Determine this user's rank and best score from leaderboard
    const userName = user?.name || user?.employee_name || '';
    const userEntryIndex = sortedLeaderboard.findIndex(e => e.name === userName || e.name === 'You');
    const userRank = userEntryIndex >= 0 ? userEntryIndex + 1 : 0;
    const leaderboardScore = userEntryIndex >= 0 ? sortedLeaderboard[userEntryIndex].score : 0;
    
    // Final total: Highest of history sum or backend-reported total
    const finalTotalPoints = Math.max(totalPointsFromHistory, serverTotalPoints, leaderboardScore);

    const stats = {
        rank: userRank || 1,
        points: finalTotalPoints,
        endorsements: Math.floor(finalTotalPoints / 100),
        score: 'Active'
    };

    const openMemberProfile = async (member) => {
        if (!member) return;
        setSelectedMember(member);
        setMemberLoading(true);
        try {
            const memberId = member.id || member.userId || member.user_id || member.employee_id;
            if (!memberId) {
                setMemberRewards([]);
                setMemberPoints(0);
                return;
            }
            const token = localStorage.getItem('token');
            const res = await fetch(API_ENDPOINTS.REWARDS_USER(memberId), {
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => null);
            if (res && res.ok) {
                const data = await res.json();
                setMemberRewards(data.history || []);
                setMemberPoints(data.totalPoints || 0);
            } else {
                setMemberRewards([]);
                setMemberPoints(0);
            }
        } catch (err) {
            console.error('[Awards] Member profile load error:', err);
            setMemberRewards([]);
            setMemberPoints(0);
        } finally { setMemberLoading(false); }
    };

    const handleGrant = async () => {
        if (!selectedEmployee || !selectedRewardId) return alert('Please select an employee and a reward category.');
        
        setGrantLoading(true);
        try {
            // Find selected reward from dynamically loaded options
            const rewardObj = activeGrantOptions.find(o => o.id === selectedRewardId)
                          || FALLBACK_GRANT_OPTIONS[activeCategory]?.find(o => o.id === selectedRewardId);
            if (!rewardObj) return alert('Invalid reward selection.');

            const token = localStorage.getItem('token');
            const res = await fetch(API_ENDPOINTS.REWARDS_GRANT, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token && !token.startsWith('joinee-') ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    userId: selectedEmployee,
                    employee_id: selectedEmployee,
                    reward_name: rewardObj.title,
                    points: rewardObj.rep,
                    category: activeCategory,
                    granted_by: user.id || user.empId || user.employee_id
                })
            });

            if (res.ok) {
                alert('Success: Recognition granted!');
                setSelectedEmployee('');
                setSelectedRewardId('');
                setShowGrantModal(false);
                window.location.reload(); 
            } else {
                const err = await res.json();
                alert(`Error: ${err.message || 'Failed to sync data.'}`);
            }
        } catch (e) {
            alert('Connection Error');
        } finally {
            setGrantLoading(false);
        }
    };

    const openGrantModal = (category) => {
        setActiveCategory(category || 'TL');
        setShowGrantModal(true);
    };


    const history = uniqueHistory;
    
    // Exclusive Categorization Logic: Prioritizes the Granter's Role first.
    const getEffectiveCategory = (r) => {
        // 1. Granter Role Match (HIGHEST PRIORITY based on user request)
        const granterId = String(r.granted_by || r.grantedBy || '').split(':')[0];
        const granter = employees.find(e => String(e.id || e.employee_id || e.userId || '').split(':')[0] === granterId);
        const gRole = String(granter?.role || granter?.designation || '').toUpperCase();
        
        if (gRole.includes('TL') || gRole.includes('TEAM LEADER') || gRole.includes('MANAGER') && !gRole.includes('PROJECT')) return 'TL';
        if (gRole.includes('PM') || gRole.includes('PROJECT MANAGER')) return 'PM';
        if (gRole.includes('HR') || gRole.includes('ADMIN') || gRole.includes('CEO') || gRole.includes('SUPER')) return 'HR';

        // 2. Strict Database Category Match (If granter role is unknown)
        const rCat = String(r.category || r.reward_category || '').toUpperCase();
        if (rCat === 'TL' || rCat.includes('TL') || rCat.includes('PERFORMANCE') || rCat.includes('LEADERSHIP') || rCat.includes('TEAM')) return 'TL';
        if (rCat === 'PM' || rCat.includes('PM') || rCat.includes('PROJECT') || rCat.includes('SPRINT')) return 'PM';
        if (rCat === 'HR' || rCat.includes('HR') || rCat.includes('CULTURAL') || rCat.includes('PEER') || rCat.includes('ADMIN') || rCat.includes('CEO') || rCat.includes('MANAGEMENT') || rCat.includes('SUPER') || rCat.includes('QUIZ')) return 'HR';

        // 3. Semantic Title Match (If category is generic like "Other")
        const name = String(r.reward_name || r.rewardName || r.title || r.reward || '').toUpperCase();
        if (name.includes('VISIONARY') || name.includes('LEAD') || name.includes('IMPACT')) return 'TL';
        if (name.includes('GOAL') || name.includes('ACHIEVER') || name.includes('SPRINT') || name.includes('MASTER') || name.includes('PROJECT')) return 'PM';
        if (name.includes('QUIZ') || name.includes('BRAIN') || name.includes('PILLAR') || name.includes('MENTOR') || name.includes('REFLECTION') || name.includes('SATURDAY')) return 'HR';

        return 'HR'; // Ultimate Default Fallback
    };

    const filterByCategory = (cat) => {
        if (!Array.isArray(history)) return [];
        return history.filter(r => getEffectiveCategory(r) === cat.toUpperCase());
    };

    const tlList = filterByCategory('TL');
    const pmList = filterByCategory('PM');
    const hrList = filterByCategory('HR').sort((a, b) => {
        const isAQuiz = String(a.reward_name || '').toUpperCase().includes('QUIZ');
        const isBQuiz = String(b.reward_name || '').toUpperCase().includes('QUIZ');
        if (isAQuiz && !isBQuiz) return -1;
        if (!isAQuiz && isBQuiz) return 1;
        return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
    });
    const allActivity = Array.isArray(history) ? history : [...tlList, ...pmList, ...hrList];


    const RewardCard = ({ item, color, bg }) => {
        const isQuiz = String(item.reward_name || '').toUpperCase().includes('QUIZ');
        const isGoal = String(item.reward_name || '').toUpperCase().includes('GOAL');
        
        // Define theme colors based on image 2
        const theme = isQuiz 
            ? { bg: '#FFFBEB', border: '#FEF3C7', text: '#D97706', date: '#94A3B8' } 
            : (isGoal ? { bg: '#F0FDF4', border: '#DCFCE7', text: '#15803D', date: '#94A3B8' } : { bg: bg, border: color + '15', text: color, date: '#94A3B8' });

        return (
            <motion.div 
                whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}
                style={{ 
                    padding: '20px', 
                    backgroundColor: theme.bg, 
                    borderRadius: '24px', 
                    border: `1px solid ${theme.border}`, 
                    cursor: 'pointer',
                    position: 'relative',
                    marginBottom: '10px'
                }}
            >
                <div style={{ position: 'absolute', top: '15px', right: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: theme.date }}>{formatDate(item.created_at || item.date)}</span>
                    {isQuiz && <Zap size={12} color="#D97706" fill="#D97706" />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: isQuiz ? '15px' : '0' }}>
                    <div style={{ fontSize: '14px', fontWeight: '1000', color: '#0B1E3F' }}>
                        {item.reward_name || item.rewardName || item.title || 'Reward'}
                    </div>
                    <div style={{ fontSize: isQuiz ? '14px' : '12px', fontWeight: '1000', color: theme.text }}>
                        +{item.points || item.rep} REP POINTS
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ padding: winWidth < 768 ? '15px' : '40px', width: '100%', boxSizing: 'border-box', backgroundColor: '#F8F9FA', minHeight: '100vh', position: 'relative' }}
        >
            {/* Header section... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={onBack} style={{ backgroundColor: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <ArrowLeft size={18} color="#0B1E3F" />
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '1000', color: '#0B1E3F' }}>Awards & recognition</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: '800' }}>Excellence recognized at Nbt hub</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowJsonInspector(!showJsonInspector)} style={{ backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>
                        {showJsonInspector ? 'Hide data' : 'Data dashboard'}
                    </button>
                    {canGrant && <button style={{ backgroundColor: '#FBBC05', color: '#0B1E3F', border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '1000', cursor: 'pointer' }}>All team scores</button>}
                </div>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: winWidth < 768 ? '1fr 1fr' : 'repeat(4, 1fr)', 
                gap: winWidth < 768 ? '10px' : '15px', 
                marginBottom: '30px', 
                backgroundColor: '#0B1E3F', 
                padding: winWidth < 768 ? '20px 15px' : '25px', 
                borderRadius: '32px', 
                color: 'white',
                boxShadow: '0 15px 40px rgba(11,30,63,0.15)'
            }}>
                <div style={{ borderRight: winWidth < 1024 ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trophy size={16} color="#FBBC05" />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Global ranking</div>
                        <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px', whiteSpace: 'nowrap' }}>{stats.rank}{getRankSuffix(stats.rank)} Position</div>
                    </div>
                </div>
                
                <div style={{ borderRight: winWidth < 1024 ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '5px', textAlign: winWidth < 768 ? 'left' : 'center' }}>
                    <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Rep points</div>
                    <div style={{ fontSize: winWidth < 768 ? '18px' : '20px', fontWeight: '1000', marginTop: '2px', color: '#FBBC05' }}>{stats.points}</div>
                </div>

                <div style={{ borderRight: winWidth < 1024 ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '5px', textAlign: winWidth < 768 ? 'left' : 'center' }}>
                    <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endorsements</div>
                    <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px' }}>{stats.endorsements} Total</div>
                </div>

                <div style={{ padding: '5px', textAlign: winWidth < 768 ? 'left' : 'right' }}>
                    <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leadership score</div>
                    <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px', color: '#FBBC05', display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'flex-start' : 'flex-end', gap: '6px' }}>
                        {stats.score} <Star size={14} fill="#FBBC05" color="#FBBC05" />
                    </div>
                </div>
            </div>

            {/* MAIN COLUMNS */}
            <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1024 ? '1fr' : '1fr 1fr 1fr', gap: '25px', marginBottom: '40px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '24px', border: '1px solid #fdf4ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Award size={20} color="#701a75" />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '1000', color: '#701a75' }}>TL Recognition</h3>
                        </div>
                        {canGrant && (
                            <button onClick={() => openGrantModal('TL')} style={{ backgroundColor: '#FBBC05', color: '#0B1E3F', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '1000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Zap size={14} fill="#0B1E3F" /> Reward
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {tlList.map((item, idx) => <RewardCard key={idx} item={item} color="#701a75" bg="#fdf4ff" />)}
                        {tlList.length === 0 && <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>No TL rewards.</div>}
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '24px', border: '1px solid #f0f9ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Star size={20} color="#0369a1" />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '1000', color: '#0369a1' }}>PM Recognition</h3>
                        </div>
                        {canGrant && (
                            <button onClick={() => openGrantModal('PM')} style={{ backgroundColor: '#FBBC05', color: '#0B1E3F', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '1000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Zap size={14} fill="#0B1E3F" /> Reward
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pmList.map((item, idx) => <RewardCard key={idx} item={item} color="#0369a1" bg="#f0f9ff" />)}
                        {pmList.length === 0 && <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>No PM rewards.</div>}
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '28px', padding: '24px', border: '1px solid #f0fdf4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Medal size={20} color="#14532d" />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '1000', color: '#14532D' }}>HR Recognition</h3>
                        </div>
                        {canGrant && (
                            <button onClick={() => openGrantModal('HR')} style={{ backgroundColor: '#FBBC05', color: '#0B1E3F', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '1000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Zap size={14} fill="#0B1E3F" /> Reward
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {hrList.map((item, idx) => <RewardCard key={idx} item={item} color="#14532d" bg="#f0fdf4" />)}
                        {hrList.length === 0 && <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>No HR rewards.</div>}
                    </div>
                </div>
            </div>
            {/* JSON Diagnostic Panel */}
            {showJsonInspector && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginTop: '40px', backgroundColor: '#0B1E3F', borderRadius: '28px', padding: '30px', color: '#4d7ab1', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                        <h4 style={{ margin: 0, color: 'white' }}>System sync diagnostic (Real-time backend data)</h4>
                        <span style={{ fontSize: '11px', fontWeight: '800' }}>{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#88a6d4', fontWeight: '1000', marginBottom: '10px' }}>User summary pocket</div>
                            <pre style={{ margin: 0, fontSize: '11px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '15px', overflowX: 'auto' }}>
                                {JSON.stringify(rewardData?.summary || {}, null, 2)}
                            </pre>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#88a6d4', fontWeight: '1000', marginBottom: '10px' }}>Raw recent awards (Latest 3)</div>
                            <pre style={{ margin: 0, fontSize: '11px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '15px', overflowX: 'auto' }}>
                                {JSON.stringify(allActivity.slice(0, 3) || [], null, 2)}
                            </pre>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Modals... */}
            <AnimatePresence>
                {showGrantModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'white', borderRadius: '35px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                            <div style={{ padding: '30px', background: '#0B1E3F', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Zap size={20} color="#FBBC05" fill="#FBBC05" />
                                    <h3 style={{ margin: 0, fontSize: '16px' }}>Grant {activeCategory} reward</h3>
                                </div>
                                <button onClick={() => setShowGrantModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={18} color="white" />
                                </button>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                   <div>
                                       <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>1. Select teammate</label>
                                       <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1.5px solid #f1f5f9', fontWeight: '600', outline: 'none', backgroundColor: '#fcfcfd' }}>
                                           <option value="">Choose employee...</option>
                                           {employees.map(e => <option key={e.id} value={e.id}>{e.name || e.username}</option>)}
                                       </select>
                                   </div>
                                   <div>
                                       <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', display: 'block', marginBottom: '12px' }}>2. Select {activeCategory} recognition type</label>
                                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                           {activeGrantOptions.map(opt => (
                                               <button key={opt.id} onClick={() => setSelectedRewardId(opt.id)} style={{ padding: '20px 10px', borderRadius: '20px', border: '2px solid', borderColor: selectedRewardId === opt.id ? '#0B1E3F' : '#f8fafc', backgroundColor: selectedRewardId === opt.id ? '#f0f9ff' : 'white', cursor: 'pointer', textAlign: 'center', transition: '0.2s' }}>
                                                   <div style={{ color: '#0B1E3F', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{opt.icon}</div>
                                                   <div style={{ fontSize: '12px', fontWeight: '1000', color: '#0B1E3F' }}>{opt.title}</div>
                                                   <div style={{ fontSize: '10px', fontWeight: '900', color: '#22c55e', marginTop: '4px' }}>+{opt.rep} REP</div>
                                               </button>
                                           ))}
                                       </div>
                                   </div>
                                   <button disabled={grantLoading} onClick={handleGrant} style={{ width: '100%', padding: '18px', borderRadius: '20px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '1000', cursor: 'pointer', marginTop: '10px', boxShadow: '0 10px 20px rgba(11,30,63,0.1)', opacity: grantLoading ? 0.7 : 1 }}>
                                       {grantLoading ? 'Processing...' : 'Confirm recognition'}
                                   </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {selectedMember && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'white', borderRadius: '35px', width: '100%', maxWidth: '500px', overflow: 'hidden' }}>
                            <div style={{ padding: '40px', background: '#0B1E3F', color: 'white', textAlign: 'center' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '25px', border: '4px solid rgba(255,255,255,0.1)', margin: '0 auto 15px', overflow: 'hidden' }}>
                                    <img src={`https://ui-avatars.com/api/?name=${selectedMember.name}&background=fff&color=0B1E3F&size=128`} style={{ width: '100%', height: '100%' }} />
                                </div>
                                <h2 style={{ margin: 0 }}>{selectedMember.name}</h2>
                                <p style={{ margin: '5px 0 0', opacity: 0.7, fontSize: '13px' }}>Global Rank: #{leaderboard.findIndex(e => String(e.id || e.userId || '').split(':')[0] === String(selectedMember.id || '').split(':')[0]) + 1 || 'N/A'}</p>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <h4 style={{ fontSize: '14px', color: '#0B1E3F', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px' }}>Achievement Timeline</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                                    {memberLoading ? <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div> : 
                                      memberRewards.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '15px' }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: '800' }}>{r.reward_name || r.title}</div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{formatDate(r.created_at || r.date)}</div>
                                            </div>
                                            <div style={{ fontWeight: '1000', color: '#22c55e' }}>+{r.points || r.rep} REP</div>
                                        </div>
                                      ))
                                    }
                                    {!memberLoading && memberRewards.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No history found.</div>}
                                </div>
                                <button onClick={() => setSelectedMember(null)} style={{ width: '100%', marginTop: '20px', padding: '15px', borderRadius: '15px', border: 'none', backgroundColor: '#f1f5f9', color: '#0B1E3F', fontWeight: '1000', cursor: 'pointer' }}>Close Profile</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div style={{ marginTop: '50px', textAlign: 'center', color: '#94a3b8', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>
                NBT HUB • RECOGNITION DATABASE v2.5 • SECURE SYNC
            </div>
        </motion.div>
    );
};

export default AwardsScreen;
