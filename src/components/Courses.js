import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Clock, Star, PlayCircle, CheckCircle, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import jsPDF from 'jspdf';
import BackButton from './BackButton';

import logo from '../assets/image.png';
import petal from '../assets/image.png';
import certificateImg from '../assets/certificate_final.png';

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
    const [lastCompletedCourseId, setLastCompletedCourseId] = useState(null);
    const [currentView, setCurrentView] = useState(null); // 'video', 'pdf', 'test'
    const [showCertificate, setShowCertificate] = useState(false);
    const [showCard, setShowCard] = useState(false);

    // New: Video Progression states
    const [canShowMarkButton, setCanShowMarkButton] = useState(false);
    const videoRef = useRef(null);
    const certificateRef = useRef(null);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        localStorage.setItem(lsKey, JSON.stringify(courseProgressMap));
    }, [courseProgressMap, lsKey]);

    // Initialize completion states when selected course changes
    useEffect(() => {
        if (selectedCourse) {
            const record = courseProgressMap[selectedCourse.id] || {};
            setIsVideoDone(!!record.videoDone);
            setIsPdfDone(!!record.pdfDone);
            if (record.progress >= 100) {
                setLastCompletedCourseId(selectedCourse.id);
            } else {
                setLastCompletedCourseId(null);
            }
        }
    }, [selectedCourse, courseProgressMap]);

    const sendCourseCompletionToBackend = async (courseId) => {
        try {
            const token = localStorage.getItem('token');
            const userEmail = user?.email || user?.email_id || user?.emailId || 'unknown';
            const userName = user?.name || user?.userName || 'Employee';
            const payload = {
                userId: uid,
                user_id: uid,
                employee_id: uid,
                courseId: courseId,
                course_id: courseId,
                completed: 1,
                email: userEmail,
                userName: userName
            };

            const requests = [
                { url: `${BASE_URL}/api/user-courses`, method: 'POST' },
                { url: `${BASE_URL}/api/user-courses/${courseId}`, method: 'PUT' },
                { url: `${BASE_URL}/api/user-course/${courseId}`, method: 'PUT' },
                { url: `${BASE_URL}/api/user_courses/${courseId}`, method: 'PUT' },
                { url: `${BASE_URL}/api/user_course/${courseId}`, method: 'PUT' },
                { url: `${BASE_URL}/api/user_courses`, method: 'POST' },
                { url: `${BASE_URL}/api/user-course`, method: 'POST' },
                { url: `${BASE_URL}/api/user_course`, method: 'POST' },
                { url: `${BASE_URL}/api/user-courses/complete`, method: 'PUT' },
                { url: `${BASE_URL}/api/user_courses/complete`, method: 'PUT' }
            ];

            console.log(`[CourseScreen] Sending course completion for course ${courseId} to backend...`);

            for (const req of requests) {
                try {
                    const response = await fetch(req.url, {
                        method: req.method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        console.log(`[CourseScreen] Successfully completed course via ${req.method} endpoint: ${req.url}`);
                        break;
                    } else {
                        console.warn(`[CourseScreen] ${req.method} Endpoint ${req.url} returned status ${response.status}`);
                    }
                } catch (err) {
                    console.warn(`[CourseScreen] Failed to connect to ${req.method} endpoint ${req.url}:`, err.message);
                }
            }
        } catch (error) {
            console.error("[CourseScreen] Failed to sync course completion with backend:", error);
        }
    };

    // Trigger backend notification when course is completed
    useEffect(() => {
        if (!selectedCourse) return;

        const hasVideo = !!(selectedCourse.video_url || selectedCourse.video || selectedCourse.video_link || selectedCourse.link || selectedCourse.video_path);
        const hasPdf = !!(selectedCourse.pdf_url || selectedCourse.pdf || selectedCourse.file || selectedCourse.document);

        const videoOk = !hasVideo || isVideoDone;
        const pdfOk = !hasPdf || isPdfDone;

        const allDone = (hasVideo || hasPdf) && videoOk && pdfOk;

        if (allDone && lastCompletedCourseId !== selectedCourse.id) {
            setLastCompletedCourseId(selectedCourse.id);
            sendCourseCompletionToBackend(selectedCourse.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCourse, isVideoDone, isPdfDone, lastCompletedCourseId]);

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

        // Preserve relative API paths (e.g. /api/drive/stream/...) — just prepend BASE_URL
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const updateCourseProgress = (course, updates) => {
        setCourseProgressMap(prev => {
            const current = prev[course.id] || { progress: 0, videoProgress: 0, videoDone: false, pdfDone: false };
            const next = { ...current, ...updates };

            const hasVideo = !!(course.video_url || course.video || course.video_link || course.link || course.video_path);
            const hasPdf = !!(course.pdf_url || course.pdf || course.file || course.document);

            let overallProgress = 0;
            if (hasVideo && hasPdf) {
                const videoWeight = next.videoDone ? 50 : (next.videoProgress || 0) * 0.5;
                const pdfWeight = next.pdfDone ? 50 : 0;
                overallProgress = videoWeight + pdfWeight;
            } else if (hasVideo) {
                overallProgress = next.videoDone ? 100 : (next.videoProgress || 0);
            } else if (hasPdf) {
                overallProgress = next.pdfDone ? 100 : 0;
            }

            next.progress = Math.min(overallProgress, 100);
            return {
                ...prev,
                [course.id]: next
            };
        });
    };

    const s = {
        container: { backgroundColor: '#f8fafc', minHeight: '100vh', padding: winWidth < 768 ? '20px 15px 120px 15px' : '30px 40px 150px 40px', fontFamily: "'Inter', sans-serif" },
        main: { maxWidth: '100%', margin: '0 auto' },
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
        innerContainer: { maxWidth: '100%', margin: '0 auto', padding: winWidth < 768 ? '10px' : '20px' },
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

        iframeContainer: { width: '100%', maxWidth: '960px', aspectRatio: '16/9', maxHeight: winWidth < 768 ? '300px' : '400px', borderRadius: '35px', overflow: 'hidden', backgroundColor: 'black', boxShadow: '0 30px 60px rgba(0,0,0,0.1)', margin: '0 auto' },
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
            updateCourseProgress(selectedCourse, { videoProgress: percentage });
            if (percentage >= 98 && !canShowMarkButton) setCanShowMarkButton(true);
        }
    };

    const handleDownloadCertificate = async (sendEmail = true) => {
        try {
            // Native Canvas drawing for crystal clear, uncompressed PDF generation
            const image = new Image();
            image.src = certificateImg;
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;

            ctx.drawImage(image, 0, 0, image.width, image.height);

            const userName = user?.name || user?.userName || 'Employee Name';
            const courseName = selectedCourse?.title || 'COURSE';
            const currentDate = new Date().toLocaleDateString('en-GB');

            ctx.font = 'italic bold 75px "Georgia", "Times New Roman", serif';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.fillText(userName.toUpperCase(), image.width / 2, 725);

            ctx.font = 'bold 40px "Georgia", "Times New Roman", serif';
            ctx.fillStyle = '#1e3a8a';
            ctx.textAlign = 'center';
            ctx.fillText(courseName, image.width / 2, 882);

            ctx.font = 'bold 20px Arial, sans-serif';
            ctx.fillStyle = '#1e3a8a';
            ctx.textAlign = 'left';
            ctx.fillText(currentDate, image.width * 0.285, 1142);

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('landscape', 'px', [canvas.width, canvas.height]);
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

            // 1. Download to local machine
            pdf.save(`${courseName.replace(/\s+/g, '_')}_Certificate.pdf`);

            // 2. Send to employee email ID
            if (sendEmail) {
                const pdfBase64 = pdf.output('datauristring').split(',')[1];
                const userEmail = user?.email || user?.email_id || user?.emailId || 'imsha@navabharathtechnologie.com';

                if (userEmail) {
                    // Always show success to user — email delivery happens in background
                    alert(`🎉 Certificate downloaded successfully!\n\nA copy will be sent to your registered email: ${userEmail}`);

                    // Attempt email delivery silently — if backend isn't ready, just log it
                    try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${BASE_URL}/api/send-certificate`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                email: userEmail,
                                userName: userName,
                                courseName: courseName,
                                certificateData: pdfBase64
                            })
                        });

                        if (response.ok) {
                            console.log(`Certificate email sent successfully to ${userEmail}`);
                        } else {
                            console.warn(`Certificate email API returned ${response.status} — backend may not be ready yet.`);
                        }
                    } catch (e) {
                        console.warn("Certificate email API not reachable — backend endpoint pending:", e.message);
                    }
                }
            }
        } catch (error) {
            console.error("Error downloading certificate:", error);
            alert('Error generating certificate. Please try again.');
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
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '30px' }}>
                        <BackButton onClick={() => setCurrentView(null)} />
                        <span style={{ fontWeight: '900', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Return to curriculum</span>
                    </div>
                    <h2 style={{ ...s.title, marginBottom: '30px' }}>Watching: {selectedCourse.title}</h2>
                    <div style={s.iframeContainer}>
                        {isEmbed ? (
                            <iframe src={videoSrc} title="Video" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                        ) : videoSrc ? (
                            <video
                                ref={videoRef} key={videoSrc} controls style={{ width: '100%', height: '100%' }}
                                poster={formatUrl(selectedCourse.image || selectedCourse.thumbnail || selectedCourse.course_image)}
                                preload="auto" onTimeUpdate={handleVideoTimeUpdate}
                                onEnded={() => {
                                    setCanShowMarkButton(true);
                                    updateCourseProgress(selectedCourse, { videoProgress: 100 });
                                }}
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
                        <button style={s.finishBtn} onClick={() => {
                            setIsVideoDone(true);
                            updateCourseProgress(selectedCourse, { videoDone: true, videoProgress: 100 });
                            setCurrentView(null);
                        }}>
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
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '30px' }}>
                        <BackButton onClick={() => setCurrentView(null)} />
                        <span style={{ fontWeight: '900', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Return to curriculum</span>
                    </div>
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
                    <button style={s.finishBtn} onClick={() => {
                        setIsPdfDone(true);
                        updateCourseProgress(selectedCourse, { pdfDone: true });
                        setCurrentView(null);
                    }}>
                        <CheckCircle size={20} /> Mark as read
                    </button>
                </div>
            </div>
        );
    }

    if (selectedCourse) {
        return (
            <>
                <div style={s.container}>
                    <div style={s.innerContainer}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '30px' }}>
                            <BackButton onClick={handleBackToFleet} />
                            <span style={{ fontWeight: '900', color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Back to Course</span>
                        </div>
                        <h1 style={{ ...s.title, marginBottom: '40px' }}>{selectedCourse.title}</h1>
                        {/* Video module — only shown if backend provides a video URL */}
                        {(selectedCourse.video_url || selectedCourse.video || selectedCourse.video_link || selectedCourse.link || selectedCourse.video_path) && (
                            <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => setCurrentView('video')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#eff6ff', color: '#3b82f6' }}><PlayCircle size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F' }}>Video Tutorial</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{selectedCourse.description || 'Watch the course video.'}</div>
                                    </div>
                                </div>
                                <button style={{
                                    padding: '12px 24px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    fontWeight: '900',
                                    fontSize: '11px',
                                    backgroundColor: isVideoDone ? '#dcfce7' : '#0B1E3F',
                                    color: isVideoDone ? '#16a34a' : 'white',
                                    cursor: 'pointer'
                                }}>
                                    {isVideoDone ? 'Completed' : (courseProgressMap[selectedCourse.id]?.videoProgress > 0) ? 'Continue watching' : 'Start watching'}
                                </button>
                            </div>
                        )}

                        {/* PDF module — only shown if backend provides a pdf URL */}
                        {(selectedCourse.pdf_url || selectedCourse.pdf || selectedCourse.file || selectedCourse.document) && (
                            <div style={{ ...s.taskRow, cursor: 'pointer' }} onClick={() => setCurrentView('pdf')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#ecfdf5', color: '#10b981' }}><FileText size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F' }}>PDF Reference Material</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{selectedCourse.description || 'Read the course documentation.'}</div>
                                    </div>
                                </div>
                                <button style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: '900', fontSize: '11px', backgroundColor: isPdfDone ? '#dcfce7' : '#0B1E3F', color: isPdfDone ? '#16a34a' : 'white', cursor: 'pointer' }}>
                                    {isPdfDone ? 'Completed' : 'Open PDF'}
                                </button>
                            </div>
                        )}

                        {/* Fallback — shown only if backend has neither video nor pdf */}
                        {!(selectedCourse.video_url || selectedCourse.video || selectedCourse.video_link || selectedCourse.link || selectedCourse.video_path) &&
                            !(selectedCourse.pdf_url || selectedCourse.pdf || selectedCourse.file || selectedCourse.document) && (
                                <div style={{ ...s.taskRow, border: '1.5px dashed #e2e8f0', backgroundColor: '#f8fafc' }}>
                                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '800', textAlign: 'center', width: '100%' }}>
                                        No course materials have been uploaded yet. Check back soon.
                                    </div>
                                </div>
                            )}
                        {/* Certificate — only when ALL available materials are completed */}
                        {(() => {
                            const hasVideo = !!(selectedCourse.video_url || selectedCourse.video || selectedCourse.video_link || selectedCourse.link || selectedCourse.video_path);
                            const hasPdf = !!(selectedCourse.pdf_url || selectedCourse.pdf || selectedCourse.file || selectedCourse.document);
                            const videoOk = !hasVideo || isVideoDone;
                            const pdfOk = !hasPdf || isPdfDone;
                            const allDone = (hasVideo || hasPdf) && videoOk && pdfOk;
                            return allDone ? (
                                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-start' }}>
                                    <button
                                        onClick={() => setShowCertificate(true)}
                                        style={{
                                            backgroundColor: '#eab308',
                                            color: 'white',
                                            padding: '12px 24px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            fontWeight: '900',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 10px rgba(234, 179, 8, 0.3)'
                                        }}
                                    >
                                        Download Certificate
                                    </button>
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>

                {/* Certificate Modal Overlay */}
                {showCertificate && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '800px', marginBottom: '20px', gap: '15px' }}>
                            <button
                                onClick={handleDownloadCertificate}
                                style={{
                                    backgroundColor: '#10b981', // Green
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Download size={16} /> DOWNLOAD PDF
                            </button>
                            <button
                                onClick={() => {
                                    setShowCertificate(false);
                                    handleBackToFleet();
                                }}
                                style={{
                                    backgroundColor: '#1e3a8a', // Dark blue
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                &lt; RETURN TO HUB
                            </button>
                        </div>

                        <div ref={certificateRef} style={{ position: 'relative', width: '100%', maxWidth: '700px', backgroundColor: 'white', padding: '10px', borderRadius: '16px' }}>
                            <img src={certificateImg} alt="Certificate of Achievement" style={{ width: '100%', display: 'block', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }} />

                            {/* Employee Name */}
                            <div style={{ position: 'absolute', top: '51%', left: '50%', transform: 'translate(-50%, -100%)', width: '100%', textAlign: 'center', color: '#000000', fontSize: 'clamp(16px, 3.2vw, 28px)', fontWeight: '900', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', letterSpacing: '1px' }}>
                                {(user?.name || user?.userName || 'Employee Name').toUpperCase()}
                            </div>

                            {/* Course Name */}
                            <div style={{ position: 'absolute', top: '60.5%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', textAlign: 'center', color: '#1e3a8a', fontSize: 'clamp(16px, 2.5vw, 24px)', fontWeight: '900', fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '1px' }}>
                                {selectedCourse?.title || 'COURSE'}
                            </div>

                            {/* Date */}
                            <div style={{ position: 'absolute', top: '80.8%', left: '28%', transform: 'translate(0, -50%)', color: '#1e3a8a', fontSize: 'clamp(8px, 0.9vw, 11px)', fontWeight: '900', fontFamily: 'Arial, sans-serif' }}>
                                {new Date().toLocaleDateString('en-GB')}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div style={s.container}>
            <div style={s.main}>
                <div style={s.headerSection}>
                    {clearState && <BackButton onClick={() => clearState()} />}
                    <h1 style={s.title}>Course</h1>
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
