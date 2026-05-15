import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Clock, Star, PlayCircle, Award, CheckCircle, ChevronLeft, Lock, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';

import logo from '../assets/image.png';
import petal from '../assets/image.png';
import certificateImg from '../assets/certificate.png';

export default function CourseScreen({ resumeCourseId, clearState }) {
    const { user } = useAuth();

    const uid = user?.id || user?.userId || user?.empId || user?.employee_id || 'unknown';
    const lsKey = `courseProgressRecords_${uid}`;

    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);
    
    // Completion Tracking
    const [isVideoDone, setIsVideoDone] = useState(false);
    const [isPdfDone, setIsPdfDone] = useState(false);
    const [isTestDone, setIsTestDone] = useState(false);
    const [currentView, setCurrentView] = useState(null); // 'video', 'pdf', 'test'
    const [showCertificate, setShowCertificate] = useState(false);
    const [showCard, setShowCard] = useState(false);

    // New: Video Progression states
    const [canShowMarkButton, setCanShowMarkButton] = useState(false);
    const videoRef = useRef(null);

    // Persistent storage for course progress
    const [courseProgressMap, setCourseProgressMap] = useState(() => {
        const saved = localStorage.getItem(lsKey);
        return saved ? JSON.parse(saved) : {};
    });

    // Blast Particles
    const particles = Array.from({ length: 80 });

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        fetchCourses();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        localStorage.setItem(lsKey, JSON.stringify(courseProgressMap));
    }, [courseProgressMap, lsKey]);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Accept': 'application/json' };
            if (token && token !== 'undefined') {
                headers['Authorization'] = `Bearer ${token.trim()}`;
            }

            const res = await fetch(API_ENDPOINTS.COURSES, { headers }).catch(() => null);
            
            if (res && res.ok) {
                const backendData = await res.json();
                const list = Array.isArray(backendData) ? backendData : (backendData.value || backendData.data || []);
                
                // Map backend data to UI fields
                const finalCourses = list.map(c => ({
                    ...c,
                    id: c.id || c.course_id || c.courseId,
                    title: c.title || c.course_title || c.courseName || 'Untitled Course',
                    level: c.level || c.course_level || 'Beginner',
                    duration: c.duration || c.course_duration || 'Self-paced',
                    rating: c.rating || c.course_rating || '4.5',
                    image: c.image || c.image_url || c.thumbnail || c.course_image || c.image_path || c.pic || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800',
                    video: c.video || c.video_url || c.video_link || c.link || c.video_path,
                    pdf: c.pdf || c.pdf_url || c.file || c.document || c.pdf_path
                }));

                setCourses(finalCourses);
                
                // Deep Link: Resume course if passed via prop
                if (resumeCourseId) {
                    const target = finalCourses.find(c => String(c.id) === String(resumeCourseId));
                    if (target) {
                        setSelectedCourse(target);
                    }
                }
            } else {
                setCourses([]);
            }
        } catch (e) {
            console.error("Courses API Error:", e);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const formatUrl = (path) => {
        if (!path || typeof path !== 'string') return null;

        // If it's already an absolute URL but pointing to localhost, redirect to the actual BASE_URL
        if (path.startsWith('http')) {
            if (path.includes('localhost:5000')) {
                return path.replace(/http:\/\/localhost:5000/g, BASE_URL);
            }
            return path;
        }
        
        // Handle path formats (uploads/file.pdf, etc.)
        const parts = path.split(/[\\\/]/);
        const fileName = parts.pop();
        return `${BASE_URL}/uploads/${fileName}`;
    };

    const updateProgress = (courseId, progress) => {
        setCourseProgressMap(prev => ({
            ...prev,
            [courseId]: { ...prev[courseId], progress: progress }
        }));
    };

    const s = {
        container: { backgroundColor: '#f8fafc', minHeight: '100vh', padding: winWidth < 768 ? '20px 15px 120px 15px' : '30px 40px 150px 40px', fontFamily: "'Inter', sans-serif" },
        main: { maxWidth: '1200px', margin: '0 auto' },
        headerSection: { marginBottom: winWidth < 768 ? '25px' : '35px', textAlign: winWidth < 768 ? 'center' : 'left', display: 'flex', alignItems: 'center', gap: '20px' },
        title: { fontSize: winWidth < 768 ? '18px' : '20px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-0.5px', margin: 0 },
        subtitle: { display: 'none' },

        grid: { display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '25px' },
        courseCard: { backgroundColor: 'white', borderRadius: '35px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transition: 'all 0.4s ease', cursor: 'pointer', position: 'relative' },
        courseImage: { width: '100%', height: '180px', objectFit: 'cover' },
        courseContent: { padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' },
        levelBadge: { backgroundColor: '#eff6ff', padding: '6px 14px', borderRadius: '12px', alignSelf: 'flex-start', marginBottom: '15px', color: '#3b82f6', fontSize: '11px', fontWeight: '1000', letterSpacing: '0.5px', textTransform: 'uppercase' },
        courseTitle: { fontSize: '24px', fontWeight: '1000', color: '#0B1E3F', marginBottom: '15px', lineHeight: '1.3' },
        actionBtn: { backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '18px', fontWeight: '1000', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', alignSelf: 'flex-start', transition: 'all 0.3s' },

        // PROGRESS BAR
        progressBar: (width) => ({ height: '8px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }),
        progressFill: (width) => ({ height: '100%', width: `${width}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }),

        // INNER SCREEN
        innerContainer: { maxWidth: '900px', margin: '0 auto', padding: winWidth < 768 ? '10px' : '20px' },
        backBtn: { background: 'white', border: '1.2px solid #f1f5f9', padding: '12px 24px', borderRadius: '18px', fontWeight: '900', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', cursor: 'pointer', color: '#3B5998', width: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
        taskRow: { 
            backgroundColor: 'white', borderRadius: '30px', padding: winWidth < 768 ? '20px' : '30px', 
            marginBottom: '20px', display: 'flex', 
            flexDirection: winWidth < 768 ? 'column' : 'row',
            alignItems: winWidth < 768 ? 'flex-start' : 'center', 
            justifyContent: 'space-between', border: '1.2px solid #f1f5f9', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.02)', transition: 'all 0.3s ease',
            gap: winWidth < 768 ? '20px' : '15px'
        },
        
        iframeContainer: { width: '100%', aspectRatio: '16/9', borderRadius: '35px', overflow: 'hidden', backgroundColor: 'black', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' },
        pdfContainer: { width: '100%', minHeight: winWidth < 768 ? '400px' : '650px', borderRadius: '35px', border: '1.2px solid #f1f5f9', backgroundColor: 'white', boxShadow: '0 30px 60px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
        finishBtn: { width: '100%', backgroundColor: '#0B1E3F', color: 'white', border: 'none', padding: '18px 40px', borderRadius: '25px', fontWeight: '900', marginTop: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(11, 30, 63, 0.2)' },
        disabledBtn: { backgroundColor: '#94a3b8', color: '#cbd5e1', cursor: 'not-allowed', opacity: 0.6 },
        
        // CONGRATS POPUP
        popupOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        certificate: { backgroundColor: 'white', padding: winWidth < 768 ? '30px' : '60px', borderRadius: '50px', maxWidth: '650px', width: '92%', textAlign: 'center', border: '10px double #0B1E3F', position: 'relative', zIndex: 10001, boxShadow: '0 30px 100px rgba(0,0,0,0.3)' }
    };

    const handleBackToFleet = () => {
        setSelectedCourse(null);
        setCurrentView(null);
        setIsVideoDone(false);
        setIsPdfDone(false);
        setIsTestDone(false);
        setShowCertificate(false);
        setShowCard(false);
        setCanShowMarkButton(false);
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            const percentage = (current / duration) * 100;
            updateProgress(selectedCourse.id, percentage);
            if (percentage >= 98 && !canShowMarkButton) setCanShowMarkButton(true);
        }
    };

    if (loading) {
        return (
            <div style={{ ...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: '800' }}>Fetching industrial curriculum...</div>
            </div>
        );
    }

    if (selectedCourse && currentView === 'video') {
        // Strict detection: check actual video fields only
        let videoSrc = selectedCourse.video_data 
            ? `data:video/mp4;base64,${selectedCourse.video_data}`
            : formatUrl(selectedCourse.video || selectedCourse.video_url || selectedCourse.video_link || selectedCourse.link || selectedCourse.video_path || selectedCourse.file_path || selectedCourse.url || selectedCourse.path || selectedCourse.attachment || selectedCourse.clip);

        // Fallback: Scan keys for actual VIDEO extensions or known video platforms
        if (!videoSrc) {
            const possibleKey = Object.keys(selectedCourse).find(key => {
                const val = selectedCourse[key];
                return typeof val === 'string' && (
                    val.toLowerCase().endsWith('.mp4') || 
                    val.toLowerCase().endsWith('.mkv') || 
                    val.toLowerCase().endsWith('.mov') || 
                    val.toLowerCase().endsWith('.webm') ||
                    (val.includes('youtube.com') && !val.includes('drive.google.com')) ||
                    val.includes('youtu.be')
                );
            });
            if (possibleKey) {
                videoSrc = formatUrl(selectedCourse[possibleKey]);
            }
        }
        
        // Final logic for Google Drive: Always ensure it's in preview mode for embedding
        if (videoSrc && videoSrc.includes('drive.google.com')) {
            if (videoSrc.includes('/view')) {
                videoSrc = videoSrc.replace('/view', '/preview');
            } else if (!videoSrc.endsWith('/preview')) {
                // Try to extract ID and force preview format
                const driveIdMatch = videoSrc.match(/\/d\/([^/]+)/);
                if (driveIdMatch && driveIdMatch[1]) {
                    videoSrc = `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
                }
            }
        }

        const isEmbed = videoSrc && (
            videoSrc.includes('youtube.com') || 
            videoSrc.includes('vimeo.com') || 
            videoSrc.includes('youtu.be') || 
            videoSrc.includes('drive.google.com')
        );
        
        return (
            <div style={s.container}>
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={() => setCurrentView(null)}><ChevronLeft size={18} /> Return to curriculum</button>
                    <h2 style={{ ...s.title, marginBottom: '30px' }}>Watching: {selectedCourse.title}</h2>
                    <div style={s.iframeContainer}>
                        {isEmbed ? (
                            <iframe src={videoSrc} title="Video" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                        ) : videoSrc ? (
                            <video 
                                ref={videoRef} key={videoSrc} controls style={{ width: '100%', height: '100%' }} 
                                poster={formatUrl(selectedCourse.image || selectedCourse.thumbnail || selectedCourse.course_image)}
                                preload="auto" onTimeUpdate={handleVideoTimeUpdate}
                                onEnded={() => { setCanShowMarkButton(true); updateProgress(selectedCourse.id, 100); }}
                            >
                                <source src={videoSrc} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div style={{ color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px' }}>
                                <div style={{ fontSize: '18px', fontWeight: '900' }}>Video Content Not Found</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>No video tutorial is currently linked to this Java module in the database.</div>
                            </div>
                        )}
                    </div>

                    {(isEmbed || canShowMarkButton) ? (
                        <button style={s.finishBtn} onClick={() => { setIsVideoDone(true); updateProgress(selectedCourse.id, 100); setCurrentView(null); }}>
                             <CheckCircle size={20} /> Mark as proficiency complete
                        </button>
                    ) : (
                        <div style={{ ...s.finishBtn, ...s.disabledBtn }}><Clock size={20} /> Finish video to complete module</div>
                    )}
                </div>
            </div>
        );
    }

    if (selectedCourse && currentView === 'pdf') {
        const rawPdfSrc = selectedCourse.pdf_data
            ? `data:application/pdf;base64,${selectedCourse.pdf_data}`
            : formatUrl(selectedCourse.pdf || selectedCourse.pdf_url || selectedCourse.file || selectedCourse.document);
        
        // Handle Google Docs links specifically to allow embedding
        let pdfSrc = rawPdfSrc;
        if (pdfSrc && pdfSrc.includes('docs.google.com') && !pdfSrc.includes('/preview')) {
            if (pdfSrc.includes('/edit')) {
                pdfSrc = pdfSrc.replace('/edit', '/preview');
            } else if (pdfSrc.includes('/view')) {
                pdfSrc = pdfSrc.replace('/view', '/preview');
            } else if (!pdfSrc.endsWith('/preview')) {
                pdfSrc = pdfSrc + '/preview';
            }
        }

        return (
            <div style={s.container}>
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={() => setCurrentView(null)}><ChevronLeft size={18} /> Return to curriculum</button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <h2 style={{ ...s.title, margin: 0 }}>Reviewing Technical Specification</h2>
                        {rawPdfSrc && !rawPdfSrc.startsWith('data:') && (
                            <a href={rawPdfSrc} target="_blank" rel="noopener noreferrer" style={{ ...s.backBtn, marginBottom: 0, textDecoration: 'none', backgroundColor: '#eff6ff' }}>
                                <Download size={16} /> Download pdf
                            </a>
                        )}
                    </div>
                    <div style={s.pdfContainer}>
                        {pdfSrc ? (
                            <iframe 
                                src={pdfSrc.startsWith('data:') ? pdfSrc : `${pdfSrc}${pdfSrc.includes('?') ? '&' : '?'}embedded=true`} 
                                style={{ flex: 1, border: 'none', borderRadius: '35px' }} 
                                title="Course Document"
                            />
                        ) : (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '800' }}>PDF Documentation Not Available</div>
                        )}
                    </div>
                    <button style={s.finishBtn} onClick={() => { setIsPdfDone(true); setCurrentView(null); }}><CheckCircle size={20} /> Mark as read</button>
                </div>
            </div>
        );
    }

    if (selectedCourse) {
        return (
            <div style={s.container}>
                <div style={s.innerContainer}>
                    <button style={s.backBtn} onClick={handleBackToFleet}><ChevronLeft size={18} /> Back to knowledge hub</button>
                    <h1 style={{ ...s.title, marginBottom: '40px' }}>{selectedCourse.title}</h1>
                    <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => setCurrentView('video')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#eff6ff', color: '#3b82f6' }}><PlayCircle size={24} /></div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F' }}>Module 1: Video Tutorial</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Comprehensive deep dive into core architectural patterns.</div>
                            </div>
                        </div>
                        <button style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: (courseProgressMap[selectedCourse.id]?.progress >= 100) ? '#dcfce7' : '#0B1E3F', color: (courseProgressMap[selectedCourse.id]?.progress >= 100) ? '#16a34a' : 'white', cursor: 'pointer' }}>
                            {(courseProgressMap[selectedCourse.id]?.progress >= 100) ? 'Completed' : (courseProgressMap[selectedCourse.id]?.progress > 0) ? 'Continue watching' : 'Start watching'}
                        </button>
                    </div>
                    <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => setCurrentView('pdf')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#ecfdf5', color: '#10b981' }}><FileText size={24} /></div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F' }}>Module 2: Technical Reference</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Official documentation and specification guide.</div>
                            </div>
                        </div>
                        <button style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: isPdfDone ? '#dcfce7' : '#0B1E3F', color: isPdfDone ? '#16a34a' : 'white', cursor: 'pointer' }}>{isPdfDone ? 'Completed' : 'Open pdf'}</button>
                    </div>
                    {(courseProgressMap[selectedCourse.id]?.progress >= 100 && isPdfDone) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}
                        >
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F', textAlign: 'center' }}>Congratulations! Here is your Certificate</div>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '700px' }}>
                                <img src={certificateImg} alt="Certificate of Achievement" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', display: 'block' }} />
                                <div style={{ position: 'absolute', top: '49%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', textAlign: 'center', color: '#0B1E3F', fontSize: 'clamp(14px, 3vw, 28px)', fontWeight: '900', fontFamily: 'serif', letterSpacing: '1px' }}>
                                    {user?.name || user?.userName || 'Employee Name'}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={s.container}>
            <div style={s.main}>
                <div style={s.headerSection}>
                    <button 
                        style={{ ...s.backBtn, marginBottom: 0, padding: '10px 18px', borderRadius: '14px' }} 
                        onClick={() => clearState && clearState()}
                    >
                        <ChevronLeft size={16} /> Back
                    </button>
                    <h1 style={s.title}>Knowledge Hub</h1>
                </div>
                <div style={s.grid}>
                    {courses.map(course => {
                        const progress = courseProgressMap[course.id]?.progress || 0;
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
                                    <div style={s.levelBadge}>{course.level || 'Expert'}</div>
                                    <h2 style={s.courseTitle}>{course.title}</h2>
                                    <div style={{ fontSize: '16px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginBottom: '18px', fontWeight: '700' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={18} /> {course.duration || '2h 15m'}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={18} color="#f59e0b" fill="#f59e0b" /> {course.rating || '4.9'}</span>
                                    </div>
                                    <div style={s.progressBar(0)}><div style={s.progressFill(progress)} /></div>
                                    <div style={{ fontSize: '14px', color: (progress >= 100) ? '#16a34a' : '#94a3b8', fontWeight: '800', marginBottom: '30px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                        {progress >= 100 ? <><CheckCircle size={14} /> Completed</> : `${Math.round(progress)}% watched`}
                                    </div>
                                    <button style={{ ...s.actionBtn, cursor: 'pointer' }}>
                                        <PlayCircle size={18} /> {progress >= 100 ? 'Review' : progress > 0 ? 'Continue' : 'Start'}
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
