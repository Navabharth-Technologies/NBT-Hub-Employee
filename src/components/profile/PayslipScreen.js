import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/image.png';

export default function PayslipScreen({ onBack }) {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = false; // Forced false to maintain desktop layout as requested
  const handlePrint = () => window.print();

  // ── Shared cell helpers (desktop tables only) ──
  const cell = (extra = {}) => ({
    border: '1px solid #cbd5e1',
    padding: '12px 15px',
    fontSize: '13px',
    color: '#1e293b',
    ...extra
  });
  const labelCell = (extra = {}) => cell({ fontWeight: '800', color: '#0B1E3F', backgroundColor: '#f8fafc', ...extra });
  const valueCell = (extra = {}) => cell({ fontWeight: '600', color: '#334155', ...extra });

  // ── Data ──
  const earningRows  = [['Basic', '25,000'], ['HRA', '0'], ['Conveyance', '0'], ['Special Allowance', '0']];
  const incentiveRows = [['Performance', '0'], ['Yearly Incentive', '0']];
  const deductionRows = [['PF', '1,000'], ['ESI', '500'], ['PT', '100'], ['LWF', '0'], ['Income Tax', '0']];

  // ── Reusable section card (earnings / incentives / deductions) ──
  const SectionCard = ({ title, rows, total, totalLabel, color }) => (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: isMobile ? '10px' : '2px', overflow: 'hidden', flex: 1 }}>
      <div style={{ backgroundColor: '#f8fafc', padding: isMobile ? '8px 12px' : '10px 15px', fontSize: isMobile ? '11px' : '12px', fontWeight: '900', color: '#0B1E3F', borderBottom: '1px solid #cbd5e1' }}>
        {title}
      </div>
      {rows.map(([label, val], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: isMobile ? '7px 12px' : '10px 15px', borderBottom: '1px solid #f1f5f9', fontSize: isMobile ? '11px' : '12px' }}>
          <span style={{ color: '#64748b', fontWeight: '600' }}>{label}</span>
          <span style={{ color: '#1e293b', fontWeight: '700' }}>{val}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: isMobile ? '8px 12px' : '10px 15px', backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1', fontSize: isMobile ? '11px' : '12px', fontWeight: '900', color: '#0B1E3F' }}>
        <span>{totalLabel}</span>
        <span style={{ color: color || '#0B1E3F' }}>{total}</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '40px 20px 120px', fontFamily: "'Inter', sans-serif" }}>

      {/* Action bar */}
      <div className="no-print" style={{ maxWidth: '900px', margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '8px 14px' : '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#0B1E3F', fontWeight: '800', fontSize: isMobile ? '12px' : '13px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <ArrowLeft size={isMobile ? 16 : 18} /> Back
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '8px 12px' : '10px 18px', borderRadius: '10px', border: 'none', backgroundColor: 'white', color: '#0B1E3F', fontWeight: '800', fontSize: isMobile ? '11px' : '13px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <Printer size={isMobile ? 14 : 18} /> Print
          </button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '8px 12px' : '10px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '800', fontSize: isMobile ? '11px' : '13px', cursor: 'pointer' }}>
            <Download size={isMobile ? 14 : 18} /> Download
          </button>
        </div>
      </div>

      {/* Payslip document */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="printable-payslip"
        style={{ maxWidth: '900px', width: '100%', margin: '0 auto', backgroundColor: 'white', padding: '40px 30px 80px', borderRadius: '2px', boxShadow: '0 0 40px rgba(0,0,0,0.05)', position: 'relative', overflowX: 'auto', minHeight: '1100px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
      >
        {/* ── Decorative corner shapes ── */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: isMobile ? '100px' : '200px', height: isMobile ? '75px' : '150px', backgroundColor: '#1e3a8a', clipPath: 'polygon(100% 0, 100% 100%, 0 0)', opacity: 0.1, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: isMobile ? '75px' : '150px', height: isMobile ? '55px' : '110px', backgroundColor: '#1d4ed8', clipPath: 'polygon(100% 0, 100% 100%, 30% 0)', zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: isMobile ? '45px' : '90px', height: isMobile ? '40px' : '80px', backgroundColor: '#1e3a8a', clipPath: 'polygon(100% 0, 100% 100%, 60% 0)', zIndex: 1 }} />

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isMobile ? '20px' : '30px', position: 'relative', zIndex: 10 }}>
          <img src={logo} alt="NBT Logo" style={{ height: isMobile ? '55px' : '80px', marginBottom: isMobile ? '12px' : '20px' }} />
          <div style={{ fontSize: isMobile ? '16px' : '22px', fontWeight: '900', color: '#0B1E3F', letterSpacing: '0.5px', textAlign: 'center' }}>Navabharath Technologies</div>
          <div style={{ fontSize: isMobile ? '11px' : '13px', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px', marginTop: '4px', textAlign: 'center' }}>Smarter Solutions for Better Future</div>
          <div style={{ marginTop: isMobile ? '15px' : '25px', padding: '8px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', width: '100%', textAlign: 'center', fontSize: isMobile ? '11px' : '12px', fontWeight: '800', color: '#1e293b', letterSpacing: '0.5px' }}>
            Pay Slip for the Month of April - 2026
          </div>
        </div>

        {/* ── Employee Info ── */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          {isMobile ? (
            // Mobile: 2-column label+value card grid
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              {[
                ['Emp Code',    user?.employee_id || '202516'],
                ['Department',  user?.department  || 'Information Technology'],
                ['Emp. Name',   user?.name        || 'Sahana NV'],
                ['Designation', user?.designation || 'Lead Software Engineer'],
              ].map(([label, val], i) => (
                <div key={i} style={{
                  borderBottom: i < 2 ? '1px solid #cbd5e1' : 'none',
                  borderRight:  i % 2 === 0 ? '1px solid #cbd5e1' : 'none',
                }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '6px 10px', fontSize: '10px', fontWeight: '900', color: '#0B1E3F', borderBottom: '1px solid #e2e8f0' }}>{label}</div>
                  <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '600', color: '#334155', wordBreak: 'break-word' }}>{val}</div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: classic 4-column table
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={labelCell({ width: '20%' })}>Emp Code</td>
                  <td style={valueCell({ width: '30%' })}>{user?.employee_id || '202516'}</td>
                  <td style={labelCell({ width: '20%' })}>Department</td>
                  <td style={valueCell({ width: '30%' })}>{user?.department || 'Information Technology'}</td>
                </tr>
                <tr>
                  <td style={labelCell()}>Emp. Name</td>
                  <td style={valueCell()}>{user?.name || 'Sahana NV'}</td>
                  <td style={labelCell()}>Designation</td>
                  <td style={valueCell()}>{user?.designation || 'Lead Software Engineer'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* ── Attendance Summary ── */}
        <div style={{ position: 'relative', zIndex: 10, marginTop: '15px' }}>
          {isMobile ? (
            // Mobile: 2-column mini stat cards
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                ['Tot. Present', '31'], ['Tot. W/O', '4'],
                ['Tot. Holidays', '0'], ['Tot. Leave', '1'],
                ['Total Absent', '1'],  ['Total Work+OT', '1'],
                ['Total OT', '1'],      ['BS/Ref. Amt.', '5000'],
              ].map(([label, val], i) => (
                <div key={i} style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '5px 8px', fontSize: '9px', fontWeight: '900', color: '#0B1E3F', borderBottom: '1px solid #e2e8f0' }}>{label}</div>
                  <div style={{ padding: '5px 8px', fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{val}</div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: 8-column table
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  {[['Tot. pre:', '31'], ['Tot. wo:', '4'], ['Tot. hl:', '0'], ['Tot. leave:', '1']].map(([l, v], i) => (
                    <React.Fragment key={i}>
                      <td style={labelCell({ width: '15%' })}>{l}</td>
                      <td style={cell({ textAlign: 'right', width: '10%', fontWeight: '700' })}>{v}</td>
                    </React.Fragment>
                  ))}
                </tr>
                <tr>
                  {[['Total absent', '1'], ['Total work+ot', '1'], ['Total ot', '1'], ['Bs/reference amt.', '5000']].map(([l, v], i) => (
                    <React.Fragment key={i}>
                      <td style={labelCell({ width: '15%' })}>{l}</td>
                      <td style={cell({ textAlign: 'right', width: '10%', fontWeight: '700' })}>{v}</td>
                    </React.Fragment>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* ── Earnings / Incentives / Deductions ── */}
        <div style={{ marginTop: '20px', position: 'relative', zIndex: 10 }}>
          {/* Section header labels */}
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: 'none' }}>
              {['Earning', 'Incentives', 'Deduction'].map(t => (
                <div key={t} style={{ backgroundColor: '#f8fafc', padding: '10px 15px', fontSize: '12px', fontWeight: '900', color: '#0B1E3F', border: '1px solid #cbd5e1', borderBottom: 'none' }}>{t}</div>
              ))}
            </div>
          )}

          {/* Cards — stacked on mobile, side-by-side on desktop */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0' }}>
            <SectionCard title="Earning"    rows={earningRows}   total="30,000" totalLabel="Total Earning"  color="#16a34a" />
            <SectionCard title="Incentives" rows={incentiveRows} total="0"      totalLabel="Total Incent."  />
            <SectionCard title="Deduction"  rows={deductionRows} total="1,600"  totalLabel="Total Deduct."  color="#ef4444" />
          </div>

          {/* Net Payable */}
          <div style={{ border: '1px solid #cbd5e1', borderTop: isMobile ? '1px solid #cbd5e1' : 'none', borderRadius: isMobile ? '10px' : '0', overflow: 'hidden', marginTop: isMobile ? '12px' : '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#eef2ff' }}>
              <span style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '900', color: '#0B1E3F' }}>Net Payable</span>
              <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: '#1e40af' }}>₹ 28,400</span>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{ marginTop: '30px', fontSize: isMobile ? '10px' : '11px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          This is a computer generated payslip and does not require a physical signature.
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-end', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: isMobile ? 'center' : 'right', fontSize: isMobile ? '10px' : '11px', color: '#1e3a8a', fontWeight: '700', lineHeight: '1.6' }}>
            Phone: 0821-3128831<br />
            www.navabharathtechnologies.com<br />
            contact@navabharathtechnologies.com
          </div>
        </div>

        {/* ── Bottom decorative shapes ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: isMobile ? '100px' : '200px', height: isMobile ? '75px' : '150px', backgroundColor: '#3b82f6', clipPath: 'polygon(0 0, 0 100%, 100% 100%)', opacity: 0.1, zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: isMobile ? '75px' : '150px', height: isMobile ? '55px' : '110px', backgroundColor: '#2563eb', clipPath: 'polygon(0 30%, 0 100%, 70% 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: isMobile ? '45px' : '90px', height: isMobile ? '40px' : '80px', backgroundColor: '#1e40af', clipPath: 'polygon(0 60%, 0 100%, 40% 100%)', zIndex: 1 }} />

        <style>{`
          @media print {
            .no-print { display: none; }
            body { background: white; padding: 0; }
            .printable-payslip { box-shadow: none !important; margin: 0 !important; padding: 40px !important; width: 100% !important; max-width: none !important; }
          }
        `}</style>
      </motion.div>
    </div>
  );
}
