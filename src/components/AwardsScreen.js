import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Star, Medal, ArrowLeft, Trophy, Calendar, Users, Zap, X, ChevronRight } from 'lucide-react';
import { BASE_URL, API_ENDPOINTS } from '../config';
import { useAuth } from '../context/AuthContext';
import BackButton from './BackButton';

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
    const [quizUserPoints, setQuizUserPoints] = useState(0);
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

    const activeGrantOptions = grantOptions[activeCategory] || [];

    const canGrant = ['Admin', 'HR', 'PM', 'Manager', 'TL', 'CEO', 'Super Admin', 'SuperAdmin'].includes(user?.role || '');

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [quizHistory, setQuizHistory] = useState([]);
    const [globalRewardsFeed, setGlobalRewardsFeed] = useState([]);
    const [rewardsBackendRank, setRewardsBackendRank] = useState(null);
    const [backendEndorsements, setBackendEndorsements] = useState(0);
    const [rewardsBackendPoints, setRewardsBackendPoints] = useState(0);
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const rawId = String(user?.employee_id || user?.uid || user?.id || user?.userId || user?.empId || user?.email || '');
                const safeUid = decodeURIComponent(rawId).replace(/:1$/, '').split(':')[0];
                if (!safeUid) return;

                const token = localStorage.getItem('token');
                const headers = { 'Accept': 'application/json' };
                if (token && !token.startsWith('joinee-')) headers['Authorization'] = `Bearer ${token}`;

                const [myRes, userRes, allRes, dailyLeadRes, genLeadRes, empRes, rewardsLeadRes, quizHistRes, quizCompletionsRes, quizLeadRes, quizAttemptsRes, quizMyAttemptsRes, quizUserPointsRes, grantOptionsRes] = await Promise.all([
                    fetch(`${API_ENDPOINTS.REWARDS_MY}?userId=${safeUid}`, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_USER(safeUid), { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_ALL, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/quizzes/leaderboard/daily`, { headers }).catch(() => null),
                    fetch(`${BASE_URL}/api/fun-quizzes/leaderboard`, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.USERS, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.REWARDS_LEADERBOARD, { headers }).catch(() => null),
                    Promise.resolve({ ok: false }), // Disabled to fix 404: fetch(`${BASE_URL}/api/quizzes/history?userId=${safeUid}`, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.QUIZ_COMPLETIONS_MY, { headers }).catch(() => null),
                    fetch(API_ENDPOINTS.QUIZ_LEADERBOARD, { headers }).catch(() => null),
                    Promise.resolve({ ok: false }), // Disabled to avoid duplicating with QUIZ_COMPLETIONS_MY: fetch(`${BASE_URL}/api/quizzes/attempts?userId=${safeUid}`, { headers }).catch(() => null),
                    Promise.resolve({ ok: false }), // Disabled to fix 404: fetch(`${BASE_URL}/api/quizzes/my-attempts`, { headers }).catch(() => null),
                    fetch(`${API_ENDPOINTS.QUIZ_USER_POINTS}?userId=${safeUid}`, { headers }).catch(() => null),
                    Promise.resolve({ ok: false }) // Disabled: fetch(API_ENDPOINTS.REWARDS_GRANT_OPTIONS, { headers }).catch(() => null)
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
                    setGlobalRewardsFeed(list); // Store all company rewards for the global feeds

                    // Extract rewards where the logged-in user is the receiver (employee_id column)
                    const myItems = list.filter(r => {
                        const rEmployeeId = String(r.employee_id || '').split(':')[0].trim().toLowerCase();
                        const rUserId = String(r.userId || r.user_id || '').split(':')[0].trim().toLowerCase();
                        const rEmpId = String(r.empId || '').split(':')[0].trim().toLowerCase();
                        return (rEmployeeId === safeUid.toLowerCase() || rUserId === safeUid.toLowerCase() || rEmpId === safeUid.toLowerCase()) ||
                            (rEmployeeId === rawId.toLowerCase() || rUserId === rawId.toLowerCase() || rEmpId === rawId.toLowerCase()) ||
                            (user?.email && (rEmployeeId === user.email.toLowerCase() || rUserId === user.email.toLowerCase()));
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

                // Fetch user points from backend quiz user points endpoint
                if (quizUserPointsRes && quizUserPointsRes.ok) {
                    const ptsData = await quizUserPointsRes.json();
                    const quizPointsVal = Number(ptsData.points || ptsData.total_points || ptsData.score || ptsData.total_score || ptsData.quiz_points || ptsData.quizPoints || 0);
                    setQuizUserPoints(quizPointsVal);
                }

                if (grantOptionsRes && grantOptionsRes.ok) {
                    try {
                        const data = await grantOptionsRes.json();
                        const options = Array.isArray(data) ? data : (data.data || data.options || {});

                        let grouped = { TL: [], PM: [], HR: [] };

                        if (Array.isArray(options)) {
                            options.forEach(opt => {
                                const cat = String(opt.category || 'HR').toUpperCase();
                                if (grouped[cat] !== undefined) {
                                    grouped[cat].push({
                                        id: opt.id || opt._id || opt.reward_id || opt.title,
                                        title: opt.title || opt.reward_name || opt.name,
                                        rep: Number(opt.rep || opt.points || opt.reward_points || 0),
                                    });
                                }
                            });
                        } else {
                            Object.keys(options).forEach(cat => {
                                const catUpper = cat.toUpperCase();
                                if (grouped[catUpper] !== undefined) {
                                    grouped[catUpper] = (Array.isArray(options[cat]) ? options[cat] : []).map(opt => ({
                                        id: opt.id || opt._id || opt.reward_id || opt.title,
                                        title: opt.title || opt.reward_name || opt.name,
                                        rep: Number(opt.rep || opt.points || opt.reward_points || 0),
                                    }));
                                }
                            });
                        }

                        const ICONS = [<Zap size={18} />, <Award size={18} />, <Star size={18} />, <Medal size={18} />, <Users size={18} />];
                        Object.keys(grouped).forEach(cat => {
                            grouped[cat].forEach((opt, i) => {
                                opt.icon = ICONS[i % ICONS.length];
                            });
                        });

                        setGrantOptions(grouped);
                    } catch (e) { }
                }

                let rList = [];
                // Parse backend rewards leaderboard to get true global rank
                if (rewardsLeadRes && rewardsLeadRes.ok) {
                    const rLeadData = await rewardsLeadRes.json();
                    rList = Array.isArray(rLeadData) ? rLeadData : (rLeadData?.data || []);

                    const myEntryIndex = rList.findIndex(r => {
                        const rId = String(r.userId || r.user_id || r.employee_id || r.id || '').split(':')[0].trim().toLowerCase();
                        const rName = String(r.name || '').trim().toLowerCase();
                        const myName = String(user?.name || user?.employee_name || '').trim().toLowerCase();
                        return rId === safeUid.toLowerCase() ||
                            (user?.email && rId === user.email.toLowerCase()) ||
                            (myName && rName && myName === rName);
                    });
                    if (myEntryIndex >= 0) {
                        const myEntry = rList[myEntryIndex];
                        // If the backend doesn't provide a rank field, use the array index + 1
                        setRewardsBackendRank(Number(myEntry.rank || myEntry.global_rank || myEntry.position || (myEntryIndex + 1)));
                        setBackendEndorsements(Number(myEntry.total_awards || myEntry.endorsements || myEntry.total_endorsements || 0));
                        // Public leaderboard API returns: totalPointsNum, totalRepNum, total_rep (formatted)
                        const extractPts = (val) => Number(String(val || 0).replace(/,/g, '').replace(/[^0-9.-]+/g, ''));
                        setRewardsBackendPoints(
                            Number(myEntry.totalPointsNum || 0) ||
                            Number(myEntry.totalRepNum || 0) ||
                            extractPts(myEntry.total_points || myEntry.totalPoints || myEntry.total_rep) ||
                            Number(myEntry.score || myEntry.total_score || myEntry.points || 0)
                        );
                    }
                    console.log('=== LEADERBOARD API DEBUG ===', {
                        rListLength: rList.length,
                        safeUid,
                        userName: user?.name,
                        myEntryIndex,
                        sampleIds: rList.slice(0, 3).map(r => ({ id: r.id, name: r.name, totalPointsNum: r.totalPointsNum, rank: r.rank })),
                        rewardsBackendRank: myEntryIndex >= 0 ? rList[myEntryIndex].rank : 'NOT FOUND',
                        rewardsBackendPoints: myEntryIndex >= 0 ? rList[myEntryIndex].totalPointsNum : 'NOT FOUND'
                    });
                }

                // If rList is empty, fallback to aggregating allRes (global rewards)
                if (rList.length === 0 && allRes && allRes.ok) {
                    try {
                        const rMap = new Map();
                        // allData is already parsed and stored in the state, but state is async.
                        // However, we just processed it in the allRes block earlier or we can rely on the data if it's stored in a variable.
                        // Wait, we can't access globalRewardsFeed synchronously here because it's a state setter.
                        // We must fetch it again? No, we can just use the same API call or we can rebuild it.
                        // Let's make an explicit fetch or use the data directly since we can just do another fetch if needed.
                        const fallbackRes = await fetch(API_ENDPOINTS.REWARDS_ALL, { headers }).catch(() => null);
                        if (fallbackRes && fallbackRes.ok) {
                            const fallbackData = await fallbackRes.json();
                            const list = Array.isArray(fallbackData) ? fallbackData : (fallbackData.data || fallbackData.rewards || []);
                            list.forEach(r => {
                                const id = String(r.userId || r.user_id || r.employee_id || r.empId || r._id || '').split(':')[0].trim();
                                if (id) {
                                    const current = rMap.get(id) || 0;
                                    rMap.set(id, current + Number(r.points || r.rep || 0));
                                }
                            });
                            rList = Array.from(rMap.entries()).map(([id, score]) => ({ id, score }));
                        }
                    } catch (e) { }
                }

                // 1. Fetch quiz leaderboard from backend
                const qLeaderboardData = quizLeadRes && quizLeadRes.ok ? await quizLeadRes.json() : [];
                const qList = Array.isArray(qLeaderboardData) ? qLeaderboardData : (qLeaderboardData?.data || []);

                // 2. Combine quiz and reward leaderboards
                const combinedMap = new Map();

                qList.forEach(item => {
                    const id = String(item.employee_id || item.user_id || item.id || item.userId || '').split(':')[0].trim();
                    const name = item.employee_name || item.name || item.userName || `Employee ${id}`;
                    const quizScore = Number(item.quizPoints || item.quiz_points || item.points || item.score || item.total_score || item.total_quiz_points || 0);
                    combinedMap.set(id, { id, name, quiz_points: quizScore, reward_points: 0 });
                });

                rList.forEach(item => {
                    const id = String(item.employee_id || item.user_id || item._id || item.id || item.userId || '').split(':')[0].trim();
                    const name = item.employee_name || item.name || item.userName || `Employee ${id}`;

                    // Public leaderboard API returns: totalPointsNum, totalRepNum, total_rep (formatted), total_awards, rank
                    const extractNum = (val) => Number(String(val || 0).replace(/,/g, '').replace(/[^0-9.-]+/g, ""));

                    // Use totalPointsNum/totalRepNum from the public API first, then fall back to other fields
                    const totalScore = Number(item.totalPointsNum || 0) ||
                        Number(item.totalRepNum || 0) ||
                        extractNum(item.total_points || item.totalPoints || item.total_rep) ||
                        extractNum(item.score || item.total_score || item.points || 0);

                    const rewardScore = totalScore; // The public API aggregates all points into totalPointsNum
                    const backendQuizScore = Number(item.quizPointsNum || 0) || extractNum(item.quiz_points || item.quizPoints || 0);
                    const backendRank = Number(item.rank || 0);
                    const totalAwards = Number(item.total_awards || 0);

                    if (combinedMap.has(id)) {
                        const existing = combinedMap.get(id);
                        // totalScore from public API already INCLUDES quiz points,
                        // so reward_points = totalScore - quiz_points to avoid double-counting
                        const pureRewardScore = Math.max(0, totalScore - Math.max(existing.quiz_points || 0, backendQuizScore || 0));
                        existing.reward_points = Math.max(existing.reward_points || 0, pureRewardScore);
                        if (backendQuizScore > 0) {
                            existing.quiz_points = Math.max(existing.quiz_points || 0, backendQuizScore);
                        }
                        if (backendRank > 0 && (!existing.rank || existing.rank > backendRank)) {
                            existing.rank = backendRank;
                        }
                        existing.total_awards = Math.max(existing.total_awards || 0, totalAwards);
                        if (!existing.name || existing.name.startsWith('Employee')) {
                            existing.name = name;
                        }
                    } else {
                        // totalScore includes quiz points, so we must subtract backendQuizScore
                        const pureRewardScore = Math.max(0, totalScore - (backendQuizScore || 0));
                        combinedMap.set(id, { id, name, quiz_points: backendQuizScore, reward_points: pureRewardScore, rank: backendRank, total_awards: totalAwards });
                    }
                });

                const finalLeaderboard = Array.from(combinedMap.values())
                    .map(item => ({
                        ...item,
                        score: Math.max(item.reward_points || 0, (item.quiz_points || 0) + (item.reward_points || 0))
                    }))
                    .sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.score - a.score)
                    .map((item, index) => ({
                        ...item,
                        rank: item.rank || (index + 1)
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
                    try { parseAndAdd(await quizHistRes.json()); } catch (e) { }
                }
                if (quizCompletionsRes && quizCompletionsRes.ok) {
                    try { parseAndAdd(await quizCompletionsRes.json()); } catch (e) { }
                }
                if (quizAttemptsRes && quizAttemptsRes.ok) {
                    try { parseAndAdd(await quizAttemptsRes.json()); } catch (e) { }
                }
                if (quizMyAttemptsRes && quizMyAttemptsRes.ok) {
                    try { parseAndAdd(await quizMyAttemptsRes.json()); } catch (e) { }
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
                        points: Number(q.points || q.earned_points || q.score || q.total_score || q.total_points || q.quiz_score || q.points_reward || 0),
                        created_at: validDate
                    };
                }).filter(q => q.points > 0);

                // Deduplicate quiz history (multiple endpoints return same records)
                const uniqueQuizLogs = [];
                const seenQuizKeys = new Set();
                mappedQuizLogs.forEach(q => {
                    // Aggressive visual deduplication: Combine name (case-insensitive), points, and exactly the localized formatted date string seen in the UI
                    // We ignore q.id because the backend might return multiple IDs for what should be visually one session
                    const key = `${String(q.reward_name).trim().toLowerCase()}_${q.points}_${formatDate(q.created_at)}`;
                    if (!seenQuizKeys.has(key)) {
                        seenQuizKeys.add(key);
                        uniqueQuizLogs.push(q);
                    }
                });

                // Only show real quiz data from the backend — do NOT synthesize fake entries
                setQuizHistory(uniqueQuizLogs);


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
    // Remove the current user filter here so that the HR & Game Recognition global feed 
    // correctly displays EVERY user's quiz completion records from the database.
    const dedupedQuizHistory = quizHistory;

    // DEBUG: Log the raw globalRewardsFeed to see what fields the API returns
    if (globalRewardsFeed.length > 0) {
        console.log('=== REWARDS FEED DEBUG ===');
        console.log('Total items:', globalRewardsFeed.length);
        console.log('Sample item keys:', Object.keys(globalRewardsFeed[0]));
        console.log('Sample item:', JSON.stringify(globalRewardsFeed[0], null, 2));
        console.log('Current user employee_id:', user?.employee_id);
        console.log('Current user uid:', user?.uid);
        console.log('Current user id:', user?.id);
    }

    // The feed should show ONLY the current user's rewards from backend
    // DB columns: employee_id = receiver, granted_by = giver
    const allRewards = globalRewardsFeed.filter(r => {
        const rawTitle = String(r.reward_name || r.rewardName || r.title || '').trim().toLowerCase();
        const cat = String(r.category || '').toUpperCase();
        const isNotQuiz = !(cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.includes('quiz') || rawTitle.includes('brain teaser'));

        // Match the employee_id column (receiver) against ALL possible user identifiers
        const rEmployeeId = String(r.employee_id || '').split(':')[0].trim().toLowerCase();
        const rUserId = String(r.userId || r.user_id || '').split(':')[0].trim().toLowerCase();
        const rEmpId = String(r.empId || '').split(':')[0].trim().toLowerCase();

        const myId = String(user?.employee_id || '').split(':')[0].trim().toLowerCase();
        const myUid = String(user?.uid || '').split(':')[0].trim().toLowerCase();
        const myUserId = String(user?.id || user?.userId || '').split(':')[0].trim().toLowerCase();
        const myEmail = String(user?.email || '').trim().toLowerCase();

        const isMyReward =
            (myId && (rEmployeeId === myId || rUserId === myId || rEmpId === myId)) ||
            (myUid && (rEmployeeId === myUid || rUserId === myUid || rEmpId === myUid)) ||
            (myUserId && (rEmployeeId === myUserId || rUserId === myUserId || rEmpId === myUserId)) ||
            (myEmail && (rEmployeeId === myEmail || rUserId === myEmail || rEmpId === myEmail));

        return isNotQuiz && isMyReward;
    });

    const rawServerHistory = Array.isArray(rewardData) ? rewardData : (rewardData?.history || rewardData?.awards || rewardData?.data || rewardData?.rewards || []);
    const serverTotalPoints = Number(rewardData?.totalPoints || rewardData?.total_points || (Array.isArray(rewardData) ? 0 : rewardData?.points) || 0);

    // 2. Combine with server history, avoiding duplicate quiz entries
    const uniqueHistory = [...dedupedQuizHistory];
    rawServerHistory.forEach(item => {
        const rawTitle = String(item.reward_name || item.rewardName || item.title || '').trim().toLowerCase();
        const cat = String(item.category || '').toUpperCase();
        const isQuiz = cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.includes('quiz') || rawTitle.includes('brain teaser');

        // If it is a quiz record, we only add it if we do not already have local session-wise quiz history
        if (isQuiz && dedupedQuizHistory.length > 0) {
            return;
        }
        uniqueHistory.push(item);
    });

    // 3. Final Point Calculation — Fully Dynamic & Accurate
    // Source 1: Sum of all unique history items, applying month filter if selected
    const filteredUniqueHistory = uniqueHistory.filter(item => {
        if (!dateFilter) return true;
        const d = new Date(item.created_at || item.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateFilter;
    });

    const totalPointsFromHistory = filteredUniqueHistory.reduce((sum, item) => sum + Number(item.points || item.rep || 0), 0);

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
                liveMap.set(targetId, {
                    name,
                    score,
                    rank: s.rank,
                    quiz_points: s.quiz_points || 0,
                    reward_points: s.reward_points || 0
                });
            }
        }
    });

    const sortedLeaderboard = Array.from(liveMap, ([id, data]) => ({ id, ...data }))
        .filter(u => {
            const n = String(u.name || '').toUpperCase();
            return !n.includes('DINESH') && !n.includes('HR') && !n.includes('ADMIN');
        })
        .sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.score - a.score);

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
    let userRank = userEntryIndex >= 0 ? (sortedLeaderboard[userEntryIndex].rank || userEntryIndex + 1) : 0;
    const leaderboardScore = userEntryIndex >= 0 ? sortedLeaderboard[userEntryIndex].score : 0;

    // Final total: Find the highest known points value across all endpoints to ensure we never wrongly display 0
    // If a month filter is applied, only trust the filtered local history points since backend stats are all-time totals
    const finalTotalPoints = dateFilter 
        ? totalPointsFromHistory 
        : (rewardsBackendPoints > 0 ? rewardsBackendPoints : (serverTotalPoints > 0 ? serverTotalPoints : totalPointsFromHistory));
    console.log("=== POINTS DEBUG ===", {
        finalTotalPoints,
        quizUserPoints,
        rewardsBackendPoints,
        leaderboardScore,
        serverTotalPoints,
        totalPointsFromHistory,
        dateFilter
    });

    const localQuizPointsTotal = dedupedQuizHistory.filter(q => {
        const rEmployeeId = String(q.employee_id || '').split(':')[0].trim().toLowerCase();
        const rUserId = String(q.userId || q.user_id || '').split(':')[0].trim().toLowerCase();
        const rEmpId = String(q.empId || '').split(':')[0].trim().toLowerCase();

        const myId = String(user?.employee_id || '').split(':')[0].trim().toLowerCase();
        const myUid = String(user?.uid || '').split(':')[0].trim().toLowerCase();
        const myUserId = String(user?.id || user?.userId || '').split(':')[0].trim().toLowerCase();
        const myEmail = String(user?.email || '').trim().toLowerCase();

        if (!rEmployeeId && !rUserId && !rEmpId) return true;

        return (myId && (rEmployeeId === myId || rUserId === myId || rEmpId === myId)) ||
               (myUid && (rEmployeeId === myUid || rUserId === myUid || rEmpId === myUid)) ||
               (myUserId && (rEmployeeId === myUserId || rUserId === myUserId || rEmpId === myUserId)) ||
               (myEmail && (rEmployeeId === myEmail || rUserId === myEmail || rEmpId === myEmail));
    }).reduce((sum, item) => sum + Number(item.points || item.rep || 0), 0);

    const finalQuizPoints = dateFilter
        ? dedupedQuizHistory.filter(q => {
            const rEmployeeId = String(q.employee_id || '').split(':')[0].trim().toLowerCase();
            const rUserId = String(q.userId || q.user_id || '').split(':')[0].trim().toLowerCase();
            const rEmpId = String(q.empId || '').split(':')[0].trim().toLowerCase();
    
            const myId = String(user?.employee_id || '').split(':')[0].trim().toLowerCase();
            const myUid = String(user?.uid || '').split(':')[0].trim().toLowerCase();
            const myUserId = String(user?.id || user?.userId || '').split(':')[0].trim().toLowerCase();
            const myEmail = String(user?.email || '').trim().toLowerCase();
    
            const isMyReward = (myId && (rEmployeeId === myId || rUserId === myId || rEmpId === myId)) ||
                   (myUid && (rEmployeeId === myUid || rUserId === myUid || rEmpId === myUid)) ||
                   (myUserId && (rEmployeeId === myUserId || rUserId === myUserId || rEmpId === myUserId)) ||
                   (myEmail && (rEmployeeId === myEmail || rUserId === myEmail || rEmpId === myEmail));

            if (!isMyReward) return false;

            const d = new Date(q.created_at || q.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateFilter;
        }).reduce((sum, item) => sum + Number(item.points || 0), 0)
        : Math.max(quizUserPoints || 0, localQuizPointsTotal, userEntryIndex >= 0 ? (sortedLeaderboard[userEntryIndex].quiz_points || 0) : 0);

    const userName = user?.name || user?.employee_name || 'You';
    // If user has points but wasn't explicitly found in the leaderboard array, calculate rank dynamically
    if (userRank === 0 && finalQuizPoints > 0) {
        sortedLeaderboard.push({ id: myId, name: userName, score: finalQuizPoints, rank: sortedLeaderboard.length + 1 });
        sortedLeaderboard.sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.score - a.score);
        const dynamicIndex = sortedLeaderboard.findIndex(e => String(e.id || '').split(':')[0] === myId);
        userRank = dynamicIndex >= 0 ? (sortedLeaderboard[dynamicIndex].rank || dynamicIndex + 1) : 0;
    }

    // Prefer the explicitly fetched backend rewards rank, fallback to dynamically computed userRank
    const finalRank = rewardsBackendRank && rewardsBackendRank > 0 ? rewardsBackendRank : userRank;
    // Calculate total endorsements accurately by counting the number of actual rewards (non-quiz) the user received
    const myRewards = uniqueHistory.filter(item => {
        const rawTitle = String(item.reward_name || item.rewardName || item.title || '').trim().toLowerCase();
        const cat = String(item.category || '').toUpperCase();
        return !(cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.includes('quiz') || rawTitle.includes('brain teaser'));
    });
    const myFilteredRewards = myRewards.filter(item => {
        if (!dateFilter) return true;
        const d = new Date(item.created_at || item.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateFilter;
    });
    const finalEndorsements = dateFilter
        ? myFilteredRewards.length
        : Math.max(myRewards.length, backendEndorsements || 0);

    const stats = {
        rank: finalRank > 0 ? finalRank : 'N/A',
        points: finalQuizPoints,
        total_points: finalTotalPoints,
        endorsements: finalEndorsements,
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
                Promise.resolve({ ok: false }) // Disabled to fix 404: fetch(`${BASE_URL}/api/quizzes/history?userId=${memberId}`, { headers }).catch(() => null)
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
                            points: q.points || q.score || 0,
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
            const rewardObj = activeGrantOptions.find(o => o.id === selectedRewardId);
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

    const startFilter = null;
    const endFilter = null;

    const getGrantorCategory = (r) => {
        const name = String(r.title || r.award_name || r.reward_name || r.awardName || '').toUpperCase();
        const cat = String(r.category || '').trim().toUpperCase();

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

        const isHrFallback = rRole.includes('HR') || rRole.includes('ADMIN') || rRole.includes('RECRUIT');
        if (isHrFallback) return 'HR';

        const isPmFallback = rRole.includes('PM') || rRole.includes('PROJECT');
        if (isPmFallback) return 'PM';

        const isTlFallback = rRole.includes('TL') || rRole.includes('LEAD') || rRole.includes('MANAGER');
        if (isTlFallback) return 'TL';

        // Fallback to explicit reward category if grantor is missing or role could not be parsed
        if (cat === 'HR' || cat === 'ADMIN' || cat === 'GAME' || cat === 'HR & GAME' || cat === 'QUIZ' || cat === 'FUN QUIZ GAME' || name.includes('QUIZ')) return 'HR';
        if (cat === 'PM') return 'PM';
        if (cat === 'TL') return 'TL';
        
        if (rCat === 'HR' || rCat === 'ADMIN' || rCat === 'GAME') return 'HR';
        if (rCat === 'PM') return 'PM';
        if (rCat === 'TL') return 'TL';

        return 'HR';
    };

    const filteredAllRewards = uniqueHistory.filter(r => {
        if (!dateFilter) return true;
        const d = new Date(r.created_at || r.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateFilter;
    });

    const pmList = filteredAllRewards.filter(r => getGrantorCategory(r) === 'PM');
    const tlList = filteredAllRewards.filter(r => getGrantorCategory(r) === 'TL');

    const quizItemsForHR = dedupedQuizHistory.filter(q => {
        if (!dateFilter) return true;
        const d = new Date(q.created_at || q.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateFilter;
    });

    const hrList = [...filteredAllRewards.filter(r => getGrantorCategory(r) === 'HR'), ...quizItemsForHR].sort((a, b) => {
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
                    <BackButton onClick={onBack} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '1000', color: '#0B1E3F' }}>Awards & recognition</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: '800' }}>Excellence recognized at Nbt hub</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '8px 14px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>Date:</span>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            style={{
                                border: 'none', outline: 'none', fontSize: '12px', fontWeight: '900',
                                color: '#0B1E3F', backgroundColor: 'transparent', cursor: 'pointer',
                                padding: '3px 4px'
                            }}
                        />
                        {dateFilter && (
                            <button
                                onClick={() => setDateFilter('')}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '12px', fontWeight: '900' }}
                                title="Clear filter"
                            >
                                ✕
                            </button>
                        )}
                    </div>

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
                        <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px', whiteSpace: 'nowrap' }}>{loading ? 'Calculating...' : (stats.rank !== 'N/A' ? `${stats.rank}${getRankSuffix(stats.rank)} Position` : 'Unranked')}</div>
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
                    <div style={{ fontSize: '8px', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Total Points</div>
                    <div style={{ fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '1000', marginTop: '2px', color: '#FBBC05', display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'flex-start' : 'flex-end', gap: '6px' }}>
                        {stats.total_points} <Star size={14} fill="#FBBC05" color="#FBBC05" />
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
                        {tlList.map((item, idx) => <RewardCard key={idx} item={item} color="#701a75" bg="#fdf4ff" employees={employees} leaderboard={sortedLeaderboard} />)}
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
                        {pmList.map((item, idx) => <RewardCard key={idx} item={item} color="#0369a1" bg="#f0f9ff" employees={employees} leaderboard={sortedLeaderboard} />)}
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
                                        return sum + (Number(aw.points || aw.rep || 0));
                                    }, 0);
                                    return `${totalHrPoints} REP TOTAL`;
                                })()}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
                        {hrList.length > 0 ? (
                            hrList.map((aw, i) => {
                                const rawTitle = String(aw.title || aw.award_name || aw.reward_name || aw.awardName || '').trim();
                                const cat = String(aw.category || '').toUpperCase();
                                const isQuiz = cat === 'FUN QUIZ GAME' || cat === 'QUIZ' || rawTitle.toLowerCase().includes('points earned by quiz') || rawTitle.toLowerCase().includes('quiz');
                                const displayTitle = rawTitle || 'Achievement';

                                const recipientId = String(aw.userId || aw.user_id || aw.employee_id || '').split(':')[0].trim().toLowerCase();
                                const recipientNameObj = employees.find(e => String(e.id || e.employee_id || e.userId || '').split(':')[0].trim().toLowerCase() === recipientId);
                                const recipientName = recipientNameObj ? (recipientNameObj.name || recipientNameObj.employee_name || recipientNameObj.userName) : `Employee ${aw.userId || ''}`;

                                const recipientLbEntry = sortedLeaderboard.find(l => String(l.id).toLowerCase() === recipientId);
                                const rank = recipientLbEntry ? recipientLbEntry.rank : null;

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -3, scale: 1.01, boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        style={{
                                            backgroundColor: isQuiz ? '#fffbeb' : '#fcfdfe',
                                            padding: '15px', borderRadius: '18px',
                                            border: `1px solid ${isQuiz ? '#fef3c7' : '#dcfce7'}`,
                                            position: 'relative',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {isQuiz && <div style={{ position: 'absolute', top: '8px', right: '8px' }}><Zap size={12} color="#eab308" fill="#eab308" /></div>}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingRight: isQuiz ? '15px' : '0' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{displayTitle}</div>

                                            </div>
                                            <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', flexShrink: 0 }}>
                                                {aw.created_at || aw.date ? new Date(aw.created_at || aw.date).toLocaleDateString() : 'Recent'}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: '1000', color: isQuiz ? '#d97706' : '#15803d', marginTop: '8px' }}>
                                            +{aw.rep || aw.points} REP POINTS
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '800', border: '1.5px dashed #e2e8f0', borderRadius: '15px' }}>No HR or Quiz records found.</div>}
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
                                        const rank = entry.rank || (idx + 1);
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
                                                    <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                                        {entry.score}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                        <span style={{ color: '#16A34A' }}>{entry.quiz_points} QUIZ</span>
                                                        {entry.reward_points > 0 && (
                                                            <>
                                                                <span style={{ color: '#CBD5E1' }}>|</span>
                                                                <span style={{ color: '#16A34A' }}>{entry.reward_points} REWARDS</span>
                                                            </>
                                                        )}
                                                    </div>
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


        </motion.div>
    );
};

export default AwardsScreen;
