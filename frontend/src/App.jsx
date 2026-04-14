import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Plus, Search, Trash2, Download, Copy, Menu, X, CheckCircle, 
  Loader2, FileText, ChevronLeft, ChevronRight, Bold, Italic, 
  List, Code, Link as LinkIcon, Type, ListOrdered, Sun, Moon, 
  AlignLeft, User as UserIcon, LogOut, History, RotateCcw
} from 'lucide-react';
import { api } from './api';
import './App.css';

// --- Auth Component ---
const AuthOverlay = ({ onLogin, mode, setMode }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await api.login(username, password);
        onLogin(data.user);
      } else {
        await api.signup(username, password);
        setMode('login');
        alert('Account created! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2 className="auth-title">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label>Username</label>
            <input 
              className="auth-input" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter username"
            />
          </div>
          <div className="auth-input-group">
            <label>Password</label>
            <input 
              className="auth-input" 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}
          <button className="btn-auth" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : (mode === 'login' ? 'Login' : 'Sign Up')}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </span>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [savingStatus, setSavingStatus] = useState('All changes saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLinedPaper, setIsLinedPaper] = useState(false);
  
  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  const saveTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      fetchNotes();
    }
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data || []);
      if (data && data.length > 0 && !activeNoteId) {
        setActiveNoteId(data[0].id);
      }
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    fetchNotes();
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setNotes([]);
    setActiveNoteId(null);
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await api.createNote('Untitled Document', '', '');
      setNotes([newNote, ...notes]);
      setActiveNoteId(newNote.id);
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteNote(id);
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      if (activeNoteId === id) {
        setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = (id, updates) => {
    setSavingStatus('Saving...');
    setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.updateNote(id, updates.title, updates.content, updates.tags);
        setSavingStatus('Saved');
        setTimeout(() => setSavingStatus('All changes saved'), 2000);
      } catch (err) {
        console.error(err);
      }
    }, 1500); // 1.5s debounce for brownie points
  };

  const fetchHistory = async () => {
    if (!activeNoteId) return;
    try {
      const data = await api.getHistory(activeNoteId);
      setHistoryList(data);
      setIsHistoryOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const restoreVersion = (content) => {
    if (confirm('Restore this version? current draft will be overwritten.')) {
      handleUpdate(activeNoteId, { ...activeNote, content });
      setIsHistoryOpen(false);
    }
  };

  const applyFormat = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeNote.content;
    const selection = text.substring(start, end);

    let formatted = '';

    switch (type) {
      case 'bold': formatted = `**${selection || 'bold text'}**`; break;
      case 'italic': formatted = `*${selection || 'italic text'}*`; break;
      case 'list': formatted = `\n- ${selection || 'list item'}`; break;
      case 'ordered-list': formatted = `\n1. ${selection || 'list item'}`; break;
      case 'code': formatted = `\`${selection || 'code'}\``; break;
      case 'link': formatted = `[${selection || 'link text'}](https://example.com)`; break;
      case 'h1': formatted = `\n# ${selection || 'Heading 1'}`; break;
      case 'h2': formatted = `\n## ${selection || 'Heading 2'}`; break;
      default: return;
    }

    const newContent = text.substring(0, start) + formatted + text.substring(end);
    handleUpdate(activeNote.id, { ...activeNote, content: newContent });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formatted.length, start + formatted.length);
    }, 0);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);
  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.tags && n.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString.replace(' ', 'T') + 'Z');
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!user) return <AuthOverlay onLogin={handleLogin} mode={authMode} setMode={setAuthMode} />;

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-title-row">
            <span className="sidebar-title">Documents</span>
            <button className="btn-action" onClick={() => setIsSidebarOpen(false)}>
               <ChevronLeft size={18} />
            </button>
          </div>
          <button className="btn-new" onClick={handleCreateNote}>
            <Plus size={18} /> Create New
          </button>
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="notes-list">
          {filteredNotes.map(n => (
            <div 
              key={n.id} 
              className={`note-item ${activeNoteId === n.id ? 'active' : ''}`}
              onClick={() => {
                setActiveNoteId(n.id);
                if (window.innerWidth <= 768) setIsSidebarOpen(false);
              }}
            >
              <div className="note-content-wrapper">
                <div className="note-title">{n.title || 'Untitled'}</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {n.tags && n.tags.split(',').filter(t => t.trim()).map(tag => (
                    <span key={tag} className="tag-badge">{tag.trim()}</span>
                  ))}
                </div>
                <div className="note-meta-row">
                   <span className="note-date">{formatDate(n.updated_at)}</span>
                   <span className="note-preview">{n.content.slice(0, 20)}...</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="user-profile">
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserIcon size={16} />
              <span>{user.username}</span>
           </div>
           <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={16} /> Logout
           </button>
        </div>
      </div>

      <div className="main-area">
        {!isSidebarOpen && (
          <button className="btn-action sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
            <ChevronRight size={18} />
          </button>
        )}
        
        {activeNote ? (
          <>
            <div className="editor-header">
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <input 
                  className="title-input"
                  value={activeNote.title}
                  onChange={(e) => handleUpdate(activeNote.id, { ...activeNote, title: e.target.value })}
                  placeholder="Document Title"
                />
                <input 
                  className="tags-input"
                  value={activeNote.tags || ''}
                  onChange={(e) => handleUpdate(activeNote.id, { ...activeNote, tags: e.target.value })}
                  placeholder="Tags (comma separated)"
                />
              </div>
              <div className="header-actions">
                <span className="save-status">
                  {savingStatus === 'Saving...' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} style={{ color: 'var(--primary)' }} />}
                  {' '}{savingStatus}
                </span>
                <button className="btn-action" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Dark Mode">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button className="btn-action" onClick={() => setIsLinedPaper(!isLinedPaper)} title="Notebook Mode">
                  <AlignLeft size={18} />
                </button>
                <button className="btn-action" onClick={fetchHistory} title="Version History">
                  <History size={18} />
                </button>
                <button className="btn-action" onClick={() => {
                  const blob = new Blob([activeNote.content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeNote.title}.doc`;
                  a.click();
                }} title="Download Document">
                  <Download size={18} />
                </button>
                <button className="btn-action" onClick={() => handleDeleteNote(activeNote.id)} title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="split-view">
              <div className="pane">
                <div className="pane-header editor-pane-header">
                   <span>Writing</span>
                   <div className="toolbar">
                      <button className="toolbar-btn" onClick={() => applyFormat('bold')} title="Bold"><Bold size={14}/></button>
                      <button className="toolbar-btn" onClick={() => applyFormat('italic')} title="Italic"><Italic size={14}/></button>
                      <button className="toolbar-btn" onClick={() => applyFormat('h1')}>H1</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('h2')}>H2</button>
                      <button className="toolbar-btn" onClick={() => applyFormat('list')}><List size={14}/></button>
                      <button className="toolbar-btn" onClick={() => applyFormat('ordered-list')}><ListOrdered size={14}/></button>
                      <button className="toolbar-btn" onClick={() => applyFormat('code')}><Code size={14}/></button>
                      <button className="toolbar-btn" onClick={() => applyFormat('link')}><LinkIcon size={14}/></button>
                   </div>
                </div>
                <textarea 
                  ref={textareaRef}
                  className="markdown-input"
                  value={activeNote.content}
                  onChange={(e) => handleUpdate(activeNote.id, { ...activeNote, content: e.target.value })}
                  placeholder="Tell your story..."
                />
              </div>
              <div className="pane preview-pane-wrap">
                <div className="pane-header">Live Preview</div>
                <div className="preview-container">
                  <div className={`markdown-preview ${isLinedPaper ? 'lined-paper' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeNote.content || "*Your preview will appear here...*"}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-view">
            <FileText size={64} style={{ opacity: 0.2 }} />
            <h1>No Document Selected</h1>
            <p>Choose a document or create a new one to get started.</p>
            <button className="btn-new" onClick={handleCreateNote} style={{ width: 'auto', marginTop: '1.5rem', padding: '0.75rem 2rem' }}>Create Document</button>
          </div>
        )}
      </div>

      {/* History Sidebar Overlay */}
      {isHistoryOpen && (
        <div className="auth-overlay" onClick={() => setIsHistoryOpen(false)}>
           <div className="history-sidebar" onClick={e => e.stopPropagation()}>
              <div className="history-title">
                 <span>Version History</span>
                 <button className="btn-action" onClick={() => setIsHistoryOpen(false)}><X size={18} /></button>
              </div>
              <div className="history-list">
                 {historyList.length > 0 ? historyList.map(item => (
                   <div key={item.id} className="history-item" onClick={() => restoreVersion(item.content)}>
                      <div className="history-date">
                         <RotateCcw size={12} style={{ marginRight: '4px' }} />
                         {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="history-preview">{item.content.slice(0, 50)}...</div>
                   </div>
                 )) : <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>No history found</div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
