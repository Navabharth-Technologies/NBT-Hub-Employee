import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Clock, Star, PlayCircle, Award, CheckCircle, ChevronLeft, Lock, FileText, Download, RefreshCw, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_ENDPOINTS, BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import petal from '../assets/image.png';
import certTemplate from '../assets/certificate_final.png';

export default function CourseScreen() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

    const triggerToast = (msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
    };

    // Completion Tracking (Persistent)
    const [courseProgressMap, setCourseProgressMap] = useState({});

    const currentCourseProgress = courseProgressMap[selectedCourse?.id] || { progress: 0, isPdfDone: false, isTestDone: false };
    const isActuallyComplete = currentCourseProgress.completed === 1 || currentCourseProgress.completed === true || selectedCourse?.completed === 1 || selectedCourse?.completed === true;
    const isVideoDone = isActuallyComplete || currentCourseProgress.progress >= 100;
    const isPdfDone = isActuallyComplete || currentCourseProgress.isPdfDone || currentCourseProgress.is_pdf_done || currentCourseProgress.pdf_done;
    const isTestDone = isActuallyComplete || currentCourseProgress.isTestDone || currentCourseProgress.is_test_done || currentCourseProgress.test_done;
    const [currentView, setCurrentView] = useState(null); 
    const [showCertificate, setShowCertificate] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // New: Video Progression states
    const [canShowMarkButton, setCanShowMarkButton] = useState(false);
    const [testResult, setTestResult] = useState(null); // null, 'pass', 'fail'
    const [videoDurations, setVideoDurations] = useState({});

    useEffect(() => {
        if (courses.length > 0) {
            courses.forEach(course => {
                const videoLink = formatUrl(course.video || course.video_url || course.video_link || course.link);
                if (videoLink && !videoLink.includes('youtube') && !videoLink.includes('vimeo') && !videoDurations[course.id]) {
                    const tempVideo = document.createElement('video');
                    tempVideo.src = videoLink;
                    tempVideo.preload = 'metadata';
                    tempVideo.onloadedmetadata = () => {
                        const mins = Math.floor(tempVideo.duration / 60);
                        const secs = Math.floor(tempVideo.duration % 60);
                        const durationStr = `${mins}m ${secs}s`;
                        setVideoDurations(prev => ({ ...prev, [course.id]: durationStr }));
                        tempVideo.src = ""; // Clean up
                    };
                    tempVideo.onerror = () => {
                        tempVideo.src = ""; // Clean up on error
                    };
                }
            });
        }
    }, [courses]);

    const videoRef = useRef(null);
    const hasResumedRef = useRef(false); // guards against seeking more than once per video open

    // Reset the resume guard whenever the user opens a different video
    useEffect(() => {
        hasResumedRef.current = false;
    }, [selectedCourse?.id, currentView]);

    const markCourseAsComplete = async (courseId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const uid = user?.employee_id || user?.id;
            const res = await fetch(API_ENDPOINTS.COURSE_PROGRESS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token?.trim()}`
                },
                body: JSON.stringify({
                    courseId,
                    completed: true,
                    userId: uid
                })
            });

            if (res.ok) {
                setCourses(prev => prev.map(c =>
                    c.id === courseId ? { ...c, completed: 1 } : c
                ));
                setCourseProgressMap(prev => ({
                    ...prev,
                    [courseId]: { ...prev[courseId], completed: 1, progress: 100 }
                }));
                triggerToast("Congratulations! Your certificate has been sent to your email.");
            }
        } catch (err) {
            console.error('Completion Sync Error:', err);
            triggerToast("Failed to sync completion. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    const updateProgress = async (courseId, progress, extraFlags = {}) => {
        try {
            const token = localStorage.getItem('token');
            const uid = user?.employee_id || user?.id;
            if (!uid) return;

            setCourseProgressMap(prev => ({
                ...prev,
                [courseId]: {
                    ...(prev[courseId] || { progress: 0, isPdfDone: false, isTestDone: false }),
                    progress,
                    ...extraFlags
                }
            }));

            await fetch(API_ENDPOINTS.COURSE_PROGRESS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token?.trim()}`
                },
                body: JSON.stringify({
                    courseId,
                    userId: uid,
                    progress,
                    ...extraFlags
                })
            });

            if (extraFlags.isTestDone) {
                await markCourseAsComplete(courseId);
            }
        } catch (err) {
            console.error('Progress Sync Failed:', err);
        }
    };

    // Blast Particles
    const particles = Array.from({ length: 80 });

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);

        fetchCourses();
        fetchProgress(); // Fetch persistent progress from backend

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (user?.employee_id || user?.id) {
            fetchProgress();
        }
    }, [user]);

    const fetchProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const uid = user?.employee_id || user?.id;
            if (!uid) return;

            // Fetch from user_courses table (primary) and courses/progress (fallback)
            const [ucRes, cpRes] = await Promise.all([
                fetch(`${API_ENDPOINTS.USER_COURSES}?userId=${uid}`, {
                    headers: { 'Authorization': `Bearer ${token?.trim()}` }
                }).catch(() => null),
                fetch(`${API_ENDPOINTS.COURSE_PROGRESS}?userId=${uid}`, {
                    headers: { 'Authorization': `Bearer ${token?.trim()}` }
                }).catch(() => null)
            ]);

            const map = {};

            // Parse user_courses data (has completion_date and verified)
            if (ucRes && ucRes.ok) {
                try {
                    const ucResult = await ucRes.json();
                    const ucData = ucResult.data || ucResult;
                    const ucList = Array.isArray(ucData) ? ucData : (ucData && typeof ucData === 'object' ? Object.values(ucData) : []);
                    ucList.forEach(item => {
                        const cid = item.courseId || item.course_id || item.id;
                        if (cid) {
                            map[cid] = {
                                ...map[cid],
                                ...item,
                                completion_date: item.completion_date || item.completed_at || item.completed_date || item.completionDate || null,
                                verified: item.verified ?? item.is_verified ?? item.verified_status ?? null,
                                verified_at: item.verified_at || item.verified_date || null
                            };
                        }
                    });
                } catch (e) {
                    console.warn('user_courses parse error:', e);
                }
            }

            // Parse course progress data (merge with existing)
            if (cpRes && cpRes.ok) {
                try {
                    const cpResult = await cpRes.json();
                    const cpData = cpResult.data || cpResult;
                    if (Array.isArray(cpData)) {
                        cpData.forEach(item => {
                            const cid = item.courseId || item.course_id;
                            if (cid) {
                                map[cid] = {
                                    ...item,
                                    ...map[cid], // user_courses data takes priority
                                    // Preserve completion_date and verified from user_courses
                                    completion_date: map[cid]?.completion_date || item.completion_date || item.completed_at || item.completed_date || null,
                                    verified: map[cid]?.verified ?? item.verified ?? item.is_verified ?? null
                                };
                            }
                        });
                    } else if (cpData && typeof cpData === 'object') {
                        Object.keys(cpData).forEach(key => {
                            map[key] = {
                                ...cpData[key],
                                ...map[key],
                                completion_date: map[key]?.completion_date || cpData[key]?.completion_date || cpData[key]?.completed_at || null,
                                verified: map[key]?.verified ?? cpData[key]?.verified ?? null
                            };
                        });
                    }
                } catch (e) {
                    console.warn('course_progress parse error:', e);
                }
            }

            console.log("Synchronized Progress Map (with user_courses):", map);
            setCourseProgressMap(map);
        } catch (err) {
            console.error('Progress Synchronization Error:', err);
        }
    };

    useEffect(() => {
        localStorage.setItem('courseProgressRecords', JSON.stringify(courseProgressMap));
    }, [courseProgressMap]);

    const fetchCourses = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.COURSES);
            if (res.ok) {
                const data = await res.json();
                console.log("Fetched Courses:", data);
                setCourses(data);

                // Deep Link: Resume course if passed via state
                if (location.state?.resumeCourseId) {
                    const target = data.find(c => c.id === location.state.resumeCourseId);
                    if (target) {
                        setSelectedCourse(target);
                        // Also clear state to prevent re-opening on reload
                        window.history.replaceState({}, document.title);
                    }
                }
            }
        } catch (e) {
            console.error("Courses API Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const formatUrl = (path) => {
        if (!path || typeof path !== 'string') return null;

        let finalPath = path;

        // Handle explicit localhost paths from DB
        if (finalPath.includes('localhost:5000')) {
            finalPath = finalPath.replace(/http:\/\/localhost:5000/g, BASE_URL);
        }

        // If it's a Google Drive stream from the backend
        if (finalPath.includes('/api/drive/stream/')) {
            const streamId = finalPath.split('/api/drive/stream/')[1];
            return `${BASE_URL}/api/drive/stream/${streamId}`;
        }

        // If it's an upload from the backend
        if (finalPath.includes('/uploads/') || finalPath.includes('\\uploads\\')) {
            const fileName = finalPath.split(/[\\\/]upload[s]?[\\\/]/i).pop().replace(/^.*[\\\/]/, '');
            return `${BASE_URL}/uploads/${fileName}`;
        }

        if (finalPath.startsWith('http')) return finalPath;

        const fileName = finalPath.split(/[\\\/]upload[s]?[\\\/]/i).pop().replace(/^.*[\\\/]/, '');
        return `${BASE_URL}/uploads/${fileName}`;
    };


    const s = {
        container: { backgroundColor: '#f8fafc', minHeight: '100vh', padding: winWidth < 768 ? '20px' : '40px', fontFamily: "'Inter', sans-serif" },
        main: { maxWidth: '100%', margin: '0' },
        headerSection: { marginBottom: '35px', display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 768 ? 'flex-start' : 'center', gap: winWidth < 768 ? '20px' : '0' },
        title: { fontSize: winWidth < 768 ? '24px' : '36px', fontWeight: '900', color: '#0B1E3F', letterSpacing: '-1.5px', margin: 0 },
        subtitle: { fontSize: winWidth < 768 ? '11px' : '15px', color: '#64748b', marginTop: '10px', fontWeight: '500' },

        grid: { display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : (winWidth < 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'), gap: winWidth < 768 ? '20px' : '28px' },
        courseCard: { backgroundColor: 'white', borderRadius: '40px', overflow: 'hidden', border: '1.5px solid #000', boxShadow: '0 12px 35px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic- bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' },
        courseImage: { width: '100%', height: '220px', objectFit: 'cover' },
        courseContent: { padding: winWidth < 768 ? '20px' : '28px', flex: 1, display: 'flex', flexDirection: 'column' },
        levelBadge: { backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '12px', alignSelf: 'flex-start', marginBottom: '18px', color: '#3B5998', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px' },
        courseTitle: { fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '900', color: '#0B1E3F', marginBottom: '15px', lineHeight: '1.3' },
        actionBtn: { backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: winWidth < 768 ? '12px 24px' : '16px 30px', borderRadius: '18px', fontWeight: '900', fontSize: winWidth < 768 ? '11px' : '13px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', alignSelf: 'flex-start', transition: 'all 0.2s', boxShadow: '0 8px 15px rgba(11, 30, 63, 0.2)' },

        // PROGRESS BAR
        progressBar: (width) => ({ height: '8px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }),
        progressFill: (width) => ({ height: '100%', width: `${width}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }),

        // INNER SCREEN
        innerContainer: { maxWidth: '900px', margin: '0 auto', padding: winWidth < 768 ? '10px' : '20px' },
        backBtn: { background: 'white', border: '1.2px solid #f1f5f9', padding: '12px 24px', borderRadius: '18px', fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: winWidth < 768 ? '25px' : '40px', cursor: 'pointer', color: '#3B5998', width: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
        taskRow: { backgroundColor: 'white', borderRadius: '30px', padding: winWidth < 768 ? '25px' : '30px', marginBottom: '20px', display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', alignItems: winWidth < 768 ? 'flex-start' : 'center', justifyContent: 'space-between', gap: winWidth < 768 ? '20px' : '0', border: '1.2px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', transition: 'all 0.3s ease' },

        iframeContainer: { width: '100%', aspectRatio: '16/9', borderRadius: '35px', overflow: 'hidden', backgroundColor: 'black', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' },
        pdfContainer: { width: '100%', minHeight: winWidth < 768 ? '400px' : '650px', borderRadius: '35px', border: '1.2px solid #f1f5f9', backgroundColor: 'white', boxShadow: '0 30px 60px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
        finishBtn: { backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: '18px 40px', borderRadius: '25px', fontWeight: '900', marginTop: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(11, 30, 63, 0.2)' },
        disabledBtn: { backgroundColor: '#94a3b8', color: '#cbd5e1', cursor: 'not-allowed', opacity: 0.6 },

        // CONGRATS POPUP
        popupOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '15px' },
        certificate: {
            backgroundColor: 'white',
            borderRadius: '20px',
            maxWidth: '850px',
            width: '95%',
            aspectRatio: winWidth < 768 ? 'auto' : '1.4 / 1',
            textAlign: 'center',
            position: 'relative',
            zIndex: 10001,
            boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            border: '8px solid white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: winWidth < 768 ? '40px 20px' : '0'
        }
    };

    const handleBackToFleet = () => {
        setSelectedCourse(null);
        setCurrentView(null);
        setShowCertificate(false);
        setShowCard(false);
        setCanShowMarkButton(false);
    };

    const downloadCertificate = async () => {
        const element = document.getElementById('professional-certificate');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape A4
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Calculate dimensions to fit A4
            const canvasAspect = canvas.width / canvas.height;
            const pdfAspect = pageWidth / pageHeight;
            let finalWidth = pageWidth;
            let finalHeight = pageHeight;

            if (canvasAspect > pdfAspect) {
                finalHeight = pageWidth / canvasAspect;
            } else {
                finalWidth = pageHeight * canvasAspect;
            }

            pdf.addImage(imgData, 'PNG', (pageWidth - finalWidth) / 2, (pageHeight - finalHeight) / 2, finalWidth, finalHeight);
            pdf.save(`${selectedCourse.title}_Certificate_${user?.name || 'Employee'}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const getProgressKey = () =>
        `video_progress_user_${user?.id || user?.empId || user?.userId || user?.employee_id || 'guest'}_course_${selectedCourse?.id}`;

    const handleVideoTimeUpdate = () => {
        if (videoRef.current && selectedCourse) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (!duration || isNaN(duration)) return;
            const percentage = (current / duration) * 100;
            updateProgress(selectedCourse.id, percentage);
            if (percentage >= 98 && !canShowMarkButton) setCanShowMarkButton(true);
            // Continuously save watched position
            localStorage.setItem(getProgressKey(), String(current));
        }
    };

    // Attempt to seek on metadata load (first try)
    const handleLoadedMetadata = () => {
        if (videoRef.current && selectedCourse && !hasResumedRef.current) {
            const lastTime = parseFloat(localStorage.getItem(getProgressKey()));
            if (lastTime > 0) {
                videoRef.current.currentTime = lastTime;
                hasResumedRef.current = true;
            }
        }
    };

    // onCanPlay fires when the browser can actually seek — reliable fallback
    const handleCanPlay = () => {
        if (videoRef.current && selectedCourse && !hasResumedRef.current) {
            const lastTime = parseFloat(localStorage.getItem(getProgressKey()));
            if (lastTime > 0) {
                videoRef.current.currentTime = lastTime;
                hasResumedRef.current = true;
            }
        }
    };

    if (loading) {
        return (
            <div style={{ ...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: '800' }}>FETCHING INDUSTRIAL CURRICULUM...</div>
            </div>
        );
    }


    if (selectedCourse && currentView === 'video') {
        const videoSrc = selectedCourse.video_data
            ? `data:video/mp4;base64,${selectedCourse.video_data}`
            : formatUrl(selectedCourse.video || selectedCourse.video_url || selectedCourse.video_link || selectedCourse.link);
        const isEmbed = videoSrc && (videoSrc.includes('youtube.com') || videoSrc.includes('vimeo.com'));

        return (
            <div style={s.container}>
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={() => setCurrentView(null)}><ChevronLeft size={18} /> RETURN TO CURRICULUM</button>
                    <h2 style={{ ...s.title, marginBottom: '30px' }}>Watching: {selectedCourse.title}</h2>
                    <div style={s.iframeContainer}>
                        {isEmbed ? (
                            <iframe src={videoSrc} title="Video" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                        ) : videoSrc ? (
                            <video
                                ref={videoRef}
                                key={videoSrc} controls style={{ width: '100%', height: '100%' }}
                                poster={formatUrl(selectedCourse.image || selectedCourse.thumbnail || selectedCourse.course_image)}
                                preload="auto"
                                onTimeUpdate={handleVideoTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onCanPlay={handleCanPlay}
                                onEnded={() => { setCanShowMarkButton(true); updateProgress(selectedCourse.id, 100); }}
                            >
                                <source src={videoSrc} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Video Not Available</div>
                        )}
                    </div>

                    {canShowMarkButton ? (
                        <button style={s.finishBtn} onClick={() => {
                            updateProgress(selectedCourse.id, 100);
                            setCurrentView(null);
                        }}>
                            <CheckCircle size={20} /> MARK AS PROFICIENCY COMPLETE
                        </button>
                    ) : (
                        <div style={{ ...s.finishBtn, ...s.disabledBtn }}><Clock size={20} /> FINISH VIDEO TO COMPLETE MODULE</div>
                    )}
                </div>
            </div>
        );
    }

    if (selectedCourse && currentView === 'pdf') {
        const pdfSrc = selectedCourse.pdf_data
            ? `data:application/pdf;base64,${selectedCourse.pdf_data}`
            : formatUrl(selectedCourse.pdf || selectedCourse.pdf_url || selectedCourse.file || selectedCourse.document);
        return (
            <div style={s.container}>
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={() => setCurrentView(null)}><ChevronLeft size={18} /> RETURN TO CURRICULUM</button>
                    <h2 style={{ ...s.title, marginBottom: '30px' }}>Reviewing Technical Specification</h2>
                    <div style={s.pdfContainer}>
                        {pdfSrc ? <iframe src={`${pdfSrc}#toolbar=0`} style={{ flex: 1, border: 'none', borderRadius: '35px' }} /> : <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '800' }}>PDF Documentation Not Available</div>}
                    </div>
                </div>
            </div>
        );
    }


    if (selectedCourse) {
        return (
            <div style={s.container}>
                {showCertificate && (
                    <div style={s.popupOverlay}>
                        {particles.map((_, i) => (
                            <motion.img
                                key={i} src={petal} style={{ position: 'absolute', width: '50px', pointerEvents: 'none' }}
                                initial={{ x: (Math.random() - 0.5) * window.innerWidth, y: -window.innerHeight / 2 - Math.random() * 500, opacity: 0, scale: 0.1, rotate: 0 }}
                                animate={{ x: (Math.random() - 0.5) * window.innerWidth * 1.5, y: window.innerHeight * 1.2, opacity: [0, 1, 1, 0.8, 0], scale: Math.random() * 0.7 + 0.3, rotate: Math.random() * 1080 }}
                                transition={{ duration: 5 + Math.random() * 3, ease: "linear", repeat: Infinity, delay: Math.random() * 2 }}
                            />
                        ))}
                        {showCard && (
                            <div style={{ position: 'relative', width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <div style={{ display: 'flex', gap: '15px', alignSelf: 'flex-end' }}>
                                    <button
                                        onClick={downloadCertificate}
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 25px',
                                            borderRadius: '12px',
                                            fontWeight: '900',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)'
                                        }}
                                    >
                                        <Download size={16} /> DOWNLOAD PDF
                                    </button>
                                    <button
                                        style={{
                                            backgroundColor: '#0B1E3F',
                                            color: 'white',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            padding: '12px 25px',
                                            borderRadius: '12px',
                                            fontWeight: '900',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            boxShadow: '0 8px 20px rgba(11, 30, 63, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onClick={handleBackToFleet}
                                    >
                                        <ChevronLeft size={16} /> RETURN TO HUB
                                    </button>
                                </div>

                                <motion.div
                                    id="professional-certificate"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.6 }}
                                    style={{
                                        ...s.certificate,
                                        width: '842px',
                                        height: '595px',
                                        maxWidth: 'none',
                                        backgroundColor: '#fff',
                                        padding: '0',
                                        backgroundImage: `url(${certTemplate})`,
                                        backgroundSize: '100% 100%',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        position: 'relative',
                                        border: 'none',
                                        borderRadius: '0',
                                        boxShadow: '0 40px 100px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    {/* 1. Employee Name (Centered on the main signature line) */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '47.8%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '80%',
                                        textAlign: 'center',
                                        fontSize: (user?.name || '').length > 20 ? '32px' : '46px',
                                        fontWeight: '900',
                                        color: '#0B1E3F',
                                        fontFamily: "'Playfair Display', serif, 'Georgia', 'Times New Roman'",
                                        letterSpacing: '1px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {user?.name || 'VALUED EMPLOYEE'}
                                    </div>

                                    {/* 2. Course Title (Centered horizontally and vertically in the provided space) */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '61.5%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '85%',
                                        textAlign: 'center',
                                        fontSize: (selectedCourse?.title || '').length > 40 ? '16px' : '24px',
                                        fontWeight: '1000',
                                        color: '#1e40af',
                                        fontFamily: "'Inter', sans-serif",
                                        letterSpacing: '0.8px',
                                        lineHeight: '1.3',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {(selectedCourse?.title || 'PROFESSIONAL COURSE').toUpperCase()}
                                    </div>

                                    {/* 3. Date (Positioned after 'DATE:') */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '82.5%',
                                        left: '28.5%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '15px',
                                        fontWeight: '1000',
                                        color: '#0B1E3F',
                                        fontFamily: "'Inter', sans-serif"
                                    }}>
                                        {(() => {
                                            const rawDate = currentCourseProgress.completion_date || currentCourseProgress.completed_at || currentCourseProgress.completed_date;
                                            if (!rawDate) return new Date().toLocaleDateString('en-GB');
                                            const d = new Date(rawDate);
                                            return isNaN(d.getTime()) ? rawDate : d.toLocaleDateString('en-GB');
                                        })()}
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </div>
                )}
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={handleBackToFleet}><ChevronLeft size={18} /> BACK TO KNOWLEDGE HUB</button>
                    <h1 style={{ ...s.title, marginBottom: '15px' }}>{selectedCourse.title}</h1>
                    {/* Completion Date & Verified Status from backend user_courses table */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '30px', alignItems: 'center' }}>
                        {(() => {
                            const completionDate = currentCourseProgress.completion_date || currentCourseProgress.completed_at || currentCourseProgress.completed_date;
                            const verifiedStatus = currentCourseProgress.verified ?? currentCourseProgress.is_verified;
                            return (
                                <>
                                    {isActuallyComplete && completionDate && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            backgroundColor: '#dcfce7', color: '#15803d',
                                            padding: '6px 14px', borderRadius: '20px',
                                            fontSize: '12px', fontWeight: '800'
                                        }}>
                                            <Clock size={14} />
                                            {(() => {
                                                const d = new Date(completionDate);
                                                return isNaN(d.getTime()) ? completionDate : `COMPLETED: ${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
                                            })()}
                                        </div>
                                    )}
                                    {isActuallyComplete && !completionDate && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            backgroundColor: '#dcfce7', color: '#15803d',
                                            padding: '6px 14px', borderRadius: '20px',
                                            fontSize: '12px', fontWeight: '800'
                                        }}>
                                            <CheckCircle size={14} /> COMPLETED
                                        </div>
                                    )}
                                    {verifiedStatus === 1 || verifiedStatus === true || verifiedStatus === 'verified' || verifiedStatus === 'Verified' ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            backgroundColor: '#15803d', color: 'white',
                                            padding: '6px 14px', borderRadius: '20px',
                                            fontSize: '12px', fontWeight: '900'
                                        }}>
                                            <Check size={14} /> VERIFIED
                                        </div>
                                    ) : verifiedStatus === 0 || verifiedStatus === false || verifiedStatus === 'pending' || verifiedStatus === 'Pending' ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            backgroundColor: '#fef3c7', color: '#b45309',
                                            padding: '6px 14px', borderRadius: '20px',
                                            fontSize: '12px', fontWeight: '800'
                                        }}>
                                            <Clock size={14} /> PENDING REVIEW
                                        </div>
                                    ) : null}
                                </>
                            );
                        })()}
                    </div>
                    <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => setCurrentView('video')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#eff6ff', color: '#3b82f6' }}><PlayCircle size={24} /></div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>Module 1: Video Tutorial</div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Comprehensive deep dive into core architectural patterns.</div>
                            </div>
                        </div>
                        <button style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: isVideoDone ? '#dcfce7' : '#0B1E3F', color: isVideoDone ? '#16a34a' : 'white', cursor: 'pointer', width: winWidth < 768 ? '100%' : 'auto' }}>
                            {isVideoDone ? 'COMPLETED' : (currentCourseProgress.progress > 0) ? 'CONTINUE WATCHING' : 'START WATCHING'}
                        </button>
                    </div>
                    <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => {
                        updateProgress(selectedCourse.id, currentCourseProgress.progress, { isPdfDone: true });
                        setCurrentView('pdf');
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#ecfdf5', color: '#10b981' }}><FileText size={24} /></div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>Module 2: Technical Reference</div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Official documentation and specification guide.</div>
                            </div>
                        </div>
                        <button style={{
                            padding: '12px 24px',
                            borderRadius: '14px',
                            border: 'none',
                            fontWeight: '900',
                            fontSize: '11px',
                            backgroundColor: isPdfDone ? '#dcfce7' : '#0B1E3F',
                            color: isPdfDone ? '#16a34a' : 'white',
                            cursor: 'pointer',
                            width: winWidth < 768 ? '100%' : 'auto'
                        }}>
                            {isPdfDone ? 'COMPLETED' : 'OPEN PDF'}
                        </button>
                    </div>
                    <div
                        style={{ ...s.taskRow, opacity: (isVideoDone && isPdfDone) ? 1 : 0.6, cursor: (isVideoDone && isPdfDone) ? 'pointer' : 'default' }}
                        onClick={() => {
                            if (isVideoDone && isPdfDone) {
                                if (isTestDone) {
                                    setShowCertificate(true);
                                    setShowCard(true);
                                } else {
                                    setCurrentView('test');
                                }
                            }
                        }}
                    >
                        {(isVideoDone && isPdfDone) ? (
                            <button
                                style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: '#f59e0b', color: 'white', cursor: 'pointer', width: winWidth < 768 ? '100%' : 'auto' }}
                                onClick={async () => {
                                    if (!isTestDone) {
                                        await updateProgress(selectedCourse.id, 100, { isTestDone: true });
                                    }
                                    setShowCertificate(true);
                                    setTimeout(() => setShowCard(true), 500);
                                }}
                            >
                                DOWNLOAD CERTIFICATE
                            </button>
                        ) : (
                            <div style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '10px 22px', borderRadius: '14px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px', width: winWidth < 768 ? '100%' : 'auto', justifyContent: winWidth < 768 ? 'center' : 'flex-start' }}><Lock size={14} /> LOCKED</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const handleAddCourse = async (courseData) => {
        setIsSaving(true);
        try {
            const res = await fetch(API_ENDPOINTS.COURSES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseData)
            });
            if (res.ok) {
                alert("Course added successfully!");
                setShowAddModal(false);
                fetchCourses();
            } else {
                const err = await res.text();
                alert(`Error adding course: ${err}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to connect to the server.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={s.container}>
            <style>{`
                input::-ms-reveal,
                input::-ms-clear {
                    display: none !important;
                }
                input::-webkit-contacts-auto-fill-button,
                input::-webkit-credentials-auto-fill-button {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
                @keyframes slideIn {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white', padding: '12px 30px', borderRadius: '15px', zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out'
                }}>
                    <CheckCircle size={18} />
                    {toast.msg}
                </div>
            )}
            {showAddModal && (
                <div style={{ ...s.popupOverlay, padding: '20px', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '40px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '5px double #0B1E3F' }}>
                        <h2 style={{ ...s.title, fontSize: '24px', marginBottom: '30px' }}>PROVISION NEW CURRICULUM</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <input placeholder="Course Title" style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', fontWeight: '700' }} id="c-title" />
                            <textarea placeholder="Course Level (e.g. Expert / Intermediate)" style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', fontWeight: '700' }} id="c-level" />

                            <div style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '10px' }}>PDF SPECIFICATION (BASE64)</label>
                                <input type="file" accept="application/pdf" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const base64 = reader.result.split(',')[1];
                                            window._pdfData = base64;
                                            window._pdfName = file.name;
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>

                            <div style={{ padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9' }}>
                                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', display: 'block', marginBottom: '10px' }}>VIDEO TUTORIAL (BASE64 OPTION)</label>
                                <input placeholder="Video URL (YouTube/Drive)" style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', border: 'none', width: '100%', marginBottom: '10px', fontWeight: '700' }} id="c-video-url" />
                                <input type="file" accept="video/*" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const base64 = reader.result.split(',')[1];
                                            window._videoData = base64;
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '18px', borderRadius: '20px', border: 'none', backgroundColor: '#f1f5f9', fontWeight: '900', cursor: 'pointer' }}>ABORT</button>
                                <button onClick={() => {
                                    const title = document.getElementById('c-title').value;
                                    const level = document.getElementById('c-level').value;
                                    const video_url = document.getElementById('c-video-url').value;
                                    const payload = {
                                        title,
                                        level: level || 'Expert',
                                        video_url,
                                        video_data: window._videoData || null,
                                        pdf_data: window._pdfData || null,
                                        pdf_name: window._pdfName || 'Course_Spec.pdf'
                                    };
                                    handleAddCourse(payload);
                                }} style={{ flex: 1, padding: '18px', borderRadius: '20px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '900', cursor: 'pointer' }}>
                                    {isSaving ? 'UPLOADING...' : 'SAVE MODULE'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <div style={s.main}>
                <div style={{ ...s.headerSection, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={s.title}>Knowledge Hub</h1>
                        <p style={s.subtitle}>Accelerating workforce performance through high-fidelity professional education.</p>
                    </div>

                </div>
                <div style={s.grid}>
                    {courses.map(course => {
                        const progress = courseProgressMap[course.id]?.progress || 0;
                        const isActuallyComplete = courseProgressMap[course.id]?.completed === 1 ||
                            courseProgressMap[course.id]?.completed === true;
                        const completionDate = courseProgressMap[course.id]?.completion_date || courseProgressMap[course.id]?.completed_at || courseProgressMap[course.id]?.completed_date;
                        const verifiedStatus = courseProgressMap[course.id]?.verified ?? courseProgressMap[course.id]?.is_verified;

                        const imageUrl = formatUrl(course.image || course.image_url || course.thumbnail || course.course_image || course.image_path || course.pic);
                        const videoLink = formatUrl(course.video || course.video_url || course.video_link || course.link);

                        return (
                            <motion.div key={course.id} style={s.courseCard} onClick={() => setSelectedCourse(course)} whileHover={{ y: -8, boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
                                <div style={{ ...s.courseImage, backgroundColor: '#f1f5f9', position: 'relative' }}>
                                    {imageUrl ? (
                                        <img src={imageUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }} />
                                    ) : videoLink && !videoLink.includes('youtube') && !videoLink.includes('vimeo') ? (
                                        <video style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata">
                                            <source src={videoLink} type="video/mp4" />
                                        </video>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1' }}>
                                            <BookOpen size={40} />
                                        </div>
                                    )}
                                </div>
                                <div style={s.courseContent}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
                                        {/* Completion Date Badge from backend user_courses table */}
                                        {isActuallyComplete && completionDate && (
                                            <div style={{
                                                backgroundColor: '#dcfce7', color: '#15803d',
                                                padding: '6px 12px', borderRadius: '12px',
                                                fontSize: '10px', fontWeight: '800',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                <Clock size={12} />
                                                {(() => {
                                                    const d = new Date(completionDate);
                                                    return isNaN(d.getTime()) ? `COMPLETED: ${completionDate}` : `COMPLETED: ${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    <h2 style={s.courseTitle}>{course.title}</h2>
                                    {/* Verified Badge from backend user_courses table */}
                                    {(verifiedStatus === 1 || verifiedStatus === true || verifiedStatus === 'verified' || verifiedStatus === 'Verified') && (
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            backgroundColor: '#15803d', color: 'white',
                                            padding: '4px 12px', borderRadius: '12px',
                                            fontSize: '10px', fontWeight: '900',
                                            marginBottom: '12px', alignSelf: 'flex-start'
                                        }}>
                                            <Check size={12} /> VERIFIED
                                        </div>
                                    )}
                                    {(verifiedStatus === 0 || verifiedStatus === false || verifiedStatus === 'pending' || verifiedStatus === 'Pending') && isActuallyComplete && (
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            backgroundColor: '#fef3c7', color: '#b45309',
                                            padding: '4px 12px', borderRadius: '12px',
                                            fontSize: '10px', fontWeight: '800',
                                            marginBottom: '12px', alignSelf: 'flex-start'
                                        }}>
                                            <Clock size={12} /> PENDING REVIEW
                                        </div>
                                    )}
                                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: '700' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {videoDurations[course.id] || course.duration || '2h 15m'}</span>
                                    </div>
                                    <div style={s.progressBar(0)}><div style={s.progressFill(isActuallyComplete ? 100 : progress)} /></div>
                                    <div style={{ fontSize: '11px', color: isActuallyComplete ? '#16a34a' : '#94a3b8', fontWeight: '800', marginBottom: '25px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                        {isActuallyComplete ? <><CheckCircle size={12} /> COMPLETED</> : `${Math.round(progress)}% WATCHED`}
                                    </div>
                                    <button style={{ ...s.actionBtn, cursor: 'pointer' }}>
                                        <PlayCircle size={18} /> {isActuallyComplete ? 'REVIEW' : progress > 0 ? 'CONTINUE' : 'START'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
