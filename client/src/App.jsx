import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { usePrivacy } from './PrivacyContext';
import TeamList from './pages/TeamList';
import MemberDetail from './pages/MemberDetail';
import OrgChart from './pages/OrgChart';
import PlannedHires from './pages/PlannedHires';
import Archive from './pages/Archive';
import Cost from './pages/Cost';
import TeamSkills from './pages/TeamSkills';

export default function App() {
  const { privateMode, toggle } = usePrivacy();
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#6366f1"/>
            <text x="16" y="22" fontSize="18" textAnchor="middle" fill="white" fontFamily="system-ui">T</text>
          </svg>
          <span>Team Effect</span>
        </div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
              Team
            </NavLink>
          </li>
          <li>
            <NavLink to="/org" className={({ isActive }) => isActive ? 'active' : ''}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
              Org Chart
            </NavLink>
          </li>
          <li>
            <NavLink to="/hires" className={({ isActive }) => isActive ? 'active' : ''}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/></svg>
              Planned Hires
            </NavLink>
          </li>
          <li>
            <NavLink to="/team-skills" className={({ isActive }) => isActive ? 'active' : ''}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zM6.5 9.5l1.5-3 2 4 1.5-2 1 1.5H15a5 5 0 10-10 0h1.5z" clipRule="evenodd"/></svg>
              Team Skills
            </NavLink>
          </li>
          <li>
            {privateMode ? (
              <span className="nav-link-disabled" title="Hidden in private mode">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
                Team Cost
              </span>
            ) : (
              <NavLink to="/cost" className={({ isActive }) => isActive ? 'active' : ''}>
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
                Team Cost
              </NavLink>
            )}
          </li>
          <li>
            <NavLink to="/archive" className={({ isActive }) => isActive ? 'active' : ''}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/></svg>
              Archive
            </NavLink>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button
            className={`privacy-toggle${privateMode ? ' privacy-toggle-on' : ''}`}
            onClick={toggle}
            title={privateMode ? 'Private mode on — click to disable' : 'Enable private mode for screen sharing'}
          >
            {privateMode ? (
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"/></svg>
            )}
            {privateMode ? 'Private: On' : 'Private Mode'}
          </button>
          <span className="sidebar-version">v1.0</span>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<TeamList />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          <Route path="/org" element={<OrgChart />} />
          <Route path="/hires" element={<PlannedHires />} />
          <Route path="/team-skills" element={<TeamSkills />} />
          <Route path="/cost" element={<Cost />} />
          <Route path="/archive" element={<Archive />} />
        </Routes>
      </main>
    </div>
  );
}
