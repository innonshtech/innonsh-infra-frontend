import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PageWrapper from '../../components/layout/PageWrapper';
import { aiService } from '../../services/api';
import {
  Sparkles, Send, Plus, Trash2, Bot, User, 
  MessageSquare, Loader2, ArrowRight, HelpCircle, FileText, Clipboard, Menu, X
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './AiBoard.css';

export default function AiBoardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Load chat sessions on mount or when routing state changes
  useEffect(() => {
    const routeSessionId = location.state?.openSessionId;
    if (routeSessionId) {
      fetchSessions(routeSessionId);
    } else {
      fetchSessions();
    }
  }, [location.state?.openSessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async (selectId = null) => {
    try {
      setSidebarLoading(true);
      const res = await aiService.getSessions();
      const list = res.data?.data || res.data || [];
      setSessions(list);

      // Optionally auto-select a session if requested
      if (selectId) {
        setActiveSessionId(selectId);
        loadSessionDetails(selectId);
      }
    } catch (err) {
      toast.error('Failed to load chat history.');
    } finally {
      setSidebarLoading(false);
    }
  };

  const loadSessionDetails = async (id) => {
    try {
      setLoading(true);
      setApiKeyError(false);
      setSidebarOpen(false); // Close sidebar on mobile
      const res = await aiService.getSessionById(id);
      const session = res.data?.data || res.data;
      if (session) {
        setMessages(session.messages || []);
        setActiveSessionId(id);
      }
    } catch (err) {
      toast.error('Failed to load chat content.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setApiKeyError(false);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    // Clear text field
    if (!textToSend) setInput('');
    setApiKeyError(false);

    // Append user message locally first
    const tempUserMsg = {
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await aiService.chat({
        sessionId: activeSessionId,
        message: { role: 'user', text }
      });

      const responseData = res.data?.data || res.data;
      if (responseData) {
        setMessages(responseData.messages || []);
        
        // If it was a new session, update active ID and refresh history list
        if (!activeSessionId) {
          const newId = responseData.sessionId;
          setActiveSessionId(newId);
          await fetchSessions(newId);
        } else {
          // Simply refresh history list to update timestamps/titles
          await fetchSessions();
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || '';
      console.error(err);
      
      if (errorMsg.includes('GEMINI_API_KEY')) {
        setApiKeyError(true);
        toast.error('Gemini API Key is not configured!');
      } else {
        toast.error('Failed to get response from AI.');
      }

      // Remove the last user message if it failed to send/generate response
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;

    try {
      await aiService.deleteSession(id);
      toast.success('Session deleted');
      
      if (activeSessionId === id) {
        startNewChat();
      }
      fetchSessions();
    } catch (err) {
      toast.error('Failed to delete chat session.');
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Text copied to clipboard!');
  };

  // Helper function to format text with Markdown-style logic (code snippets, lists, bold)
  const formatMessageText = (text) => {
    if (!text) return '';

    // Escape HTML tags to prevent XSS
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Handle code blocks (triple backticks)
    formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
    });

    // Handle inline code (single backticks)
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Handle markdown headers (# Heading, ## Heading, etc.)
    formatted = formatted.replace(/^\s*#{1,6}\s+(.+)$/gm, '<h4 style="font-weight: 700; color: #1e293b; margin-top: 12px; margin-bottom: 6px;">$1</h4>');

    // Handle bold (**text**)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Handle bullet lists (bullet starting with - or *)
    formatted = formatted.replace(/^\s*[-*]\s+(.+)$/gm, '<li style="margin-left: 16px; list-style-type: disc; margin-top: 4px; margin-bottom: 4px;">$1</li>');
    formatted = formatted.replace(/(<li style="[^"]*">.*<\/li>)/s, '<ul>$1</ul>');

    // Convert newlines to breaks
    return formatted.replace(/\n/g, '<br />');
  };

  // Preset starter suggestions
  const starterPrompts = [
    {
      title: 'Estimate Concrete Vol',
      desc: 'Calculate material yields for RCC slab work.',
      icon: FileText,
      prompt: 'How do I calculate the volume of concrete, cement bags, sand, and aggregate required for a roof slab size of 12m x 8m with a thickness of 150mm using standard M20 grade mix?'
    },
    {
      title: 'Site Safety Protocol',
      desc: 'Create safety instructions for heavy machinery.',
      icon: HelpCircle,
      prompt: 'Draft a comprehensive site safety checklist for deploying heavy equipment like tower cranes and excavators in a congested high-rise construction zone.'
    },
    {
      title: 'Material Check List',
      desc: 'Draft standard quality checks for incoming steel.',
      icon: Clipboard,
      prompt: 'What are the standard on-site quality testing checks we must perform when receiving structural TMT steel reinforcement bars at the warehouse?'
    }
  ];

  return (
    <div className="ai-board-page-wrapper">
      <div className="ai-board-container">
        {/* Sidebar History Panel */}
        <div className={`ai-board-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header-mobile">
            <span>Conversations</span>
            <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)} title="Close History">
              <X size={20} />
            </button>
          </div>

          <button className="new-chat-btn" onClick={startNewChat}>
            <Plus size={18} />
            <span>New Conversation</span>
          </button>

          <div className="chat-history-title">Recent Conversations</div>
          
          <div className="sessions-list">
            {sidebarLoading && sessions.length === 0 ? (
              <div className="sidebar-loader">
                <Loader2 className="spinner" size={24} />
              </div>
            ) : sessions.length === 0 ? (
              <div className="empty-history">
                <MessageSquare size={32} />
                <span>No previous chats</span>
              </div>
            ) : (
              sessions.map(s => (
                <div 
                  key={s.id} 
                  className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                  onClick={() => loadSessionDetails(s.id)}
                >
                  <MessageSquare size={16} />
                  <span className="session-title" title={s.title}>{s.title}</span>
                  <button 
                    className="delete-session-btn"
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Chat Workspace */}
        <div className="ai-board-workspace">
          <div className="workspace-header">
            <button className="mobile-toggle-btn" onClick={() => setSidebarOpen(true)} title="View Chat History">
              <Menu size={18} />
              <span>History</span>
            </button>
            <div className="workspace-header-title">
              <Sparkles size={16} className="sparkles-icon" />
              <span>Gemini 2.5 Flash</span>
              <span className="model-badge">Free Tier</span>
            </div>
            <button className="clear-chat-btn" onClick={startNewChat} title="New Chat">
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </div>

          {apiKeyError && (
            <div className="api-key-error-banner">
              <Sparkles size={20} className="pulse-icon" />
              <div>
                <strong>Gemini API Key Missing</strong>
                <p>Please paste your free Gemini API Key inside <code>innonsh-infra-backend/.env</code> as <code>GEMINI_API_KEY=your_key</code> to enable AI replies.</p>
              </div>
            </div>
          )}

          <div className="messages-panel">
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <div className="gemini-intro-icon">
                  <Sparkles size={48} />
                </div>
                <h2>Hello, {user?.firstName || 'Builder'}.</h2>
                <p className="greeting-sub">How can I assist you with your construction projects or estimations today?</p>
                
                <div className="starter-prompts-grid">
                  {starterPrompts.map((card, i) => (
                    <div 
                      key={i} 
                      className="starter-card" 
                      onClick={() => handleSend(card.prompt)}
                    >
                      <div className="starter-header">
                        <card.icon size={18} className="starter-icon" />
                        <span className="starter-title">{card.title}</span>
                      </div>
                      <p className="starter-desc">{card.desc}</p>
                      <div className="starter-footer">
                        <span>Ask AI</span>
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message-bubble-wrapper ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className="message-bubble-container">
                      <div className="message-meta">
                        <span className="sender-name">
                          {msg.role === 'assistant' ? 'Gemini 2.5' : `${user?.firstName} ${user?.lastName}`}
                        </span>
                        <span className="message-time">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div 
                        className="message-bubble-content"
                        dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }}
                      />
                      <button 
                        className="copy-message-btn" 
                        onClick={() => handleCopyText(msg.text)}
                        title="Copy text"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="message-bubble-wrapper assistant loading">
                    <div className="message-avatar">
                      <Bot size={16} />
                    </div>
                    <div className="message-bubble-container">
                      <div className="message-meta">
                        <span className="sender-name">Gemini 2.5</span>
                      </div>
                      <div className="typing-loader">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-area">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="chat-input-form"
            >
              <input
                type="text"
                placeholder="Ask Gemini about estimates, tasks, materials..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                className="chat-submit-btn" 
                disabled={loading || !input.trim()}
              >
                {loading ? <Loader2 className="spinner" size={18} /> : <Send size={18} />}
              </button>
            </form>
            <div className="chat-disclaimer">
              Gemini 1.5 Flash may produce inaccurate results. Verify structural drawings or material grades independently.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
