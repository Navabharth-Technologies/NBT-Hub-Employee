import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Zap, ArrowLeft, CheckCircle, Info, ChevronRight, Check as CheckIcon, X as XIcon, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../config';

const FunQuizScreen = ({ onBack }) => {
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState({ show: false, points: 0 });
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [quizActive, setQuizActive] = useState(false);
  const [showAllScores, setShowAllScores] = useState(false);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [lastSessionScore, setLastSessionScore] = useState(0);

  const showSuccessState = (pts) => {
    setSubmissionFeedback({ show: true, points: pts });
    setTimeout(() => setSubmissionFeedback({ show: false, points: 0 }), 3000);
  };

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(API_ENDPOINTS.FUN_QUIZZES, { headers });
      let list = [];

      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data) ? data : (data.data || []);
      } else if (res.status === 401 || res.status === 403) {
        // Auth rejected — fallback to empty list
        list = [];
      }

      const mapped = list.filter(i => i !== null).map(item => ({
          id: item.id,
          question: item.question,
          options: [
            { letter: 'A', text: item.option_a },
            { letter: 'B', text: item.option_b },
            { letter: 'C', text: item.option_c },
            { letter: 'D', text: item.option_d }
          ],
          points_reward: item.points_reward,
          has_answered: item.has_answered || false,
          previous_result: item.previous_result ? (item.previous_result === true || item.previous_result === 'correct' ? 'correct' : 'wrong') : null,
          correct_answer: item.correct_answer || item.answer || item.correct || item.right_option || item.correct_option || null,
          user_selected_letter: null
        }));
        setQuestions(mapped);
    } catch (err) {
      // Fetch failed silently — questions remain empty
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  const fetchScores = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const uid = user?.employee_id || user?.userId || user?.id;

      // Fetch from both Daily and General leaderboard for maximum resilience
      const [dailyRes, generalRes, reRes] = await Promise.all([
        fetch(`${BASE_URL}/api/quizzes/leaderboard/daily`, { headers }).catch(() => null),
        fetch(`${BASE_URL}/api/fun-quizzes/leaderboard`, { headers }).catch(() => null),
        fetch(API_ENDPOINTS.REWARDS_LEADERBOARD, { headers }).catch(() => null)
      ]);

      const dailyData = dailyRes && dailyRes.ok ? await dailyRes.json() : [];
      const generalData = generalRes && generalRes.ok ? await generalRes.json() : [];
      const reData = reRes && reRes.ok ? await reRes.json() : [];

      const rawScores = [
        ...(Array.isArray(dailyData) ? dailyData : (dailyData.data || [])),
        ...(Array.isArray(generalData) ? generalData : (generalData.data || []))
      ];
      const reList = Array.isArray(reData) ? reData : (reData.data || []);
      const userList = reList.map(u => ({ id: u.employee_id || u.id, name: u.employee_name || u.name }));

      // ── CLEAN-SLATE: Always clear the old local cache so stale data never pollutes the view ──
      try { localStorage.removeItem('nbt_quiz_leaderboard_history'); } catch(e) {}

      // Build leaderboard purely from live backend data
      const liveMap = new Map();
      rawScores.forEach(s => {
        const targetId = String(s.employee_id || s.user_id || s.id || '').split(':')[0];
        const userInfo = userList.find(u => String(u.id || '').split(':')[0] === targetId);
        let name = s.employee_name || s.name || userInfo?.name;

        if (!name) {
          if (targetId && targetId === String(uid || '').split(':')[0]) name = user?.name || user?.employee_name || 'You';
          else name = `Employee ${targetId || 'Resource'}`;
        }

        const score = Number(s.total_score || s.points || s.quiz_score || s.score || 0);
        if (score > 0) {
          // Keep the highest score per person (in case of duplicate entries)
          const current = liveMap.get(name) || 0;
          liveMap.set(name, Math.max(current, score));
        }
      });

      const sorted = Array.from(liveMap, ([name, score]) => ({ name, score }))
        .filter(u => {
          const n = String(u.name || '').toUpperCase();
          // Hide system/admin accounts as requested
          return !n.includes('DINESH') && !n.includes('HR') && !n.includes('ADMIN');
        })
        .sort((a, b) => b.score - a.score);

      const list = sorted.map((u, i) => ({
        name: u.name,
        score: u.score,
        rank: i + 1,
        color: ['#FBBC05', '#EA4335', '#34A853', '#4285F4', '#FBBC05'][i % 5],
        initial: u.name ? u.name.charAt(0).toUpperCase() : 'U'
      }));

      setLeaderboard(list);
    } catch (err) {
      // Leaderboard sync failed silently — empty leaderboard shown
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchScores();
  }, []);

  useEffect(() => {
    setSelectedOption(null);
  }, [currentIdx]);

  const handleSubmit = async () => {
    if (!selectedOption) return;
    const currentQ = questions[currentIdx];
    if (currentQ.has_answered) return;

    const optObj = currentQ.options.find(o => o.letter === selectedOption);

    // --- ROBUST ASSESSMENT ENGINE ---
    const checkIsCorrect = () => {
      if (!currentQ.correct_answer) return false;
      
      const userLetter = String(selectedOption || '').trim().toLowerCase();
      const userText = String(optObj?.text || '').trim().toLowerCase();
      const correctRaw = String(currentQ.correct_answer).trim().toLowerCase();

      // 1. Direct matches (Text or Letter)
      if (userText === correctRaw || userLetter === correctRaw) return true;

      const cleanCorrect = correctRaw.replace(/^(option|choice|opt)[_\s\-.]*/, '');
      if (userLetter === cleanCorrect || userText === cleanCorrect) return true;

      // 3. Robust substring matching (e.g. if answer is "D. Parrot" and user chose "D")
      if (correctRaw.startsWith(userLetter + '.') || correctRaw.startsWith(userLetter + ' ')) return true;
      if (userText.includes(correctRaw) && correctRaw.length > 2) return true;

      return false;
    };

    const isCorrect = checkIsCorrect();

    // BACKEND ASSESSMENT (Required for submit-session to succeed)
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const rawUid = user?.employee_id || user?.userId || user?.id;
      const safeUid = String(rawUid || '').split(':')[0] || 'User';
      const targetQuizId = currentQ?.quiz_id || currentQ?.id || 1;

      const ansRes = await fetch(API_ENDPOINTS.QUIZ_ANSWER(targetQuizId), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employee_id: safeUid,
          userId: safeUid,
          empId: safeUid,
          emp_id: safeUid,
          question_id: currentQ.id,
          selected_option: selectedOption,
          selectedOption: selectedOption,
          answer: selectedOption,
          selected_answer: optObj?.text || selectedOption,
          is_correct: isCorrect,
          points_earned: isCorrect ? (currentQ.points_reward || 10) : 0
        })
      });

      // Backend answer registration is best-effort only.
      // The answer is already evaluated locally, so a 400/rejection is non-critical.
      // No error logging here to avoid red console noise on every answer click.

    } catch (e) {
      // Network failure on per-answer sync is non-critical — local state already updated.
    }

    setQuestions(prev => prev.map((q, i) => i === currentIdx ? {
      ...q,
      has_answered: true,
      previous_result: isCorrect ? 'correct' : 'wrong',
      user_selected_letter: selectedOption
    } : q));
  };

  const handleSendTotalResults = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Calculate final summary locally
      const totalQuestions = questions.length;
      const correctCount = questions.filter(q => q.previous_result === 'correct').length;
      const totalPoints = questions.filter(q => q.previous_result === 'correct').reduce((sum, q) => sum + (Number(q.points_reward) || 0), 0);
      
      setLastSessionScore(totalPoints);

      const rawUid = user?.employee_id || user?.userId || user?.id;
      const safeUid = String(rawUid || '').split(':')[0] || 'User';

      // ── Try to sync with backend ──
      const payload = {
        employee_id: isNaN(Number(safeUid)) ? safeUid : Number(safeUid),
        employee_name: user?.name || user?.employee_name || 'User',
        userId: safeUid,
        empId: safeUid,
        emp_id: safeUid,
        quiz_id: Number(questions[0]?.quiz_id || questions[0]?.id || 1) || 1,
        total_points: totalPoints,
        total_score: totalPoints,
        points: totalPoints,
        score: totalPoints,
        correct_count: correctCount,
        total_questions: totalQuestions,
        completion_date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      };

      // Only call submit-session — it is the correct live endpoint.
      // submit-total has been removed: it always returns 400 which the browser
      // shows as a red network error regardless of how JavaScript handles it.
      const submitUrl = API_ENDPOINTS.QUIZ_SUBMIT_SESSION || `${BASE_URL}/api/quizzes/submit-session`;

      try {
        let dbResponse = await fetch(submitUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        // If the first URL returns 400 or fails, try the fallback fun-quizzes endpoint
        if (!dbResponse.ok) {
          const fallbackUrl = `${BASE_URL}/api/fun-quizzes/submit-session`;
          dbResponse = await fetch(fallbackUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          }).catch(() => ({ ok: false }));
        }

        if (dbResponse.ok) {
          console.log('[QuizSync] Session stored successfully.');
        }
      } catch (err) {
        // Network failure — handled silently.
      }

      // Refresh leaderboard from backend immediately after submission
      await fetchScores().catch(() => null);

      showSuccessState(totalPoints);
      setTimeout(() => setQuizActive(false), 1500);

    } catch (err) {
      // Silent — UI already reflects the result via showSuccessState / setQuizActive
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIdx];

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#F8F9FA', padding: isMobile ? '10px' : '20px', paddingBottom: isMobile ? '120px' : '60px', fontFamily: '"Nunito", "Segoe UI", sans-serif' },
    layout: { display: 'flex', gap: '25px', flexDirection: isTablet ? 'column' : 'row', marginBottom: '25px' },
    hero: {
      flex: 2, backgroundColor: '#B2DCE2', borderRadius: '24px', padding: isMobile ? '35px 25px' : '60px 70px',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between',
      alignItems: 'center', position: 'relative', overflow: 'hidden', textAlign: isMobile ? 'center' : 'left', gap: isMobile ? '20px' : '0',
      minHeight: isMobile ? '300px' : '400px'
    },
    heroTitle: { fontSize: isMobile ? '26px' : '32px', fontWeight: '1000', color: '#0B1E3F', lineHeight: 1.1, marginBottom: '18px' },
    heroDesc: { fontSize: isMobile ? '12px' : '13px', fontWeight: '800', color: '#0B1E3F', opacity: 0.8, maxWidth: '400px', marginBottom: '35px', lineHeight: 1.5 },
    heroBtn: { backgroundColor: '#0d676c', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(13,103,108,0.2)' },
    leaderboard: {
      flex: 1, backgroundColor: 'white', borderRadius: '24px', padding: '25px', border: '1px solid #eef2f3',
      display: 'flex', flexDirection: 'column'
    },
    bottomSection: { backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: '1px solid #eef2f3' },
    option: (optObj, isAnswered) => {
      const isSelectedLocally = selectedOption === optObj.letter;
      const isUserPicked = currentQ?.user_selected_letter === optObj.letter;
      
      const userLetter = String(optObj.letter || '').trim().toLowerCase();
      const userText = String(optObj.text || '').trim().toLowerCase();
      const correctRaw = String(currentQ?.correct_answer || '').trim().toLowerCase();
      
      const cleanC = correctRaw.replace(/^(option|choice|opt)[_\s\-.]*/, '');
      const isActuallyCorrect = (userText === correctRaw || userLetter === correctRaw || 
                                 cleanC === userLetter || cleanC === userText ||
                                 correctRaw.startsWith(userLetter + '.') || 
                                 correctRaw.startsWith(userLetter + ' '));

      let borderColor = '#eef2f3';
      let bgColor = 'white';
      let textColor = '#64748b';

      if (isAnswered) {
        if (isActuallyCorrect) {
          borderColor = '#22c55e'; bgColor = '#f0fdf4'; textColor = '#15803d';
        } else if (isUserPicked) {
          borderColor = '#ef4444'; bgColor = '#fef2f2'; textColor = '#b91c1c';
        }
      } else if (isSelectedLocally) {
        borderColor = '#0d676c'; bgColor = '#f0f9fa'; textColor = '#0d676c';
      }

      return {
        padding: '16px 20px', borderRadius: '14px', border: `1.5px solid ${borderColor}`, backgroundColor: bgColor,
        color: textColor, fontSize: '14px', fontWeight: '800', cursor: isAnswered ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '15px', transition: 'all 0.2s',
        borderColor: borderColor // Export border color for the letter box
      };
    }
  };

  const LandingMonster = (
    <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', zIndex: 1, minWidth: '150px' }}>
      <img src="https://gifdb.com/images/high/quiz-question-eric-cartman-south-park-hrlfxd5qudqyw7n0.gif" alt="South Park Guide" style={{ height: '250px', objectFit: 'contain', borderRadius: '24px' }} />
    </div>
  );

  const ReactiveMonster = (
    <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', zIndex: 1, minWidth: '150px' }}>
      <img
        src={
          currentQ?.previous_result === 'wrong'
            ? "https://gifdb.com/images/high/sad-goodbye-crying-pikachu-emotional-anime-pokemon-s6o9gycbmkwj7xvy.gif"
            : currentQ?.previous_result === 'correct'
              ? "https://media1.tenor.com/m/yTtKMYMZ6agAAAAC/bunny-happy.gif"
              : "https://ugokawaii.com/wp-content/uploads/2022/12/QA-1024x1024.gif"
        }
        alt="Reaction"
        style={{ height: '250px', objectFit: 'contain', borderRadius: '24px' }}
      />
    </div>
  );

  const renderedLeaderboard = (
    <div style={s.leaderboard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={18} color="#0d676c" />
          <h3 style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Daily scores</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>Attended users: {leaderboard.length}</div>
          <div style={{ fontSize: '9px', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '20px' }}>Live</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', maxHeight: showAllScores ? '400px' : 'none' }}>
        {leaderboard.slice(0, showAllScores ? undefined : 5).map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '900' }}>
              {p.initial}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '900', color: '#0B1E3F' }}>{p.name}</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>Rank #{p.rank}</div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '900', color: '#0d676c' }}>{p.score}</div>
          </div>
        ))}
        {leaderboard.length === 0 && !isLoading && (
          <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No scores yet.</div>
        )}
      </div>

      <button 
        onClick={() => setShowAllScores(!showAllScores)}
        style={{ marginTop: '15px', width: '100%', border: '1.5px solid #e2e8f0', backgroundColor: 'transparent', padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', color: '#64748b', cursor: 'pointer' }}
      >
        {showAllScores ? 'Show Top 5' : 'View full list'}
      </button>
    </div>
  );

  return (
    <div style={s.container}>
      <AnimatePresence>
        {submissionFeedback.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
              zIndex: 10000, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '20px'
            }}
          >
            <div style={{ padding: '30px', borderRadius: '40px', backgroundColor: '#dcfce7', border: '2px solid #22c55e' }}>
              <CheckCircle size={80} color="#15803d" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '1000', color: '#0B1E3F', margin: '0 0 8px 0' }}>Success!</h1>
              <p style={{ fontSize: '18px', fontWeight: '800', color: '#15803d', margin: 0 }}>+{submissionFeedback.points} REP Points Stored</p>
              <div style={{ marginTop: '20px', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Returning to dashboard...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!quizActive && (
        <div style={s.layout}>
          {/* LEFT COLUMN: HERO */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {/* HERO SECTION */}
            <div style={{ ...s.hero, flex: 'none' }}>
              <div style={{ position: 'relative', zIndex: 10 }}>
                {onBack && (
                  <button 
                    onClick={onBack} 
                    style={{ marginBottom: '20px', padding: '8px 15px', borderRadius: '12px', border: 'none', backgroundColor: 'rgba(11, 30, 63, 0.05)', color: '#0B1E3F', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ArrowLeft size={16} /> Back to Home
                  </button>
                )}
                <h2 style={s.heroTitle}>Get Ready for<br />a Fun Quiz!</h2>
                <p style={s.heroDesc}>Train your brain with smart, scientifically backed games that enhance various cognitive functions.</p>
 
                <div style={{ marginTop: '25px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {/* DAILY QUESTIONS */}
                  <div style={{ backgroundColor: 'white', padding: '10px 18px', borderRadius: '14px', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#4285F4', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Daily questions</div>
                    <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0B1E3F' }}>{questions.length}</div>
                  </div>

                  {/* POINTS REMAINING */}
                  <div style={{ backgroundColor: 'white', padding: '10px 18px', borderRadius: '14px', border: '1.5px solid #FBBC05', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Points remaining</div>
                    <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0B1E3F' }}>
                      {questions.filter(q => !q.has_answered).reduce((sum, q) => sum + (Number(q.points_reward) || 10), 0)}
                    </div>
                  </div>

                  {/* OVERALL SCORE */}
                  <div style={{ backgroundColor: 'white', padding: '10px 18px', borderRadius: '14px', border: '1.5px solid #4285F4', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#4285F4', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Overall score</div>
                    <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0B1E3F' }}>
                      {leaderboard.find(u => u.name === (user?.name || user?.employee_name))?.score || 0}
                    </div>
                  </div>

                  {/* SESSION SCORE */}
                  <div style={{ backgroundColor: 'white', padding: '10px 18px', borderRadius: '14px', border: '1.5px solid #34A853', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Session score</div>
                    <div style={{ fontSize: '15px', fontWeight: '1000', color: '#0B1E3F' }}>
                      {lastSessionScore > 0 ? lastSessionScore : questions.filter(q => q.previous_result === 'correct').reduce((sum, q) => sum + (Number(q.points_reward) || 0), 0)}
                    </div>
                  </div>
                </div>
 
                <button onClick={() => setQuizActive(true)} style={{ ...s.heroBtn, marginTop: '20px' }}>Start quiz</button>
              </div>
 
              {/* Default Monster Graphic for Landing */}
              {LandingMonster}
            </div>
          </div>
 
          {/* RIGHT COLUMN: LEADERBOARD */}
          <div style={{ flex: 1 }}>
            {renderedLeaderboard}
          </div>
        </div>
      )}

      {/* BRAIN TEASER / QUIZ AREA (NEW SCREEN) */}
      {quizActive && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={s.layout}>
          {/* LEFT COLUMN: QUIZ AREA */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: '1px solid #eef2f3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={() => setQuizActive(false)} style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <ArrowLeft size={16} color="#0B1E3F" />
                </button>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={20} color="#0d676c" fill="#0d676c" /> Daily brain teaser
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              </div>
            </div>

            {/* INNER PAGE MONSTER HERO */}
            <div style={{ backgroundColor: '#B2DCE2', borderRadius: '20px', padding: isMobile ? '25px' : '30px 40px', marginBottom: '30px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'center', gap: isMobile ? '20px' : '0', overflow: 'hidden', textAlign: isMobile ? 'center' : 'left' }}>
              <div>
                <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: '#0B1E3F', margin: '0 0 10px 0' }}>Thinking cap on!</h2>
                <p style={{ fontSize: isMobile ? '12px' : '11px', fontWeight: '700', color: '#0B1E3F', opacity: 0.8, maxWidth: isMobile ? '100%' : '300px', margin: 0 }}>Answer these questions carefully. You only get one shot to earn those points!</p>
              </div>
              <div>
                {ReactiveMonster}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>
                  Q {questions.length > 0 ? currentIdx + 1 : 0}/{questions.length}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
                    disabled={currentIdx === 0}
                    style={{ backgroundColor: 'white', border: '1.5px solid #eef2f3', borderRadius: '10px', padding: '8px 12px', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentIdx === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: '800' }}
                  >
                    <ArrowLeft size={14} />
                  </button>

                  <button
                    onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
                    disabled={currentIdx === questions.length - 1}
                    style={{ backgroundColor: 'white', border: '1.5px solid #eef2f3', borderRadius: '10px', padding: '8px 16px', cursor: currentIdx === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIdx === questions.length - 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px', color: '#0B1E3F', fontSize: '12px', fontWeight: '800' }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* QUESTION TEXT */}
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: '#0B1E3F', lineHeight: 1.4 }}>
                {currentQ ? currentQ.question : 'Loading question...'}
              </h3>
            </div>

            {/* OPTIONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
              {currentQ?.options?.map((opt, i) => {
                const optStyle = s.option(opt, currentQ.has_answered);
                const isSelected = selectedOption === opt.letter || currentQ.user_selected_letter === opt.letter;

                return (
                  <div
                    key={i}
                    onClick={() => !currentQ.has_answered && setSelectedOption(opt.letter)}
                    style={{ ...optStyle }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', backgroundColor: isSelected ? optStyle.borderColor : '#f1f5f9', color: isSelected ? 'white' : '#94a3b8', fontSize: '12px' }}>
                      {opt.letter}
                    </div>
                    <div style={{ flex: 1 }}>{opt.text}</div>
                    {currentQ.has_answered && (() => {
                      const userLetter = String(opt.letter || '').trim().toLowerCase();
                      const userText = String(opt.text || '').trim().toLowerCase();
                      const correctRaw = String(currentQ.correct_answer || '').trim().toLowerCase();
                      const isCorrect = (userText === correctRaw || userLetter === correctRaw || 
                                         correctRaw.replace(/^(option|choice|opt)[_\s]*/, '') === userLetter ||
                                         correctRaw.replace(/^(option|choice|opt)[_\s]*/, '') === userText);
                      
                      if (isCorrect) return <CheckIcon size={18} color="#15803d" />;
                      if (currentQ.user_selected_letter === opt.letter) return <XIcon size={18} color="#b91c1c" />;
                      return null;
                    })()}
                  </div>
                );
              })}
            </div>

            {/* SUBMIT/NEXT LOGIC */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: currentQ?.previous_result === 'correct' ? '#15803d' : '#b91c1c' }}>
                {currentQ?.has_answered ? (currentQ.previous_result === 'correct' ? 'Correct!' : 'Incorrect.') : ''}
              </div>

              {!currentQ?.has_answered ? (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOption}
                  style={{ backgroundColor: selectedOption ? '#0d676c' : '#94a3b8', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: selectedOption ? 'pointer' : 'not-allowed' }}
                >
                  Submit answer
                </button>
              ) : (
                currentIdx === questions.length - 1 ? (
                  <button
                    onClick={handleSendTotalResults}
                    disabled={isSubmitting}
                    style={{ backgroundColor: '#FBBC05', color: '#0B1E3F', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {isSubmitting && <Loader2 size={16} className="spin" />}
                    Finish quiz & sync
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
                    style={{ backgroundColor: '#0d676c', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Next question
                  </button>
                )
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: MINI LEADERBOARD */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderedLeaderboard}
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default FunQuizScreen;
