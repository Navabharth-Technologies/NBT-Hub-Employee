import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { LogOut, User as UserIcon, Trophy } from 'lucide-react';
import { BASE_URL } from '../config';

import logo from '../assets/image.png';
import awardIcon from '../assets/award_icon.png';

export default function AppHeader({ setActiveTab }) {
    const { user, logout } = useAuth();
    const theme = getTheme(user?.role);
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const styles = {
        header: {
            height: winWidth < 768 ? '60px' : '100px',
            backgroundColor: theme.headerBg || '#ffffff',
            display: 'flex',
            alignItems: 'center',
            padding: winWidth < 768 ? '0 12px' : '0 30px',
            boxShadow: theme.headerBg === '#ffffff' ? '0 4px 30px rgba(0,0,0,0.06)' : 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            boxSizing: 'border-box',
            zIndex: 2000,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            justifyContent: 'space-between',
            borderBottom: theme.headerBg === '#ffffff' ? '2px solid #FDB913' : 'none'
        },
        profileSection: {
            display: 'flex',
            alignItems: 'center',
            gap: winWidth < 768 ? '10px' : '15px',
            cursor: 'pointer'
        },
        photoContainer: {
            width: winWidth < 768 ? '55px' : '65px',
            height: winWidth < 768 ? '55px' : '65px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
        },
        photo: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%'
        },
        infoContainer: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
        },
        userName: {
            color: 'white',
            fontWeight: '800',
            fontSize: winWidth < 768 ? '11px' : (winWidth < 1024 ? '14px' : '18px'),
            letterSpacing: '-0.3px',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: winWidth < 768 ? '90px' : (winWidth < 1024 ? '140px' : '250px')
        },
        designation: {
            display: winWidth < 768 ? 'none' : 'block',
            color: '#7c3aed',
            fontWeight: '800',
            fontSize: '11px',
            textTransform: 'uppercase',
            marginTop: '4px',
            letterSpacing: '0.5px'
        },
        rightSection: {
            display: 'flex',
            alignItems: 'center',
            gap: winWidth < 768 ? '8px' : (winWidth < 1024 ? '15px' : '25px')
        },
        logo: {
            color: theme.text || '#0B1E3F',
            fontWeight: '900',
            fontSize: winWidth < 768 ? '18px' : '26px',
            letterSpacing: '-1px',
            textShadow: theme.headerBg === '#ffffff' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
            whiteSpace: 'nowrap'
        },
        logoutBtn: {
            position: 'absolute',
            bottom: winWidth < 768 ? '-2px' : '-5px',
            right: winWidth < 768 ? '-2px' : '-5px',
            background: 'white',
            border: '1px solid rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: winWidth < 768 ? '4px' : '6px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            flexShrink: 0,
            zIndex: 10
        },
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.3s ease-out'
        },
        modal: {
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out'
        },
        modalTitle: { margin: '0 0 15px 0', fontSize: '20px', fontWeight: '800', color: '#1f2937' },
        modalText: { margin: '0 0 25px 0', fontSize: '15px', color: '#4b5563', lineHeight: 1.5 },
        modalBtns: { display: 'flex', gap: '15px', justifyContent: 'center' },
        cancelBtn: {
            padding: '12px 25px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: 'white',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
        },
        confirmBtn: {
            padding: '12px 25px',
            borderRadius: '12px',
            border: 'none',
            background: '#ef4444',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            transition: 'all 0.2s'
        }
    };

    const profilePicUrl = (() => {
        const imgPath = user?.profileImage || user?.profile_image || user?.profilePicture || user?.profile_picture || user?.avatar || user?.profile_pic;
        if (!imgPath) return null;
        return imgPath.startsWith('http') || imgPath.startsWith('data:') ? imgPath : `${BASE_URL}${imgPath}`;
    })();

    return (
        <>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }} onClick={() => setActiveTab('HOME')}>
                    <img
                        src={logo}
                    alt="NBT Logo"
                    style={{
                        height: winWidth < 768 ? '65px' : '95px',
                        width: 'auto',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
                    }}
          />
                </div>

                <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    display: winWidth < 1024 ? 'none' : 'block'
                }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: '32px',
                        fontWeight: '1000',
                        color: '#0B1E3F',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        background: 'linear-gradient(45deg, #0B1E3F 30%, #3B5998 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}>
                        NBT HUB
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '8px' : '20px' }}>
                    {/* Achievements/Badges Icon */}
                    <motion.div
                        whileHover={{ scale: 1.2, y: -4, rotate: [-5, 5, -5, 0] }}
                        whileTap={{ scale: 0.9 }}
                        animate={{ y: [0, -3, 0] }}
                        transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
                        style={{
                            position: 'relative',
                            cursor: 'pointer',
                            padding: '4px',
                            paddingRight: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        title="Awards and Recognization"
                        onClick={() => {
                            setActiveTab('AWARDS');
                        }}
                    >
                        <motion.div>
                            <img
                                src={awardIcon}
                            alt="Awards"
                            style={{
                                height: winWidth < 768 ? '45px' : '65px',
                                width: 'auto',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
                            }}
              />
                        </motion.div>
                    </motion.div>

                    <div style={styles.rightSection}>
                        <div style={{ ...styles.infoContainer, textAlign: 'right' }}>
                            <div style={{ ...styles.userName, color: '#0B1E3F' }}>{user?.name || 'User Name'}</div>
                            <div style={styles.designation}>{user?.role?.toUpperCase() || theme.label}</div>
                        </div>
                        <div
                            style={{ ...styles.photoContainer, cursor: 'pointer' }}
                            title="My Documents & Profile"
                            onMouseOver={(e) => {
                                const photoCont = e.currentTarget;
                                photoCont.style.transform = 'scale(1.05)';
                                photoCont.style.borderColor = '#FDB913';
                            }}
                            onMouseOut={(e) => {
                                const photoCont = e.currentTarget;
                                photoCont.style.transform = 'scale(1)';
                                photoCont.style.borderColor = 'rgba(255,255,255,0.4)';
                            }}
                        >
                            <div
                                onClick={() => setActiveTab('DOCUMENTS')}
                                style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {profilePicUrl ? (
                                    <img src={profilePicUrl} alt="Profile" style={styles.photo} />
                                ) : (
                                    <UserIcon size={winWidth < 768 ? 20 : 25} color={theme.text || "#0B1E3F"} />
                                )}
                            </div>

                            <button
                                style={styles.logoutBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLogoutConfirm(true);
                                }}
                                onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '#ef4444';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.color = '#ef4444';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Logout Securely"
                            >
                                <LogOut size={winWidth < 768 ? 14 : 16} style={{ strokeWidth: '3px' }} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showLogoutConfirm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3 style={styles.modalTitle}>Confirm Logout</h3>
                        <p style={styles.modalText}>Are you sure you want to sign out from NBT Hub? Any unsaved changes might be lost.</p>
                        <div style={styles.modalBtns}>
                            <button style={styles.cancelBtn} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                            <button style={styles.confirmBtn} onClick={() => {
                                logout();
                                setShowLogoutConfirm(false);
                            }}>Sign Out</button>
                        </div>
                    </div>
                    <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
                </div>
            )}


        </>
    );
}