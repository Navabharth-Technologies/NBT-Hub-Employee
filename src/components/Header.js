import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import logo from '../assets/image.png';
import { BASE_URL } from '../config';
import { LogOut, Trophy, User } from 'lucide-react';

const Header = ({ setActiveTab, isNewJoinee }) => {
    const { user, logout, isBlocked } = useAuth();
    const profileImage = user?.profileImage || user?.profile_image || user?.profilePicture || user?.profile_picture || user?.avatar || user?.profile_pic;
    const finalImg = profileImage && profileImage !== 'null' ? (profileImage.startsWith('http') || profileImage.startsWith('data:') ? profileImage : `${BASE_URL}${profileImage.startsWith('/') ? '' : '/'}${profileImage}`) : null;
    const theme = getTheme(user?.role);
    const [winWidth, setWinWidth] = React.useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <header style={{
            backgroundColor: '#a7d6da',
            padding: winWidth < 768 ? '0 15px' : '0 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            height: winWidth < 768 ? '65px' : '80px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            borderBottom: '2px solid rgba(255,255,255,0.2)',
            pointerEvents: isBlocked ? 'none' : 'auto',
            opacity: isBlocked ? 0.7 : 1
        }}>
            <div
                onClick={() => setActiveTab('HOME')}
                style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '5px' : '15px', cursor: 'pointer', flexShrink: 0 }}
            >
                <img src={logo} alt="Logo" style={{ height: winWidth < 768 ? '55px' : '95px', width: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', objectFit: 'contain' }} />
                <h1 style={{ margin: 0, fontSize: winWidth < 768 ? '12px' : '20px', fontWeight: '900', color: '#0B1E3F', letterSpacing: '-1px', whiteSpace: 'nowrap' }}>NBT HUB</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '8px' : '20px', minWidth: 0 }}>
                {/* Achievements/Badges Icon */}
                <motion.div
                    whileHover={{ scale: 1.05, backgroundColor: 'white' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('AWARDS')}
                    style={{
                        position: 'relative',
                        cursor: 'pointer',
                        padding: winWidth < 768 ? '6px' : '10px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        border: '1.5px solid rgba(255,255,255,0.5)',
                        flexShrink: 0
                    }}
                    title="Awards and Recognization"
                >
                    <Trophy size={winWidth < 768 ? 18 : 22} color="#f59e0b" fill="#fef3c7" />
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#10b981',
                        borderRadius: '50%',
                        border: '2px solid white'
                    }} />
                </motion.div>

                <div style={{ textAlign: 'right', display: winWidth < 480 ? 'none' : 'block', minWidth: 0 }}>
                    <div style={{ fontSize: winWidth < 768 ? '10px' : '18px', fontWeight: '1000', color: '#0B1E3F', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                    <div style={{
                        display: winWidth < 768 ? 'none' : 'block',
                        fontSize: '11px', fontWeight: '1000', color: '#7c3aed', opacity: 1, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '4px'
                    }}>
                        {isNewJoinee ? 'TRAINEE ENGINEER' : (user?.designation || user?.role || theme.label)}
                    </div>
                </div>
                <div
                    title="My Documents & Profile"
                    onClick={() => setActiveTab('DOCUMENTS')}
                    style={{
                        width: winWidth < 768 ? '35px' : '50px',
                        height: winWidth < 768 ? '35px' : '50px',
                        borderRadius: '50%',
                        border: winWidth < 768 ? '2px solid white' : '3px solid white',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
                >
                    {finalImg ? (
                        <img
                            src={finalImg}
                            alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <User size={20} color="#0B1E3F" />
                    )}
                </div>

                <div
                    onClick={logout}
                    style={{
                        padding: winWidth < 768 ? '7px' : '12px',
                        borderRadius: winWidth < 768 ? '10px' : '15px',
                        backgroundColor: 'white',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        marginLeft: '5px',
                        flexShrink: 0
                    }}
                    title="Logout Securely"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ef4444';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <LogOut size={winWidth < 768 ? 16 : 20} style={{ strokeWidth: '3px' }} />
                </div>
            </div>

        </header>
    );
};

export default Header;
