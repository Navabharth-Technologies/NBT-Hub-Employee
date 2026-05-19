import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Zap, ArrowLeft, CheckCircle, Info, ChevronRight, Check as CheckIcon, X as XIcon, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../config';

const checkIfCorrect = (optObj, currentQ) => {
  if (!currentQ || !currentQ.correct_answer || !optObj) return false;

  const correct = String(currentQ.correct_answer).trim().toLowerCase();
  const letter = String(optObj.letter).trim().toLowerCase();
  const text = String(optObj.text).trim().toLowerCase();

  // Case 1: Match by letter (e.g. 'a', 'option_a', 'option a', 'option-a')
  if (
    correct === letter ||
    correct === `option_${letter}` ||
    correct === `option ${letter}` ||
    correct === `option-${letter}`
  ) {
    return true;
  }

  // Case 2: Match by text exactly
  if (correct === text) {
    return true;
  }

  // Case 3: Match by text containment (only for longer words to avoid false positive on single characters)
  if (correct.length > 1 && (correct.includes(text) || text.includes(correct))) {
    return true;
  }

  return false;
};

const formatCorrectAnswerText = (currentQ) => {
  if (!currentQ || !currentQ.correct_answer) return 'Not available';
  
  const correctOpt = currentQ.options.find(opt => checkIfCorrect(opt, currentQ));
  if (correctOpt) {
    return `Option ${correctOpt.letter} - ${correctOpt.text}`;
  }
  
  return String(currentQ.correct_answer).trim();
};

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
  const [showFullList, setShowFullList] = useState(false);

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
      const res = await fetch(`${BASE_URL}/api/fun-quizzes`, {
        headers: { 'Authorization': `Bearer ${token?.trim()}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);

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
          already_answered: item.has_answered || false,
          previous_result: item.previous_result ? (item.previous_result === true || item.previous_result === 'correct' ? 'correct' : 'wrong') : null,
          correct_answer: item.correct_answer || item.correct_option || item.correct || item.answer || item.correct_letter || item.correct_choice || item.option_correct || item.correctOption || item.correctAnswer || null,
          user_selected_letter: item.user_selected_letter || item.user_answer || item.selected_option || item.user_selected || item.user_choice || item.selectedOption || item.userChoice || null,
          quiz_id: item.quiz_id || item.id || 1
        }));
        setQuestions(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  const myLeaderboardData = leaderboard.find(s => {
    const cleanSId = String(s.id || '').split(':')[0].trim().toLowerCase();
    const cleanSName = String(s.name || '').split(':')[0].trim().toLowerCase();

    const possibleUserKeys = [
      user?.employee_id,
      user?.userId,
      user?.id,
      user?.uid,
      user?.email,
      user?.name,
      user?.employee_name
    ];

    return possibleUserKeys.some(key => {
      const cleanKey = String(key || '').split(':')[0].trim().toLowerCase();
      return cleanKey && (cleanSId === cleanKey || cleanSName === cleanKey);
    });
  });
  const userLifetimeScore = myLeaderboardData ? (myLeaderboardData.quiz_points || myLeaderboardData.quizPoints || 0) : 0;

  const fetchScores = async () => {
    try {
      const token = localStorage.getItem('token');

      const headers = { 'Authorization': `Bearer ${token?.trim()}` };
      const [rRes, qRes] = await Promise.all([
        fetch(`${BASE_URL}/api/rewards/leaderboard`, { headers }).catch(() => null),
        fetch(`${BASE_URL}/api/quizzes/leaderboard`, { headers }).catch(() => null)
      ]);

      const rData = rRes && rRes.ok ? await rRes.json() : [];
      const qData = qRes && qRes.ok ? await qRes.json() : [];

      const rList = Array.isArray(rData) ? rData : (rData.data || []);
      const qList = Array.isArray(qData) ? qData : (qData.data || []);

      const mergedMap = new Map();

      // Process Quiz points
      qList.forEach(q => {
        const id = String(q.employee_id || q.user_id || q.id || '');
        if (!id) return;
        mergedMap.set(id, {
          id,
          name: q.name || q.employee_name || `Employee ${id}`,
          quizPoints: Number(q.total_score || q.quiz_score || q.total_quiz_points || q.points || 0),
          rewardPoints: 0
        });
      });

      // Process Reward points
      rList.forEach(r => {
        const id = String(r.employee_id || r.user_id || r.id || '');
        if (!id) return;
        const existing = mergedMap.get(id) || {
          id,
          name: r.name || r.employee_name || `Employee ${id}`,
          quizPoints: 0,
          rewardPoints: 0
        };
        // In rewards leaderboard, points are usually in 'points' or 'total_points'
        existing.rewardPoints = Number(r.points || r.total_points || r.reward_points || 0);
        mergedMap.set(id, existing);
      });

      const list = Array.from(mergedMap.values()).map((u, i) => {
        const total = u.quizPoints + u.rewardPoints;
        return {
          id: u.id,
          name: u.name,
          score: total,
          quiz_points: u.quizPoints,
          reward_points: u.rewardPoints,
          color: ['#FBBC05', '#EA4335', '#34A853', '#4285F4', '#FBBC05'][i % 5],
          initial: (u.name || 'U').charAt(0).toUpperCase()
        };
      }).sort((a, b) => b.score - a.score).map((u, i) => ({ ...u, rank: i + 1 }));

      setLeaderboard(list);
    } catch (err) {
      console.error("Leaderboard Sync failed:", err);
    } finally {
      setIsQuestionsLoading(false);
      setIsLoading(false);
    }
  };

  const handleStartToday = () => {
    setQuizActive(true);
    setCurrentIdx(0);
    setSelectedOption(null);
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

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.QUIZ_ANSWER(currentQ.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify({
          selected_option: selectedOption,
          selectedOption: selectedOption,
          user_answer: selectedOption,
          user_selected_letter: selectedOption,
          answer: selectedOption
        })
      });

      let serverCorrect = null;
      let serverIsCorrect = false;

      if (res.ok) {
        const resData = await res.json();
        console.log("Submit Quiz Answer response:", resData);
        serverCorrect = resData.correct_answer || resData.correct_option || resData.correct || resData.correctAnswer || resData.correctOption || resData.answer || resData.correct_letter || null;
        serverIsCorrect = resData.is_correct === true || resData.success === true || resData.isCorrect === true || resData.status === 'correct';
        
        if (serverIsCorrect && !serverCorrect) {
          serverCorrect = selectedOption;
        }
      }

      if (!serverCorrect) {
        const optObj = currentQ.options.find(o => o.letter === selectedOption);
        const isCorrect = checkIfCorrect(optObj, currentQ);
        serverIsCorrect = isCorrect;
      }

      setQuestions(prev => prev.map((q, i) => i === currentIdx ? {
        ...q,
        has_answered: true,
        previous_result: serverIsCorrect ? 'correct' : 'wrong',
        user_selected_letter: selectedOption,
        correct_answer: serverCorrect || q.correct_answer
      } : q));

      // Refresh scores to show progress in Hall of Fame immediately
      fetchScores();
    } catch (err) {
      console.error("Failed to log answer to database:", err);
      
      const optObj = currentQ.options.find(o => o.letter === selectedOption);
      const isCorrect = checkIfCorrect(optObj, currentQ);
      
      setQuestions(prev => prev.map((q, i) => i === currentIdx ? {
        ...q,
        has_answered: true,
        previous_result: isCorrect ? 'correct' : 'wrong',
        user_selected_letter: selectedOption
      } : q));
    }
  };

  const handleSendTotalResults = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      // Calculate final summary locally
      const totalQuestions = questions.length;
      const correctCount = questions.filter(q => q.previous_result === 'correct').length;
      const totalPoints = questions.filter(q => q.previous_result === 'correct').reduce((sum, q) => sum + (q.points_reward || 0), 0);

      const rawUid = user?.employee_id || user?.userId || user?.id || user?.employeeId || user?.uid;
      const uid = String(rawUid).includes(',')
        ? String(rawUid).split(',')[0].split(':')[0].trim()
        : String(rawUid).split(':')[0].trim();

      const payload = {
        employee_id: Number(uid) || uid,
        user_id: Number(uid) || uid,
        points: Number(totalPoints) || 0,
        total_points: Number(totalPoints) || 0,
        score: Number(totalPoints) || 0,
        total_score: Number(totalPoints) || 0,
        correct_count: Number(correctCount) || 0,
        correct_answers: Number(correctCount) || 0,
        total_questions: Number(totalQuestions) || 0,
        total_quizzes: Number(totalQuestions) || 0,
        quiz_count: Number(totalQuestions) || 0,
        attended_count: Number(totalQuestions) || 0,
        quizzes_attended: Number(totalQuestions) || 0,
        quiz_id: Number(questions[0]?.quiz_id || questions[0]?.id || 1),
        completion_date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        status: 'completed'
      };

      const response = await fetch(API_ENDPOINTS.QUIZ_SUBMIT_SESSION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Refresh EVERYTHING to reflect on dashboard
        await Promise.all([fetchScores(), fetchQuestions()]);

        // Brief visual confirmation then redirect
        showSuccessState(totalPoints);
        setTimeout(() => setQuizActive(false), 1500);
      }
    } catch (err) {
      console.error("Batch submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIdx];

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#F8F9FA', padding: isMobile ? '15px' : '30px', fontFamily: '"Nunito", "Segoe UI", sans-serif' },
    layout: { display: 'flex', gap: '25px', flexDirection: isTablet ? 'column' : 'row', marginBottom: '25px' },
    hero: {
      flex: 2, backgroundColor: '#B2DCE2', borderRadius: '24px', padding: isMobile ? '40px 20px' : '60px 50px',
      display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'space-between',
      alignItems: 'center', position: 'relative', overflow: 'hidden', gap: isMobile ? '30px' : '0',
      minHeight: '380px', border: '1.5px solid #000000'
    },
    heroTitle: { fontSize: isMobile ? '24px' : '42px', fontWeight: '900', color: '#0B1E3F', lineHeight: 1.1, marginBottom: '15px', textAlign: isMobile ? 'center' : 'left' },
    heroDesc: { fontSize: isMobile ? '12px' : '16px', fontWeight: '700', color: '#0B1E3F', opacity: 0.8, maxWidth: isMobile ? '100%' : '450px', marginBottom: '25px', lineHeight: 1.5, textAlign: isMobile ? 'center' : 'left' },
    heroBtn: { backgroundColor: '#0d676c', color: 'white', border: 'none', padding: isMobile ? '12px 30px' : '14px 40px', borderRadius: '12px', fontWeight: '800', fontSize: isMobile ? '13px' : '15px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,103,108,0.2)', width: isMobile ? '100%' : 'auto' },
    leaderboard: {
      flex: 1, backgroundColor: 'white', borderRadius: '24px', padding: '35px', border: '1.5px solid #000000',
      display: 'flex', flexDirection: 'column', minHeight: '380px'
    },
    bottomSection: { backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: '1px solid #eef2f3' },
    option: (optObj, isAnswered) => {
      const isUserChoice = (optObj.letter === currentQ?.user_selected_letter || optObj.letter === selectedOption);
      const isActuallyCorrect = checkIfCorrect(optObj, currentQ);

      let border = '1.5px solid #eef2f3';
      let bg = 'white';
      let color = '#64748b';
      let status = 'default';

      if (isAnswered) {
        if (isActuallyCorrect) {
          border = '2.5px solid #22c55e'; bg = '#f0fdf4'; color = '#15803d'; status = 'correct';
        } else if (isUserChoice) {
          border = '2.5px solid #ef4444'; bg = '#fef2f2'; color = '#b91c1c'; status = 'wrong';
        }
      } else if (isUserChoice) {
        border = '2.5px solid #0d676c'; bg = '#f0f9fa'; color = '#0d676c'; status = 'selected';
      }

      return {
        padding: '16px 20px', borderRadius: '14px', border: border, backgroundColor: bg,
        color: color, fontSize: '14px', fontWeight: '800', cursor: isAnswered ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '15px', transition: 'all 0.2s',
        status: status
      };
    }
  };

  const LandingMonster = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', position: 'relative', zIndex: 1, minWidth: isMobile ? '100%' : '150px' }}>
      <img src="https://gifdb.com/images/high/quiz-question-eric-cartman-south-park-hrlfxd5qudqyw7n0.gif" alt="South Park Guide" style={{ height: isMobile ? '180px' : '250px', width: isMobile ? '100%' : 'auto', objectFit: 'contain', borderRadius: '24px' }} />
    </div>
  );

  const ReactiveMonster = (
    <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', alignItems: 'flex-end', position: 'relative', zIndex: 1, minWidth: isMobile ? '100%' : '150px' }}>
      <img
        src={
          currentQ?.previous_result === 'wrong'
            ? "https://gifdb.com/images/high/sad-goodbye-crying-pikachu-emotional-anime-pokemon-s6o9gycbmkwj7xvy.gif"
            : currentQ?.previous_result === 'correct'
              ? "https://media1.tenor.com/m/yTtKMYMZ6agAAAAC/bunny-happy.gif"
              : "https://ugokawaii.com/wp-content/uploads/2022/12/QA-1024x1024.gif"
        }
        alt="Reaction"
        style={{ height: isMobile ? '160px' : '250px', width: isMobile ? '100%' : 'auto', objectFit: 'contain', borderRadius: '24px' }}
      />
    </div>
  );

  const renderedLeaderboard = (
    <div style={s.leaderboard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={18} color="#0d676c" />
          <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Hall of Fame</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: '900', background: '#0d676c', color: 'white', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>QUIZ ACHIEVERS</div>
        </div>
      </div>

      {/* Leaderboard Table Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        padding: '12px 10px',
        borderBottom: '2px solid #f1f5f9',
        fontSize: '10px',
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <span>Name</span>
        <span style={{ textAlign: 'center' }}>Quiz Points</span>
        <span style={{ textAlign: 'right' }}>TOTAL</span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        maxHeight: showFullList ? '450px' : 'auto',
        overflowY: showFullList ? 'auto' : 'visible',
        paddingRight: showFullList ? '10px' : '0'
      }}>
        {(() => {
          const displayList = showFullList ? leaderboard : leaderboard.slice(0, 8);

          if (displayList.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '12px' }}>No rankings available yet</div>;

          return displayList.map((p, i) => {
            const isMe = (() => {
              const cleanPId = String(p.id || p.employee_id || p.userId || '').split(':')[0].trim().toLowerCase();
              const cleanPName = String(p.name || '').split(':')[0].trim().toLowerCase();

              const possibleUserKeys = [
                user?.employee_id,
                user?.userId,
                user?.id,
                user?.uid,
                user?.email,
                user?.name,
                user?.employee_name
              ];

              return possibleUserKeys.some(key => {
                const cleanKey = String(key || '').split(':')[0].trim().toLowerCase();
                return cleanKey && (cleanPId === cleanKey || cleanPName === cleanKey);
              });
            })();
            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                alignItems: 'center',
                padding: '14px 10px',
                borderBottom: '1px solid #f8fafc',
                backgroundColor: isMe ? '#f0f9fa' : 'transparent',
                borderRadius: isMe ? '12px' : '0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    backgroundColor: p.color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '900'
                  }}>
                    {p.initial}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#0B1E3F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                  {p.quiz_points || p.score || 0}
                </div>

                <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '1000', color: '#0B1E3F' }}>
                  {p.score}
                </div>
              </div>
            );
          });
        })()}
      </div>

      <button
        onClick={() => setShowFullList(!showFullList)}
        style={{
          marginTop: '15px', width: '100%', padding: '10px', borderRadius: '12px',
          backgroundColor: '#f8fafc', border: '1px solid #eef2f3', color: '#3B5998',
          fontSize: '11px', fontWeight: '1000', cursor: 'pointer'
        }}
      >
        {showFullList ? 'SHOW TOP 8' : 'VIEW FULL HALL OF FAME'}
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
          {/* LEFT COLUMN: HERO + PAST QUIZZES */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {/* HERO SECTION */}
            <div style={{ ...s.hero, flex: 'none' }}>
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start' }}>
                <h2 style={s.heroTitle}>Get Ready for<br />a Fun Quiz!</h2>
                <p style={s.heroDesc}>Train your brain with smart, scientifically backed games that enhance various cognitive functions.</p>

                <div style={{
                  marginTop: '15px',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '10px',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '10px 16px', borderRadius: '14px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e40af', textTransform: 'uppercase' }}>Daily Questions</div>
                    <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{questions.length}</div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '10px 16px', borderRadius: '14px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#b45309', textTransform: 'uppercase' }}>Points Remaining</div>
                    <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{questions.filter(q => !q.has_answered).reduce((sum, q) => sum + (q.points_reward || 0), 0)}</div>
                  </div>

                  {/* Session score calculation */}
                  {(() => {
                    const sessionScoreForDisplay = questions.filter(q => q.previous_result === 'correct').reduce((sum, q) => sum + (q.points_reward || 0), 0);
                    const newSessionPoints = questions.filter(q => q.previous_result === 'correct' && !q.already_answered).reduce((sum, q) => sum + (q.points_reward || 0), 0);
                    return (
                      <>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '10px 16px', borderRadius: '14px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e40af', textTransform: 'uppercase' }}>Overall Score</div>
                          <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{userLifetimeScore}</div>
                        </div>

                        <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '10px 16px', borderRadius: '14px', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '900', color: '#15803d', textTransform: 'uppercase' }}>Session Score</div>
                          <div style={{ fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{sessionScoreForDisplay}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <button onClick={handleStartToday} style={{ ...s.heroBtn, marginTop: '25px' }}>Start Quiz</button>
              </div>

              {/* Default Monster Graphic for Landing */}
              {LandingMonster}
            </div>

          </div>

          {renderedLeaderboard}
        </div>
      )}

      {/* BRAIN TEASER / QUIZ AREA (NEW SCREEN) */}
      {quizActive && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={s.layout}>
          {/* LEFT COLUMN: QUIZ AREA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: '1px solid #eef2f3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={() => setQuizActive(false)} style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <ArrowLeft size={16} color="#0B1E3F" />
                </button>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={20} color="#0d676c" fill="#0d676c" /> Daily Brain Teaser
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* Header Controls that act as the right-side gap */}
              </div>
            </div>

            {/* INNER PAGE MONSTER HERO */}
            <div style={{
              backgroundColor: '#B2DCE2', borderRadius: '20px', padding: isMobile ? '25px' : '30px 40px',
              marginBottom: '30px', display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden',
              gap: isMobile ? '20px' : '0'
            }}>
              <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                <h2 style={{ fontSize: isMobile ? '26px' : '28px', fontWeight: '900', color: '#0B1E3F', margin: '0 0 10px 0' }}>Thinking Cap On!</h2>
                <p style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: '#0B1E3F', opacity: 0.8, maxWidth: isMobile ? '100%' : '300px', margin: 0 }}>Answer these questions carefully. You only get one shot to earn those points!</p>
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
                    style={{
                      backgroundColor: 'white',
                      border: '1.5px solid #eef2f3',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                      opacity: currentIdx === 0 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: currentIdx > 0 ? '#0B1E3F' : '#64748b',
                      fontSize: '12px',
                      fontWeight: currentIdx > 0 ? '1000' : '800'
                    }}
                  >
                    <ArrowLeft size={14} strokeWidth={currentIdx > 0 ? 3 : 2} />
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

            {isQuestionsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Loader2 className="animate-spin" size={30} color="#0d676c" />
              </div>
            ) : questions.length > 0 && currentQ ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {/* Question Status Banner */}
                  {currentQ.has_answered && (
                    <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: currentQ.previous_result === 'correct' ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${currentQ.previous_result === 'correct' ? '#bbf7d0' : '#fecaca'}` }}>
                      {currentQ.previous_result === 'correct' ? <CheckIcon size={18} color="#15803d" /> : <XIcon size={18} color="#b91c1c" />}
                      <span style={{ fontSize: '14px', fontWeight: '800', color: currentQ.previous_result === 'correct' ? '#15803d' : '#b91c1c' }}>
                        {currentQ.previous_result === 'correct' ?
                          'Excellent! You answered this correctly.' :
                          (() => {
                            const userPicked = currentQ.user_selected_letter || selectedOption;
                            const opt = currentQ.options.find(o => o.letter === userPicked);
                            return `Incorrect. You selected: Option ${userPicked || 'Unknown'}${opt ? ' - ' + opt.text : ''}. The correct answer was: ${formatCorrectAnswerText(currentQ)}`;
                          })()}
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '25px' }}>
                    Q{currentIdx + 1}. "{currentQ.question}"
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '15px' }}>
                    {currentQ.options.map((optObj, i) => {
                      const st = s.option(optObj, currentQ.has_answered);

                      return (
                        <div
                          key={i}
                          style={st}
                          onClick={() => {
                            if (!currentQ.has_answered) setSelectedOption(optObj.letter);
                          }}
                        >
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            backgroundColor: st.status === 'correct' ? '#22c55e' : (st.status === 'wrong' ? '#ef4444' : '#0d676c'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '900'
                          }}>
                            {optObj.letter}
                          </div>
                          {optObj.text}

                          {st.status === 'correct' && (
                            <div style={{ marginLeft: 'auto', backgroundColor: '#22c55e', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900' }}>
                              {(currentQ?.user_selected_letter === optObj.letter || selectedOption === optObj.letter) ? 'CORRECT (YOUR CHOICE)' : 'CORRECT'}
                            </div>
                          )}
                          {st.status === 'wrong' && (
                            <div style={{ marginLeft: 'auto', backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900' }}>YOUR CHOICE</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    {currentQ.has_answered && currentIdx < questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentIdx(prev => prev + 1)}
                        style={{
                          backgroundColor: '#0d676c', color: 'white', border: 'none', padding: '12px 30px',
                          borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(13,103,108,0.2)'
                        }}
                      >
                        Next Question <ChevronRight size={18} />
                      </button>
                    ) : currentQ.has_answered && currentIdx === questions.length - 1 ? (
                      (() => {
                        const isAlreadySubmitted = questions.length > 0 && questions.every(q => q.already_answered);
                        return (
                          <button
                            disabled={isSubmitting || isAlreadySubmitted}
                            onClick={handleSendTotalResults}
                            style={{
                              backgroundColor: isAlreadySubmitted ? '#94a3b8' : '#34A853',
                              color: 'white', border: 'none', padding: '12px 30px',
                              borderRadius: '12px', fontWeight: '900', fontSize: '14px',
                              cursor: (isSubmitting || isAlreadySubmitted) ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: '8px',
                              boxShadow: isAlreadySubmitted ? 'none' : '0 4px 12px rgba(52,168,83,0.2)'
                            }}
                          >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={18} />}
                            {isAlreadySubmitted
                              ? 'Already Submitted'
                              : `Submit Final Score (${questions.filter(q => q.previous_result === 'correct').reduce((sum, q) => sum + (q.points_reward || 0), 0)} pts)`}
                          </button>
                        );
                      })()
                    ) : (
                      <button
                        disabled={currentQ.has_answered || !selectedOption || isSubmitting}
                        onClick={handleSubmit}
                        style={{
                          backgroundColor: currentQ.has_answered || !selectedOption ? '#e2e8f0' : '#0d676c',
                          color: currentQ.has_answered || !selectedOption ? '#94a3b8' : 'white',
                          border: 'none', padding: '12px 30px', borderRadius: '12px',
                          fontWeight: '900', fontSize: '14px',
                          cursor: currentQ.has_answered || !selectedOption || isSubmitting ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          boxShadow: currentQ.has_answered || !selectedOption ? 'none' : '0 4px 12px rgba(13,103,108,0.2)'
                        }}
                      >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        Check Answer
                      </button>
                    )}
                  </div>

                </motion.div>
              </AnimatePresence>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: '800' }}>
                No quizzes available for today.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FunQuizScreen;