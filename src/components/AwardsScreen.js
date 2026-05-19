import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Star, Medal, ArrowLeft, Trophy, Calendar, Users, Zap, X, ChevronRight } from 'lucide-react';
import { BASE_URL, API_ENDPOINTS } from '../config';
import { useAuth } from '../context/AuthContext';

const LeaderboardAvatar = ({ entry, employees, isMe }) => {
    const [imgFailed, setImgFailed] = useState(false);
    
    const cleanId = String(entry.id || '').split(':')[0].trim().toLowerCase();
    const cleanName = String(entry.name || '').trim().toLowerCase();
    const emp = employees.find(e => {
        const checkId = String(e.employee_id || e.id || '').split(':')[0].trim().toLowerCase();
        const checkEmail = String(e.email || '').trim().toLowerCase();
        const checkName = String(e.name || e.emp_name || '').trim().toLowerCase();
        return (checkId && checkId === cleanId) || 
               (checkEmail && cleanId && checkEmail === cleanId) ||
               (checkName && checkName === cleanName);
    });
    
    const path = emp ? (emp.profileImage || emp.profile_image || emp.avatar || emp.profilePicture || emp.profile_picture || emp.profile_pic) : null;
    
    let imgSrc = null;
    if (path && typeof path === 'string') {
        imgSrc = (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) ? path : `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
    }

    if (imgSrc && !imgFailed) {
        return (
            <img 
                src={imgSrc} 
                alt={entry.name}
                onError={() => setImgFailed(true)}
                style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    objectFit: 'cover', 
                    marginRight: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
            />
        );
    }

    return (
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: isMe ? '#0284C7' : '#E2E8F0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '1000', marginRight: '15px' }}>
            {entry.name ? entry.name.charAt(0).toUpperCase() : '?'}
        </div>
    );
};

const AwardsScreen = ({ onBack }) => {
    const { user } = useAuth();
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
    const [rewardData, setRewardData] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [grantLoading, setGrantLoading] = useState(false);
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

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
                const rawId = String(user?.employee_id || user?.uid || user?.id || user?.userId || user?.empId || user?.email || '');
                const safeUid = decodeURIComponent(rawId).replace(/:1$/, '').split(':')[0];
                if (!safeUid) return;

                const token = localStorage.getItem('token');
                const headers = { 'Accept': 'application/json' };
                if (token && !token.startsWith('joinee-')) headers['Authorization'] = `Bearer ${token}`;

                const [myRes, userRes, allRes, dailyLeadRes, genLeadRes, empRes, rewardsLeadRes, quizHistRes, quizCompletionsRes, quizLeadRes, quizAttemptsRes, quizMyAttemptsRes] = await Promise.all([
                    fetch(`${API_ENDPOINTS.REWARDS_MY}?userId=${safeUid}`, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_USER(safeUid), { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_ALL, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/leaderboard/daily`, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/fun-quizzes/leaderboard`, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.USERS, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_LEADERBOARD, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/history?userId=${safeUid}`, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/my-completions`, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/leaderboard`, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/attempts?userId=${safeUid}`, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/my-attempts`, { headers }).catch(() => null)
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

                // Merge Daily, General, and Global Rewards leaderboards for accurate all-time rankings
                const dailyData = dailyLeadRes && dailyLeadRes.ok ? await dailyLeadRes.json() : [];
                const genData = genLeadRes && genLeadRes.ok ? await genLeadRes.json() : [];
                const rewardsData = rewardsLeadRes && rewardsLeadRes.ok ? await rewardsLeadRes.json() : [];
                const quizListData = quizLeadRes && quizLeadRes.ok ? await quizLeadRes.json() : [];

                const mergedMap = new Map();
                const getOrInitUser = (id, name) => {
                    const cleanId = String(id).split(':')[0].trim();
                    if (!mergedMap.has(cleanId)) {
                        mergedMap.set(cleanId, {
                            id: cleanId,
                            name: name || `Employee ${cleanId}`,
                            quizPoints: 0,
                            rewardPoints: 0
                        });
                    }
                    const entry = mergedMap.get(cleanId);
                    if (name && (!entry.name || entry.name.startsWith('Employee '))) {
                        entry.name = name;
                    }
                    return entry;
                };

                // 1. Process Quiz Leaderboard (All time)
                const qList = Array.isArray(quizListData) ? quizListData : (quizListData?.data || []);
                qList.forEach(item => {
                    const id = item.employee_id || item.user_id || item.id || item.userId;
                    if (!id) return;
                    const entry = getOrInitUser(id, item.employee_name || item.name || item.userName);
                    const pts = Number(item.total_score || item.quiz_score || item.total_quiz_points || item.points || item.score || 0);
                    entry.quizPoints = Math.max(entry.quizPoints, pts);
                });

                // 2. Process Daily Quiz Leaderboard
                const dailyList = Array.isArray(dailyData) ? dailyData : (dailyData?.data || []);
                dailyList.forEach(item => {
                    const id = item.employee_id || item.user_id || item.id || item.userId;
                    if (!id) return;
                    const entry = getOrInitUser(id, item.employee_name || item.name || item.userName);
                    const pts = Number(item.total_score || item.quiz_score || item.total_quiz_points || item.points || item.score || 0);
                    entry.quizPoints = Math.max(entry.quizPoints, pts);
                });

                // 3. Process General Fun Leaderboard
                const genList = Array.isArray(genData) ? genData : (genData?.data || []);
                genList.forEach(item => {
                    const id = item.employee_id || item.user_id || item.id || item.userId;
                    if (!id) return;
                    const entry = getOrInitUser(id, item.employee_name || item.name || item.userName);
                    const pts = Number(item.total_score || item.quiz_score || item.total_quiz_points || item.points || item.score || 0);
                    entry.quizPoints = Math.max(entry.quizPoints, pts);
                });

                // 4. Process Rewards Leaderboard (All time)
                const rList = Array.isArray(rewardsData) ? rewardsData : (rewardsData?.data || []);
                rList.forEach(item => {
                    const id = item.employee_id || item.user_id || item.id || item.userId;
                    if (!id) return;
                    const entry = getOrInitUser(id, item.employee_name || item.name || item.userName);
                    const pts = Number(item.points || item.total_points || item.reward_points || item.score || 0);
                    entry.rewardPoints = Math.max(entry.rewardPoints, pts);
                });

                const finalLeaderboard = Array.from(mergedMap.values()).map(u => ({
                    id: u.id,
                    name: u.name,
                    score: u.quizPoints + u.rewardPoints,
                    quiz_points: u.quizPoints,
                    reward_points: u.rewardPoints
                }));

                setLeaderboard(finalLeaderboard);

                if (empRes && empRes.ok) {
                    const el = await empRes.json();
                    setEmployees(Array.isArray(el) ? el : (el.data || []));
                }

                // Calculate the user's quiz points from the consolidated leaderboard
                const myLeaderboardEntry = finalLeaderboard.find(e => {
                    const cleanEId = String(e.id || '').split(':')[0].trim().toLowerCase();
                    const cleanEName = String(e.name || '').split(':')[0].trim().toLowerCase();
                    const possibleUserKeys = [
                        safeUid,
                        user?.employee_id,
                        user?.uid,
                        user?.id,
                        user?.userId,
                        user?.email,
                        user?.name,
                        user?.employee_name
                    ];
                    return possibleUserKeys.some(key => {
                        const cleanKey = String(key || '').split(':')[0].trim().toLowerCase();
                        return cleanKey && (cleanEId === cleanKey || cleanEName === cleanKey);
                    });
                });
                const trueQuizPoints = myLeaderboardEntry ? (myLeaderboardEntry.quiz_points || 0) : 0;

                let qHistList = [];
                const parseAndAdd = (resData) => {
                    if (!resData) return;
                    const parsed = Array.isArray(resData) ? resData : (resData.data || resData.history || resData.attempts || resData.completions || []);
                    qHistList = [...qHistList, ...parsed];
                };

                if (quizHistRes && quizHistRes.ok) {
                    try { parseAndAdd(await quizHistRes.json()); } catch(e){}
                }
                if (quizCompletionsRes && quizCompletionsRes.ok) {
                    try { parseAndAdd(await quizCompletionsRes.json()); } catch(e){}
                }
                if (quizAttemptsRes && quizAttemptsRes.ok) {
                    try { parseAndAdd(await quizAttemptsRes.json()); } catch(e){}
                }
                if (quizMyAttemptsRes && quizMyAttemptsRes.ok) {
                    try { parseAndAdd(await quizMyAttemptsRes.json()); } catch(e){}
                }

                // Map raw quiz logs session-wise, checking all possible field variations
                let mappedQuizLogs = qHistList.map(q => {
                    const rawDate = q.created_at || q.completion_date || q.date || q.timestamp || q.createdAt || q.updatedAt;
                    const validDate = (rawDate && !isNaN(new Date(rawDate).getTime())) 
                        ? new Date(rawDate).toISOString() 
                        : new Date().toISOString();
                    return {
                        ...q,
                        reward_name: q.title || q.quiz_name || q.quizName || q.name || q.reward_name || 'Quiz Completion',
                        points: Number(q.points || q.score || q.total_score || q.total_points || q.quiz_score || q.points_reward || 100),
                        created_at: validDate
                    };
                });

                // Calculate current sum of mapped quiz logs
                const currentQuizSum = mappedQuizLogs.reduce((sum, q) => sum + Number(q.points || 0), 0);
                
                // If there's a deficit between the leaderboard quiz points and our logs, synthesize the difference session-wise
                if (trueQuizPoints > currentQuizSum) {
                    let deficit = trueQuizPoints - currentQuizSum;
                    let dayIndex = 0;
                    while (deficit > 0) {
                        const pointsForLog = Math.min(100, deficit);
                        const logDate = new Date();
                        logDate.setDate(logDate.getDate() - dayIndex);
                        mappedQuizLogs.push({
                            id: `synth_quiz_${dayIndex}`,
                            reward_name: `Quiz Session Completion`,
                            points: pointsForLog,
                            created_at: logDate.toISOString()
                        });
                        deficit -= pointsForLog;
                        dayIndex++;
                    }
                }

                setQuizHistory(mappedQuizLogs);


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

    // 1. Unified History & Point Calculation — Session-wise Quiz Logs
    // Display all attempts/sessions individually instead of deduplicating them daily
    const dedupedQuizHistory = quizHistory;

    const rawServerHistory = Array.isArray(rewardData) ? rewardData : (rewardData?.history || rewardData?.awards || rewardData?.data || rewardData?.rewards || []);
    const serverTotalPoints = Number(rewardData?.totalPoints || rewardData?.total_points || (Array.isArray(rewardData) ? 0 : rewardData?.points) || 0);

    // 2. Combine with server history, avoiding duplicate quiz entries
    const uniqueHistory = [...dedupedQuizHistory];
    rawServerHistory.forEach(item => {
        const isQuiz = String(item.reward_name || item.rewardName || item.title || '').toUpperCase().includes('QUIZ');
        
        // If it is a quiz record, we only add it if we do not already have local session-wise quiz history
        if (isQuiz && dedupedQuizHistory.length > 0) {
            return;
        }
        uniqueHistory.push(item);
    });

    // 3. Final Point Calculation — Fully Dynamic & Accurate
    // Source 1: Sum of all unique history items
    const totalPointsFromHistory = uniqueHistory.reduce((sum, item) => sum + Number(item.points || item.rep || 0), 0);

    // Source 2: Build leaderboard from all participants to find global rank
    const liveMap = new Map();
    leaderboard.forEach(s => {
        const targetId = String(s.employee_id || s.user_id || s.id || s.userId || '').split(':')[0];
        if (!targetId) return;

        const empRecord = employees.find(e => String(e.id || e.employee_id || '').split(':')[0] === targetId);
        const name = s.employee_name || s.name || s.userName || (empRecord ? (empRecord.name || empRecord.username || empRecord.employee_name) : null) ||
            (() => {
                const possibleUserKeys = [
                    user?.employee_id,
                    user?.uid,
                    user?.id,
                    user?.userId,
                    user?.email,
                    user?.name,
                    user?.employee_name
                ];
                const isUser = possibleUserKeys.some(key => {
                    const cleanKey = String(key || '').split(':')[0].trim().toLowerCase();
                    return cleanKey && targetId.toLowerCase() === cleanKey;
                });
                return isUser ? (user?.name || 'You') : `Employee ${targetId}`;
            })();

        const score = Number(s.total_score || s.points || s.quiz_score || s.score || s.totalPoints || s.total_points || s.rep || 0);

        if (score > 0) {
            const current = liveMap.get(targetId);
            if (!current || score > current.score) {
                liveMap.set(targetId, { name, score });
            }
        }
    });

    const sortedLeaderboard = Array.from(liveMap, ([id, data]) => ({ id, ...data }))
        .filter(u => {
            const n = String(u.name || '').toUpperCase();
            return !n.includes('DINESH') && !n.includes('HR') && !n.includes('ADMIN');
        })
        .sort((a, b) => b.score - a.score);

    // Determine this user's rank and best score from leaderboard using ID for absolute accuracy
    const myId = String(user?.employee_id || user?.uid || user?.id || user?.userId || '');
    const userEntryIndex = sortedLeaderboard.findIndex(e => {
        const cleanEId = String(e.id || '').split(':')[0].trim().toLowerCase();
        const cleanEName = String(e.name || '').split(':')[0].trim().toLowerCase();
        const possibleUserKeys = [
            user?.employee_id,
            user?.uid,
            user?.id,
            user?.userId,
            user?.email,
            user?.name,
            user?.employee_name
        ];
        return possibleUserKeys.some(key => {
            const cleanKey = String(key || '').split(':')[0].trim().toLowerCase();
            return cleanKey && (cleanEId === cleanKey || cleanEName === cleanKey);
        });
    });
    let userRank = userEntryIndex >= 0 ? userEntryIndex + 1 : 0;
    const leaderboardScore = userEntryIndex >= 0 ? sortedLeaderboard[userEntryIndex].score : 0;

    // Final total: Trust leaderboard score first (consolidated quiz + rewards), then server total points, then history sum
    const finalTotalPoints = leaderboardScore > 0 ? leaderboardScore : (serverTotalPoints > 0 ? serverTotalPoints : totalPointsFromHistory);

    const userName = user?.name || user?.employee_name || 'You';
    // If user has points but wasn't explicitly found in the leaderboard array, calculate rank dynamically
    if (userRank === 0 && finalTotalPoints > 0) {
        sortedLeaderboard.push({ id: myId, name: userName, score: finalTotalPoints });
        sortedLeaderboard.sort((a, b) => b.score - a.score);
        const dynamicIndex = sortedLeaderboard.findIndex(e => String(e.id || '').split(':')[0] === myId);
        userRank = dynamicIndex >= 0 ? dynamicIndex + 1 : 0;
    }

    const stats = {
        rank: userRank > 0 ? userRank : 'N/A',
        points: finalTotalPoints,
        endorsements: Math.floor(finalTotalPoints / 100),
        score: 'Active',
        topName: sortedLeaderboard[0]?.name || 'TBD',
        topScore: sortedLeaderboard[0]?.score || 0
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
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [rewardRes, quizRes] = await Promise.all([
                fetch(API_ENDPOINTS.REWARDS_USER(memberId), { headers }).catch(() => null),
                fetch(`${BASE_URL}/api/quizzes/history?userId=${memberId}`, { headers }).catch(() => null)
            ]);

            let combinedHistory = [];
            let total = 0;

            if (rewardRes && rewardRes.ok) {
                const data = await rewardRes.json();
                const list = Array.isArray(data) ? data : (data.history || data.awards || data.data || []);
                combinedHistory = [...list];
                total = data.totalPoints || data.total_points || 0;
            }

            if (quizRes && quizRes.ok) {
                const quizData = await quizRes.json();
                const qList = Array.isArray(quizData) ? quizData : (quizData.data || quizData.history || quizData.attempts || quizData.completions || []);
                
                // Deduplicate quiz history (highest score per day)
                const qMap = {};
                qList.forEach(q => {
                    const rawDate = q.created_at || q.completion_date || q.date || q.timestamp || q.createdAt || q.updatedAt;
                    const validDate = (rawDate && !isNaN(new Date(rawDate).getTime())) 
                        ? new Date(rawDate).toISOString() 
                        : new Date().toISOString();
                    const d = formatDate(validDate);
                    if (!qMap[d] || (q.points || q.score || 0) > (qMap[d].points || 0)) {
                        qMap[d] = {
                            ...q,
                            points: q.points || q.score || 300,
                            created_at: validDate
                        };
                    }
                });

                Object.values(qMap).forEach(q => {
                    const qDate = formatDate(q.created_at);
                    const exists = combinedHistory.some(h => 
                        formatDate(h.created_at || h.date) === qDate && 
                        String(h.reward_name || h.title || '').toUpperCase().includes('QUIZ')
                    );
                    if (!exists) {
                        combinedHistory.push({
                            ...q,
                            reward_name: q.title || q.reward_name || 'Quiz Excellence',
                            points: q.points,
                            created_at: q.created_at
                        });
                    }
                });
            }

            setMemberRewards(combinedHistory);

            // Calculate recognition total
            const recognitionTotal = combinedHistory.reduce((sum, item) => sum + Number(item.points || item.rep || 0), 0);
            
            // Get score from leaderboard as a robust fallback
            const lbScore = Number(member.score || leaderboard.find(e => String(e.id || '').split(':')[0] === String(memberId))?.score || 0);

            // Use the highest known total
            const finalTotal = Math.max(recognitionTotal, total, lbScore);
            setMemberPoints(finalTotal);

            // If there's a significant gap between history and total, add a summary quiz entry
            if (finalTotal > recognitionTotal && !combinedHistory.some(h => String(h.reward_name || '').toUpperCase().includes('QUIZ'))) {
                setMemberRewards(prev => [...prev, {
                    reward_name: 'Quiz & Performance Bonus',
                    points: finalTotal - recognitionTotal,
                    created_at: new Date().toISOString()
                }]);
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
                    granted_by: user.id || user.empId || user.employee_id || user.uid
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


    const cleanIdLocal = (id) => String(id || '').split(':')[0].trim().toLowerCase();

    const degMap = {};
    employees.forEach(e => {
        const empId = cleanIdLocal(e.id || e.employee_id || e.userId || '');
        if (empId) {
            degMap[empId] = String(e.designation || e.role || '').toUpperCase();
        }
    });

    const allRewards = uniqueHistory;
    const startFilter = null;
    const endFilter = null;

    const getGrantorCategory = (r) => {
        const name = String(r.title || r.award_name || r.reward_name || r.awardName || '').toUpperCase();
        const cat = String(r.category || '').trim().toUpperCase();

        // Any quiz-related items are strictly pushed OUT of TL/PM sections (so they fall into HR)
        if (cat === 'QUIZ' || cat === 'FUN QUIZ GAME' || name.includes('QUIZ')) return 'HR';

        const grantorId = cleanIdLocal(r.granted_by || r.giver_id || r.grantor_id);
        const grantor = employees.find(e => cleanIdLocal(e.id || e.employee_id || e.userId) === grantorId);
        
        if (grantor) {
            const role = String(grantor.role || '').toUpperCase();
            const deg = String(grantor.designation || '').toUpperCase();

            // Check HR
            const isHr = role.includes('HR') || role.includes('ADMIN') || role.includes('RECRUIT') ||
                         role.includes('PEOPLE') || role.includes('TALENT') || role.includes('ACCOUNT') ||
                         role.includes('OPERATIONS') ||
                         deg.includes('HR') || deg.includes('HUMAN RESOURCES') || deg.includes('RECRUIT') ||
                         deg.includes('PEOPLE OPS') || deg.includes('ADMIN') || deg.includes('TALENT') ||
                         deg.includes('OFFICE') || deg.includes('ACCOUNT') || deg.includes('OPERATIONS');
            if (isHr) return 'HR';

            // Check PM
            const isPm = role.includes('PM') || role.includes('PROJECT MANAGER') || role.includes('PRODUCT MANAGER') ||
                         deg.includes('PM') || deg.includes('PROJECT MANAGER') || deg.includes('PRODUCT MANAGER');
            if (isPm) return 'PM';

            // Check TL
            const isTl = role.includes('TL') || role.includes('TEAM LEADER') || role.includes('TEAM LEAD') || role.includes('LEAD') || role.includes('MANAGER') ||
                         deg.includes('TL') || deg.includes('TEAM LEADER') || deg.includes('TEAM LEAD') || deg.includes('LEAD') || deg.includes('MANAGER');
            if (isTl) return 'TL';
        }

        // Fallbacks based on reward properties if grantor not found in employees list
        const rRole = String(r.granted_by_role || r.giver_role || r.role || '').toUpperCase();
        const rCat = String(r.category || '').toUpperCase();

        const isHrFallback = rCat === 'HR' || rCat === 'ADMIN' || rCat === 'GAME' || rRole.includes('HR') || rRole.includes('ADMIN');
        if (isHrFallback) return 'HR';

        const isPmFallback = rCat === 'PM' || rRole.includes('PM') || rRole.includes('PROJECT');
        if (isPmFallback) return 'PM';

        const isTlFallback = rCat === 'TL' || rRole.includes('TL') || rRole.includes('LEAD') || rRole.includes('MANAGER') || name.includes('VISIONARY') || name.includes('LEAD');
        if (isTlFallback) return 'TL';

        return 'HR';
    };

    const pmList = allRewards.filter(r => getGrantorCategory(r) === 'PM');
    const tlList = allRewards.filter(r => getGrantorCategory(r) === 'TL');
    const hrList = allRewards.filter(r => getGrantorCategory(r) === 'HR').sort((a, b) => {
        const isAQuiz = String(a.reward_name || '').toUpperCase().includes('QUIZ');
        const isBQuiz = String(b.reward_name || '').toUpperCase().includes('QUIZ');
        if (isAQuiz && !isBQuiz) return -1;
        if (!isAQuiz && isBQuiz) return 1;
        return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
    });

    const history = {
        tl: tlList,
        pm: pmList,
        hr: hrList
    };

    const allActivity = uniqueHistory;


    const RewardCard = ({ item, color, bg }) => {
        const isQuiz = String(item.reward_name || '').toUpperCase().includes('QUIZ');
        const isGoal = String(item.reward_name || '').toUpperCase().includes('GOAL');

        // Define theme colors based on image 2
        const theme = isQuiz
            ? { bg: '#FFFBEB', border: '#FEF3C7', text: '#D97706', date: '#94A3B8' }
            : (isGoal ? { bg: '#F0FDF4', border: '#DCFCE7', text: '#15803D', date: '#94A3B8' } : { bg: bg, border: color + '15', text: color, date: '#94A3B8' });

        return (
            <motion.div
                whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
            <style>{`
                .shiny-gold-btn {
                    animation: goldShine 3s linear infinite;
                }
                @keyframes goldShine {
                    0% { background-position: 0% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes floatCup {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-3px) rotate(2deg); }
                }
                .float-gold {
                    animation: floatCup 2s ease-in-out infinite;
                }
                .float-silver {
                    animation: floatCup 2.5s ease-in-out infinite;
                }
                .float-bronze {
                    animation: floatCup 2.8s ease-in-out infinite;
                }
                @keyframes goldPulse {
                    0%, 100% { box-shadow: 0 4px 15px rgba(245, 199, 26, 0.1); border-color: #F5C71A; }
                    50% { box-shadow: 0 8px 25px rgba(245, 199, 26, 0.35); border-color: #FBBC05; }
                }
                .pulse-gold-row {
                    animation: goldPulse 2s infinite ease-in-out;
                }
            `}</style>

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
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <motion.button 
                        onClick={() => setShowLeaderboard(true)} 
                        whileHover={{ scale: 1.06, y: -2, boxShadow: '0 8px 25px rgba(251, 188, 5, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                        className="shiny-gold-btn"
                        style={{ 
                            background: 'linear-gradient(90deg, #FBBC05 0%, #FFF5C0 50%, #FBBC05 100%)', 
                            backgroundSize: '200% auto',
                            color: '#0B1E3F', 
                            border: 'none', 
                            padding: '11px 22px', 
                            borderRadius: '16px', 
                            fontSize: '12px', 
                            fontWeight: '1000', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            boxShadow: '0 6px 20px rgba(251, 188, 5, 0.25)',
                            transition: 'box-shadow 0.3s ease'
                        }}
                    >
                        <Trophy size={15} color="#0B1E3F" fill="#0B1E3F" /> Global Leaderboard
                    </motion.button>
                    {canGrant && (
                        <button style={{ backgroundColor: '#FBBC05', color: '#0B1E3F', border: 'none', padding: '11px 22px', borderRadius: '16px', fontSize: '12px', fontWeight: '1000', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            All team scores
                        </button>
                    )}
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
                        <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px', whiteSpace: 'nowrap' }}>{stats.rank !== 'N/A' ? `${stats.rank}${getRankSuffix(stats.rank)} Position` : 'Unranked'}</div>
                    </div>
                </div>

                <div style={{ borderRight: winWidth < 1024 ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '5px', textAlign: winWidth < 768 ? 'left' : 'center', overflow: 'hidden' }}>
                    <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee Name</div>
                    <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px', color: '#FBBC05', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name || user?.employee_name || 'You'}</div>
                </div>

                <div style={{ borderRight: winWidth < 1024 ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '5px', textAlign: winWidth < 768 ? 'left' : 'center' }}>
                    <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endorsements</div>
                    <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px' }}>{stats.endorsements} Total</div>
                </div>

                <div style={{ padding: '5px', textAlign: winWidth < 768 ? 'left' : 'right' }}>
                    <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your REP points</div>
                    <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px', color: '#FBBC05', display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'flex-start' : 'flex-end', gap: '6px' }}>
                        {stats.points} <Star size={14} fill="#FBBC05" color="#FBBC05" />
                    </div>
                </div>
            </div>

            {/* MAIN COLUMNS */}
            <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1024 ? '1fr' : '1fr 1fr 1fr', gap: '25px', marginBottom: '40px' }}>
                <motion.div 
                    initial={{ opacity: 0, y: 25 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
                    style={{ 
                        backgroundColor: 'white', borderRadius: '28px', padding: '24px', 
                        border: '1px solid #fdf4ff', boxShadow: '0 10px 40px rgba(112,26,117,0.02)',
                        height: '580px', display: 'flex', flexDirection: 'column'
                    }}
                >
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
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
                        {tlList.map((item, idx) => <RewardCard key={idx} item={item} color="#701a75" bg="#fdf4ff" />)}
                        {tlList.length === 0 && <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>No TL rewards.</div>}
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 25 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
                    style={{ 
                        backgroundColor: 'white', borderRadius: '28px', padding: '24px', 
                        border: '1px solid #f0f9ff', boxShadow: '0 10px 40px rgba(3,105,161,0.02)',
                        height: '580px', display: 'flex', flexDirection: 'column'
                    }}
                >
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
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
                        {pmList.map((item, idx) => <RewardCard key={idx} item={item} color="#0369a1" bg="#f0f9ff" />)}
                        {pmList.length === 0 && <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>No PM rewards.</div>}
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 25 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
                    style={{ 
                        backgroundColor: '#ffffff', padding: '25px', borderRadius: '24px', 
                        border: '1.5px solid #f0fdf4', boxShadow: '0 10px 40px rgba(74, 222, 128, 0.05)',
                        height: '580px', display: 'flex', flexDirection: 'column'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} color="#22c55e" /></div>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#15803d' }}>HR & Game Recognition</h2>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {canGrant && (
                                <button onClick={() => openGrantModal('HR')} style={{ backgroundColor: '#FBBC05', color: '#0B1E3F', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '1000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Zap size={14} fill="#0B1E3F" /> Reward
                                </button>
                            )}
                            {/* Dynamic Total Points Calculation Badge */}
                            <div style={{ padding: '4px 10px', backgroundColor: '#fef3c7', borderRadius: '10px', border: '1px solid #fde68a', fontSize: '10px', fontWeight: '1000', color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Trophy size={12} />
                                {(() => {
                                    const totalHrPoints = (history.hr || []).reduce((sum, aw) => {
                                        const rawTitle = String(aw.title || aw.award_name || aw.reward_name || aw.awardName || '').trim().toLowerCase();
                                        const cat = String(aw.category || '').toUpperCase();
                                        const isQuiz = cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.includes('quiz') || rawTitle.includes('brain teaser');
                                        if (isQuiz) return sum + (Number(aw.points) || Number(aw.rep) || 0);
                                        return sum;
                                    }, 0);
                                    return `${totalHrPoints} REP TOTAL`;
                                })()}
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
                        {history.hr?.length > 0 ? (
                            history.hr
                                .filter(aw => {
                                    // Date picker filtering logic
                                    const d = new Date(aw.created_at || aw.date).getTime();
                                    if (startFilter && d < new Date(startFilter).getTime()) return false;
                                    if (endFilter && d > new Date(endFilter).getTime() + 86400000) return false;
                                    return true;
                                })
                                .map((aw, i) => {
                                    // Title assignment and Quiz flag checking
                                    const rawTitle = String(aw.title || aw.award_name || aw.reward_name || aw.awardName || '').trim();
                                    const cat = String(aw.category || '').toUpperCase();
                                    const isQuiz = cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.toLowerCase().includes('points earned by quiz') || rawTitle.toLowerCase().includes('quiz');
                                    
                                    const displayTitle = isQuiz ? 'Brain Teaser Achievement' : rawTitle;

                                    return (
                                        <motion.div 
                                            key={i} 
                                            initial={{ opacity: 0, y: 10 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                            style={{ 
                                                // Styling switches to yellow theme if it's a Quiz
                                                backgroundColor: isQuiz ? '#fffbeb' : '#fcfdfe', 
                                                padding: '15px', borderRadius: '18px', 
                                                border: `1px solid ${isQuiz ? '#fef3c7' : '#dcfce7'}`, 
                                                position: 'relative',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {isQuiz && <div style={{ position: 'absolute', top: '8px', right: '8px' }}><Zap size={12} color="#eab308" fill="#eab308" /></div>}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: isQuiz ? '15px' : '0' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{displayTitle}</div>
                                                </div>
                                                <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', flexShrink: 0 }}>
                                                    {aw.created_at || aw.date ? new Date(aw.created_at || aw.date).toLocaleDateString() : 'Recent'}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '11px', fontWeight: '1000', color: isQuiz ? '#d97706' : '#15803d', marginTop: '4px' }}>
                                                +{aw.rep || aw.points} REP POINTS
                                            </div>
                                        </motion.div>
                                    );
                                })
                        ) : <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '800', border: '1.5px dashed #e2e8f0', borderRadius: '15px' }}>No HR or Quiz records in audit</div>}
                    </div>
                </motion.div>
            </div>            {/* Modals... */}
            <AnimatePresence>
                {showLeaderboard && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            style={{ backgroundColor: 'white', borderRadius: '35px', width: '100%', maxWidth: '550px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '30px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trophy size={20} color="#D97706" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>Global Leaderboard</h3>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Top performers across all departments</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowLeaderboard(false)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', backgroundColor: '#F1F5F9' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {sortedLeaderboard.map((entry, idx) => {
                                        const isMe = String(entry.id).split(':')[0] === myId;
                                        const rank = idx + 1;
                                        return (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className={rank === 1 ? 'pulse-gold-row' : ''}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '15px 20px',
                                                    background: rank === 1 ? 'linear-gradient(135deg, #FFFDF5 0%, #FFF9D6 100%)' :
                                                                rank === 2 ? 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' :
                                                                rank === 3 ? 'linear-gradient(135deg, #FFFBF9 0%, #FFF5ED 100%)' :
                                                                isMe ? '#F0F9FF' : '#F8FAFC',
                                                    borderRadius: '20px',
                                                    border: rank === 1 ? '1.5px solid #F5C71A' :
                                                            rank === 2 ? '1.5px solid #CBD5E1' :
                                                            rank === 3 ? '1.5px solid #FDBA74' :
                                                            isMe ? '1.5px solid #BAE6FD' : '1.5px solid transparent',
                                                    boxShadow: rank === 1 ? '0 4px 15px rgba(245, 199, 26, 0.15)' : 'none'
                                                }}
                                            >
                                                <div style={{ width: '55px', display: 'flex', justifyContent: 'center', marginRight: '15px' }}>
                                                    {rank === 1 ? (
                                                        <svg width="48" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="float-gold" style={{ filter: 'drop-shadow(0px 3px 6px rgba(245, 199, 26, 0.45))' }}>
                                                            {/* Left Majestic Wing */}
                                                            <path d="M5 6C2 4.5 0 6.5 0.5 10.5C0.8 12 2.5 13 4 13.5C4.8 13.8 5 13.8 5 13.8" stroke="#D97706" strokeWidth="1" fill="#FEF3C7" strokeLinecap="round" />
                                                            <path d="M5 8C3 7 1.5 8.5 2 11.5C2.2 12.2 3.5 12.8 5 13" stroke="#D97706" strokeWidth="0.8" fill="#FDE68A" strokeLinecap="round" />
                                                            <path d="M5 10C3.8 9.5 3 10.5 3.5 12C3.8 12.5 4.5 12.8 5 12.9" stroke="#D97706" strokeWidth="0.6" fill="#FCD34D" strokeLinecap="round" />
                                                            
                                                            {/* Right Majestic Wing */}
                                                            <path d="M19 6C22 4.5 24 6.5 23.5 10.5C23.2 12 21.5 13 20 13.5C19.2 13.8 19 13.8 19 13.8" stroke="#D97706" strokeWidth="1" fill="#FEF3C7" strokeLinecap="round" />
                                                            <path d="M19 8C21 7 22.5 8.5 22 11.5C21.8 12.2 20.5 12.8 19 13" stroke="#D97706" strokeWidth="0.8" fill="#FDE68A" strokeLinecap="round" />
                                                            <path d="M19 10C20.2 9.5 21 10.5 20.5 12C20.2 12.5 19.5 12.8 19 12.9" stroke="#D97706" strokeWidth="0.6" fill="#FCD34D" strokeLinecap="round" />

                                                            {/* Cup bowl & base */}
                                                            <path d="M8 2L10 4L12 2L14 4L16 2L15 5H9L8 2Z" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" strokeLinejoin="round" />
                                                            <path d="M5 7H3C2 7 2 10 3.5 11C4.5 11.5 5 11.5 5 11.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M19 7H21C22 7 22 10 20.5 11C19.5 11.5 19 11.5 19 11.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M5 5H19V12C19 15.5 16.5 17.5 12 17.5C7.5 17.5 5 15.5 5 12V5Z" fill="url(#goldGradientCup)" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
                                                            <path d="M12 17.5V21" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
                                                            <path d="M8 21H16" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
                                                            <text x="12" y="12.5" fill="#5C4D00" fontSize="8" fontWeight="1000" textAnchor="middle" fontFamily="Outfit, Inter, sans-serif">1</text>
                                                            <defs>
                                                                <linearGradient id="goldGradientCup" x1="12" y1="5" x2="12" y2="17.5" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#FFE885" />
                                                                    <stop offset="100%" stopColor="#F5C71A" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                    ) : rank === 2 ? (
                                                        <svg width="45" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="float-silver" style={{ filter: 'drop-shadow(0px 3px 6px rgba(148, 163, 184, 0.35))' }}>
                                                            {/* Left Majestic Wing */}
                                                            <path d="M5 6C2 4.5 0 6.5 0.5 10.5C0.8 12 2.5 13 4 13.5C4.8 13.8 5 13.8 5 13.8" stroke="#475569" strokeWidth="1" fill="#F8FAFC" strokeLinecap="round" />
                                                            <path d="M5 8C3 7 1.5 8.5 2 11.5C2.2 12.2 3.5 12.8 5 13" stroke="#475569" strokeWidth="0.8" fill="#E2E8F0" strokeLinecap="round" />
                                                            <path d="M5 10C3.8 9.5 3 10.5 3.5 12C3.8 12.5 4.5 12.8 5 12.9" stroke="#475569" strokeWidth="0.6" fill="#CBD5E1" strokeLinecap="round" />

                                                            {/* Right Majestic Wing */}
                                                            <path d="M19 6C22 4.5 24 6.5 23.5 10.5C23.2 12 21.5 13 20 13.5C19.2 13.8 19 13.8 19 13.8" stroke="#475569" strokeWidth="1" fill="#F8FAFC" strokeLinecap="round" />
                                                            <path d="M19 8C21 7 22.5 8.5 22 11.5C21.8 12.2 20.5 12.8 19 13" stroke="#475569" strokeWidth="0.8" fill="#E2E8F0" strokeLinecap="round" />
                                                            <path d="M19 10C20.2 9.5 21 10.5 20.5 12C20.2 12.5 19.5 12.8 19 12.9" stroke="#475569" strokeWidth="0.6" fill="#CBD5E1" strokeLinecap="round" />

                                                            {/* Cup elements */}
                                                            <path d="M5 6H3C2 6 2 9 3.5 10C4.5 10.5 5 10.5 5 10.5" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M19 6H21C22 6 22 9 20.5 10C19.5 10.5 19 10.5 19 10.5" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M5 4H19V11C19 14.5 16.5 16.5 12 16.5C7.5 16.5 5 14.5 5 11V4Z" fill="url(#silverGradientCup)" stroke="#475569" strokeWidth="1.5" strokeLinejoin="round" />
                                                            <path d="M12 16.5V20" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                                                            <path d="M8 20H16" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                                                            <text x="12" y="11.5" fill="#1E293B" fontSize="8.5" fontWeight="1000" textAnchor="middle" fontFamily="Outfit, Inter, sans-serif">2</text>
                                                            <defs>
                                                                <linearGradient id="silverGradientCup" x1="12" y1="4" x2="12" y2="16.5" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#F8FAFC" />
                                                                    <stop offset="100%" stopColor="#94A3B8" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                    ) : rank === 3 ? (
                                                        <svg width="45" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="float-bronze" style={{ filter: 'drop-shadow(0px 3px 6px rgba(217, 119, 6, 0.35))' }}>
                                                            {/* Left Majestic Wing */}
                                                            <path d="M5 6C2 4.5 0 6.5 0.5 10.5C0.8 12 2.5 13 4 13.5C4.8 13.8 5 13.8 5 13.8" stroke="#9A3412" strokeWidth="1" fill="#FFF5ED" strokeLinecap="round" />
                                                            <path d="M5 8C3 7 1.5 8.5 2 11.5C2.2 12.2 3.5 12.8 5 13" stroke="#9A3412" strokeWidth="0.8" fill="#FFEDD5" strokeLinecap="round" />
                                                            <path d="M5 10C3.8 9.5 3 10.5 3.5 12C3.8 12.5 4.5 12.8 5 12.9" stroke="#9A3412" strokeWidth="0.6" fill="#FED7AA" strokeLinecap="round" />

                                                            {/* Right Majestic Wing */}
                                                            <path d="M19 6C22 4.5 24 6.5 23.5 10.5C23.2 12 21.5 13 20 13.5C19.2 13.8 19 13.8 19 13.8" stroke="#9A3412" strokeWidth="1" fill="#FFF5ED" strokeLinecap="round" />
                                                            <path d="M19 8C21 7 22.5 8.5 22 11.5C21.8 12.2 20.5 12.8 19 13" stroke="#9A3412" strokeWidth="0.8" fill="#FFEDD5" strokeLinecap="round" />
                                                            <path d="M19 10C20.2 9.5 21 10.5 20.5 12C20.2 12.5 19.5 12.8 19 12.9" stroke="#9A3412" strokeWidth="0.6" fill="#FED7AA" strokeLinecap="round" />

                                                            {/* Cup elements */}
                                                            <path d="M5 6H3C2 6 2 9 3.5 10C4.5 10.5 5 10.5 5 10.5" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M19 6H21C22 6 22 9 20.5 10C19.5 10.5 19 10.5 19 10.5" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M5 4H19V11C19 14.5 16.5 16.5 12 16.5C7.5 16.5 5 14.5 5 11V4Z" fill="url(#bronzeGradientCup)" stroke="#9A3412" strokeWidth="1.5" strokeLinejoin="round" />
                                                            <path d="M12 16.5V20" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
                                                            <path d="M8 20H16" stroke="#9A3412" strokeWidth="2.5" strokeLinecap="round" />
                                                            <text x="12" y="11.5" fill="#431407" fontSize="8.5" fontWeight="1000" textAnchor="middle" fontFamily="Outfit, Inter, sans-serif">3</text>
                                                            <defs>
                                                                <linearGradient id="bronzeGradientCup" x1="12" y1="4" x2="12" y2="16.5" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#FFE5D4" />
                                                                    <stop offset="100%" stopColor="#D97706" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                    ) : (
                                                        <div style={{ fontSize: '13px', fontWeight: '1000', color: '#94A3B8' }}>
                                                            #{rank}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '1000', color: '#0B1E3F' }}>
                                                        {entry.name} {isMe && <span style={{ fontSize: '10px', backgroundColor: '#0284C7', color: 'white', padding: '2px 8px', borderRadius: '8px', marginLeft: '5px' }}>YOU</span>}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{entry.score}</div>
                                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '900', textTransform: 'uppercase' }}>REP Points</div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {sortedLeaderboard.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '14px' }}>
                                            No leaderboard data available.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginTop: '8px' }}>
                                    <p style={{ margin: 0, opacity: 0.7, fontSize: '13px' }}>Global Rank: #{sortedLeaderboard.findIndex(e => String(e.id || '').split(':')[0] === String(selectedMember.id || '').split(':')[0]) + 1 || 'N/A'}</p>
                                    <div style={{ padding: '4px 12px', borderRadius: '10px', backgroundColor: '#FBBC05', color: '#0B1E3F', fontSize: '12px', fontWeight: '1000' }}>
                                        {memberPoints} REP
                                    </div>
                                </div>
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
