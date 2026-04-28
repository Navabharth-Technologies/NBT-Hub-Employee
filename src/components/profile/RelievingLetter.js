import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/image.png';

export default function RelievingLetter({ onBack }) {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '40px 20px 120px',
      fontFamily: "'Inter', sans-serif"
    },
    paper: {
      maxWidth: '850px',
      margin: '0 auto',
      backgroundColor: 'white',
      padding: '80px 100px',
      borderRadius: '2px',
      boxShadow: '0 0 40px rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '1100px',
      display: 'flex',
      flexDirection: 'column'
    },
    // Top geometric shapes (replicating Image 1)
    topShape: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: '350px',
      height: '350px',
      backgroundColor: '#3b82f6',
      clipPath: 'polygon(100% 0, 100% 100%, 20% 0)',
      opacity: 0.1,
      zIndex: 1
    },
    topShapePrimary: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: '280px',
      height: '280px',
      backgroundColor: '#1d4ed8',
      clipPath: 'polygon(100% 0, 100% 100%, 40% 0)',
      zIndex: 1
    },
    topShapeSecondary: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: '200px',
      height: '200px',
      backgroundColor: '#1e3a8a',
      clipPath: 'polygon(100% 0, 100% 80%, 60% 0)',
      zIndex: 1
    },
    // Bottom geometric shapes
    bottomShape: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '350px',
      height: '350px',
      backgroundColor: '#3b82f6',
      clipPath: 'polygon(0 30%, 0 100%, 80% 100%)',
      opacity: 0.1,
      zIndex: 1
    },
    bottomShapePrimary: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '280px',
      height: '280px',
      backgroundColor: '#1d4ed8',
      clipPath: 'polygon(0 60%, 0 100%, 60% 100%)',
      zIndex: 1
    },
    bottomShapeSecondary: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '180px',
      height: '180px',
      backgroundColor: '#1e3a8a',
      clipPath: 'polygon(0 80%, 0 100%, 40% 100%)',
      zIndex: 1
    },
    header: {
      marginBottom: '40px',
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start'
    },
    logo: {
      height: '80px',
      marginBottom: '10px'
    },
    content: {
      fontSize: '15px',
      lineHeight: '1.8',
      color: '#334155',
      position: 'relative',
      zIndex: 10,
      marginTop: '40px',
      paddingBottom: '160px'
    },
    date: {
      fontWeight: '800',
      textDecoration: 'underline',
      marginBottom: '40px'
    },
    recipient: {
      fontWeight: '1000',
      color: '#0f172a',
      marginBottom: '50px',
      fontSize: '17px'
    },
    bodyParagraph: {
      marginBottom: '25px',
      textAlign: 'justify'
    },
    closing: {
      marginTop: '60px'
    },
    signatureBlock: {
      marginTop: '40px',
      fontSize: '14px',
      lineHeight: '1.6',
      paddingLeft: '20px'
    },
    footerInfo: {
      marginTop: 'auto',
      marginLeft: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      position: 'relative',
      zIndex: 10,
      textAlign: 'right'
    },
    footerItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '10px',
      color: '#1e3a8a',
      fontSize: '12px',
      fontWeight: '800'
    },
    actionHeader: {
      maxWidth: '850px',
      margin: '0 auto 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: 'white',
      color: '#0B1E3F',
      fontWeight: '800',
      fontSize: '13px',
      cursor: 'pointer',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.actionHeader}>
        <button style={styles.button} onClick={onBack}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button style={styles.button} onClick={() => window.print()}>
            <Printer size={18} /> Print
          </button>
          <button style={{ ...styles.button, backgroundColor: '#0B1E3F', color: 'white' }} onClick={() => window.print()}>
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.paper}
        className="printable-area"
      >
        <div style={styles.topShape}></div>
        <div style={styles.topShapePrimary}></div>
        <div style={styles.topShapeSecondary}></div>

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.04, zIndex: 0, pointerEvents: 'none' }}>
          <img src={logo} alt="Watermark" style={{ width: '500px', filter: 'grayscale(100%)' }} />
        </div>

        <div style={styles.header}>
          <img src={logo} alt="Company Logo" style={styles.logo} />
          <div style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', letterSpacing: '2px' }}>
            NAVABHARATH TECHNOLOGIES
          </div>
        </div>

        <div style={styles.content}>
          <div style={{ fontSize: '28px', fontWeight: '1000', color: '#1e3a8a', textAlign: 'center', textDecoration: 'underline', textUnderlineOffset: '8px', margin: '20px 0 60px' }}>
            RELIEVING LETTER
          </div>
          <div style={styles.date}>Date: {today}</div>
          <div style={styles.recipient}>To Whomsoever It May Concern</div>

          <div style={styles.bodyParagraph}>
            This is to certify that <strong>{user?.role === 'female' ? 'Ms.' : 'Mr.'} {user?.name || '[Employee Name]'}</strong>, EMPLOYEE, Employee ID <strong>[{user?.employee_id || user?.id || 'Employee ID'}]</strong>, was employed with NAVABHARATH TECHNOLOGIES as <strong>[{user?.designation || user?.role || 'Designation'}]</strong> in the <strong>[Department Name]</strong> from <strong>[Date of Joining]</strong> to <strong>[Last Working Date]</strong>.
          </div>

          <div style={styles.bodyParagraph}>
            {user?.role === 'female' ? 'She' : 'He'} has been relieved from the services of the Company with effect from the close of business hours on <strong>[Last Working Date]</strong>.
          </div>

          <div style={styles.bodyParagraph}>
            We confirm that all required handover formalities and company clearance procedures have been completed.
          </div>

          <div style={styles.bodyParagraph}>
            This letter is issued upon the request of the employee for official purposes.
          </div>

          <div style={styles.closing}>
            <div style={{ fontWeight: '1000', marginBottom: '40px' }}>For NAVABHARATH TECHNOLOGIES</div>
            <div style={{ marginBottom: '40px', fontStyle: 'italic', opacity: 0.5 }}>(Signature)</div>
            
            <div style={styles.signatureBlock}>
              <div style={{ fontWeight: '1000' }}>Authorized Signatory Name</div>
              <div>Designation</div>
              <div>Company Seal</div>
            </div>
          </div>
        </div>

        <div style={styles.footerInfo}>
          <div style={styles.footerItem}>
            <span>Phone: 0821-3128831</span>
            <div style={{ width: '40px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
          </div>
          <div style={styles.footerItem}>
            <span>www.navabharathtechnologies.com</span>
            <div style={{ width: '40px', height: '14px', backgroundColor: '#1d4ed8', borderRadius: '4px' }}></div>
          </div>
          <div style={styles.footerItem}>
            <span>contact@navabharathtechnologies.com</span>
            <div style={{ width: '40px', height: '14px', backgroundColor: '#1e3a8a', borderRadius: '4px' }}></div>
          </div>
        </div>

        <div style={styles.bottomShape}></div>
        <div style={styles.bottomShapePrimary}></div>
        <div style={styles.bottomShapeSecondary}></div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .printable-area, .printable-area * { visibility: visible; }
            .printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; }
            button { display: none; }
          }
        `}</style>
      </motion.div>
    </div>
  );
}
