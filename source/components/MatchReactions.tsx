import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, MessageCircle, ChevronDown, ChevronUp, Send } from 'lucide-react';

interface ReactionData {
  emojis: { [emoji: string]: string[] }; // emoji -> array of userIds
  comments: { userId: string; text: string; createdAt: string }[];
}

interface MatchReactionsProps {
  matchId: string;
  currentUserId?: string;
}

const PRESET_EMOJIS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '💀', label: 'Skull' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🏆', label: 'Trophy' },
];

const STORAGE_KEY_PREFIX = 'cyberpong_reactions_';

function loadReactions(matchId: string): ReactionData {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${matchId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { emojis: {}, comments: [] };
}

function saveReactions(matchId: string, data: ReactionData) {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${matchId}`, JSON.stringify(data));
}

const MatchReactions: React.FC<MatchReactionsProps> = ({ matchId, currentUserId }) => {
  const [data, setData] = useState<ReactionData>(() => loadReactions(matchId));
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const userId = currentUserId || 'anonymous';

  // Persist changes
  useEffect(() => {
    saveReactions(matchId, data);
  }, [data, matchId]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const toggleReaction = useCallback((emoji: string) => {
    setData(prev => {
      const next = { ...prev, emojis: { ...prev.emojis } };
      const users = next.emojis[emoji] ? [...next.emojis[emoji]] : [];
      const idx = users.indexOf(userId);
      if (idx >= 0) {
        users.splice(idx, 1);
      } else {
        users.push(userId);
      }
      if (users.length === 0) {
        delete next.emojis[emoji];
      } else {
        next.emojis[emoji] = users;
      }
      return next;
    });
  }, [userId]);

  const addComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed || trimmed.length > 200) return;
    setData(prev => ({
      ...prev,
      comments: [
        ...prev.comments,
        { userId, text: trimmed, createdAt: new Date().toISOString() },
      ],
    }));
    setCommentText('');
  }, [commentText, userId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment();
    }
  };

  // Active emojis (count > 0)
  const activeEmojis = PRESET_EMOJIS.filter(e => (data.emojis[e.emoji]?.length ?? 0) > 0);
  const commentCount = data.comments.length;

  return (
    <div className="mt-2 pt-2 border-t border-white/5">
      {/* Emoji reactions row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {activeEmojis.map(({ emoji }) => {
          const count = data.emojis[emoji]?.length ?? 0;
          const isActive = data.emojis[emoji]?.includes(userId);
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className={`
                inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
                transition-all duration-200 select-none
                ${isActive
                  ? 'bg-cyber-cyan/10 border border-cyber-cyan/40 shadow-[0_0_6px_rgba(0,243,255,0.15)]'
                  : 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.08]'
                }
              `}
              title={PRESET_EMOJIS.find(e => e.emoji === emoji)?.label}
            >
              <span className="text-sm leading-none">{emoji}</span>
              <span className={`font-mono text-[10px] ${isActive ? 'text-cyber-cyan' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Add reaction button */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-gray-500 hover:text-gray-300 transition-colors"
            title="Add reaction"
          >
            <Plus size={12} />
          </button>

          {/* Emoji picker dropdown */}
          {showPicker && (
            <div className="absolute bottom-full left-0 mb-1 z-30 glass-panel rounded-lg p-1.5 flex gap-1 shadow-xl border border-white/10">
              {PRESET_EMOJIS.map(({ emoji, label }) => {
                const isActive = data.emojis[emoji]?.includes(userId);
                return (
                  <button
                    key={emoji}
                    onClick={() => { toggleReaction(emoji); setShowPicker(false); }}
                    className={`
                      w-8 h-8 rounded-md flex items-center justify-center text-lg
                      transition-colors hover:bg-white/10
                      ${isActive ? 'bg-cyber-cyan/10 ring-1 ring-cyber-cyan/40' : ''}
                    `}
                    title={label}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Comment toggle */}
        {(commentCount > 0 || showComments) && (
          <button
            onClick={() => setShowComments(s => !s)}
            className="inline-flex items-center gap-1 ml-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <MessageCircle size={10} />
            <span className="font-mono">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
            {showComments ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-2 space-y-1.5">
          {data.comments.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className="text-gray-500 font-mono shrink-0">
                {c.userId === userId ? 'You' : c.userId.slice(0, 8)}
              </span>
              <span className="text-gray-400 break-words">{c.text}</span>
            </div>
          ))}

          {/* Comment input */}
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value.slice(0, 200))}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment…"
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-md px-2 py-1 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-cyber-cyan/40 transition-colors"
            />
            <button
              onClick={addComment}
              disabled={!commentText.trim()}
              className="p-1 text-gray-500 hover:text-cyber-cyan disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Show comment input even if no comments yet (when comments section is hidden) */}
      {!showComments && commentCount === 0 && (
        <button
          onClick={() => setShowComments(true)}
          className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          <MessageCircle size={10} />
          <span className="font-mono">comment</span>
        </button>
      )}
    </div>
  );
};

export default MatchReactions;
