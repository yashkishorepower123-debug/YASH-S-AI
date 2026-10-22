
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  AudioLines,
  Check,
  Copy,
  MessageSquare,
  Mic,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

const API_URL =
  'https://yashaibackend.yashkishorepower123.workers.dev/';

const HISTORY_KEY = 'yash-ai-conversations';
const ACTIVE_KEY = 'yash-ai-active';
const LEGACY_KEY = 'yash-ai-chat';
const MAX_CONVERSATIONS = 40;

const welcome: Message = {
  role: 'assistant',
  content:
    'Hello! Welcome to Yash AI. I’m here to help you learn, explore ideas, write code, solve problems, and get creative. What would you like to work on?',
};

const suggestions = [
  {
    icon: '✦',
    title: 'Explain a concept',
    prompt:
      'Explain how artificial intelligence works in simple terms.',
  },
  {
    icon: '⌘',
    title: 'Help me code',
    prompt:
      'Help me write a JavaScript function and explain how it works.',
  },
  {
    icon: '◷',
    title: 'Plan my day',
    prompt:
      'Help me make a balanced and productive plan for today.',
  },
  {
    icon: '↗',
    title: 'Explore an idea',
    prompt:
      'Suggest an interesting project I can build and learn from.',
  },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function titleFromMessages(messages: Message[]) {
  const firstUserMessage = messages.find(
    (message) => message.role === 'user',
  );

  if (!firstUserMessage) return 'New conversation';

  const title = firstUserMessage.content.replace(/\s+/g, ' ').trim();

  return title.length > 36 ? `${title.slice(0, 36)}…` : title;
}

function makeConversation(
  messages: Message[] = [welcome],
): Conversation {
  return {
    id: makeId(),
    title: titleFromMessages(messages),
    updatedAt: Date.now(),
    messages,
  };
}

function isMessageArray(value: unknown): value is Message[] {
  return (
    Array.isArray(value) &&
    value.every(
      (message) =>
        message &&
        (message.role === 'user' ||
          message.role === 'assistant') &&
        typeof message.content === 'string',
    )
  );
}

function readSavedConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);

    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is Conversation =>
            Boolean(
              item &&
                typeof item.id === 'string' &&
                typeof item.title === 'string' &&
                typeof item.updatedAt === 'number' &&
                isMessageArray(item.messages),
            ),
        );
      }

      return [];
    }

    // Migrate conversations from the older single-chat version.
    const legacy = localStorage.getItem(LEGACY_KEY);

    if (legacy) {
      const parsed: unknown = JSON.parse(legacy);

      if (isMessageArray(parsed)) {
        const migrated = makeConversation(parsed);

        localStorage.setItem(
          HISTORY_KEY,
          JSON.stringify([migrated]),
        );
        localStorage.setItem(ACTIVE_KEY, migrated.id);

        return [migrated];
      }
    }
  } catch (error) {
    console.warn('Could not load conversation history:', error);
  }

  return [];
}

function getInitialActiveId(
  conversations: Conversation[],
): string {
  try {
    const savedId = localStorage.getItem(ACTIVE_KEY);

    if (
      savedId &&
      conversations.some(
        (conversation) => conversation.id === savedId,
      )
    ) {
      return savedId;
    }
  } catch {
    // Use the first available conversation.
  }

  return conversations[0]?.id ?? '';
}

export default function App() {
  const [initialConversations] = useState<Conversation[]>(() => {
    const saved = readSavedConversations();

    return saved.length > 0
      ? saved
      : [makeConversation([welcome])];
  });

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);

  const [activeId, setActiveId] = useState(
    () => getInitialActiveId(initialConversations),
  );

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] =
    useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeId,
    ) ?? null;

  const messages = activeConversation?.messages ?? [welcome];

  const fresh =
    messages.length === 1 &&
    messages[0]?.role === 'assistant';

  useEffect(() => {
    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(conversations),
      );

      if (activeId) {
        localStorage.setItem(ACTIVE_KEY, activeId);
      } else {
        localStorage.removeItem(ACTIVE_KEY);
      }
    } catch (error) {
      console.warn('Could not save conversation history:', error);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, busy, activeId]);

  function updateConversationMessages(
    conversationId: string,
    nextMessages: Message[],
  ) {
    setConversations((current) =>
      current
        .map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: nextMessages,
                title: titleFromMessages(nextMessages),
                updatedAt: Date.now(),
              }
            : conversation,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    );
  }

  function newConversation() {
    const conversation = makeConversation([welcome]);

    setConversations((current) =>
      [conversation, ...current].slice(0, MAX_CONVERSATIONS),
    );

    setActiveId(conversation.id);
    setInput('');
    setMobileHistoryOpen(false);
    window.speechSynthesis?.cancel();
    inputRef.current?.focus();
  }

  function openConversation(id: string) {
    setActiveId(id);
    setInput('');
    setMobileHistoryOpen(false);
    window.speechSynthesis?.cancel();
  }

  function deleteConversation(id: string) {
    const remaining = conversations.filter(
      (conversation) => conversation.id !== id,
    );

    if (id === activeId) {
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
        setConversations(remaining);
      } else {
        const replacement = makeConversation([welcome]);
        setConversations([replacement]);
        setActiveId(replacement.id);
      }
    } else {
      setConversations(remaining);
    }
  }

  async function send(text = input) {
    const clean = text.trim();

    if (!clean || busy) return;

    let conversationId = activeId;
    let currentMessages = messages;

    if (!activeConversation) {
      const created = makeConversation([welcome]);

      conversationId = created.id;
      currentMessages = created.messages;

      setConversations((current) =>
        [created, ...current].slice(0, MAX_CONVERSATIONS),
      );

      setActiveId(created.id);
    }

    const nextMessages: Message[] = [
      ...currentMessages,
      { role: 'user', content: clean },
    ];

    setInput('');
    setBusy(true);

    updateConversationMessages(
      conversationId,
      nextMessages,
    );

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages.slice(-16),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : 'The AI request failed.',
        );
      }

      if (typeof result.text !== 'string') {
        throw new Error(
          'The server returned an invalid response.',
        );
      }

      updateConversationMessages(conversationId, [
        ...nextMessages,
        {
          role: 'assistant',
          content: result.text,
        },
      ]);
    } catch (error) {
      console.error('Yash AI request failed:', error);

      const reason =
        error instanceof Error
          ? error.message
          : 'Unknown connection error';

      updateConversationMessages(conversationId, [
        ...nextMessages,
        {
          role: 'assistant',
          content:
            `I couldn’t connect to the AI service. ${reason} ` +
            'Please check your connection and try again.',
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function startVoice() {
    const browser = window as Window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };

    const SpeechRecognition =
      browser.SpeechRecognition ||
      browser.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setInput(
        'Voice input is not supported in this browser. Try a supported browser.',
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
    };

    recognition.onend = () => setVoice(false);
    recognition.onerror = () => setVoice(false);

    setVoice(true);
    recognition.start();
  }

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(text),
    );
  }

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(index);

      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  function renderHistory(mobile = false) {
    return (
      <>
        {conversations.length === 0 ? (
          <p className="history-empty">
            Your conversations will appear here.
          </p>
        ) : (
          <div className="history-list">
            {conversations.map((conversation) => (
              <div
                className={
                  'history-item ' +
                  (conversation.id === activeId
                    ? 'selected'
                    : '')
                }
                key={conversation.id}
              >
                <button
                  className="history-open"
                  title={conversation.title}
                  onClick={() =>
                    openConversation(conversation.id)
                  }
                >
                  <MessageSquare size={14} />
                  <span>{conversation.title}</span>
                </button>

                <button
                  className="history-delete"
                  title="Delete conversation"
                  aria-label={`Delete ${conversation.title}`}
                  onClick={() =>
                    deleteConversation(conversation.id)
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {mobile && (
          <button
            className="mobile-new-chat"
            onClick={newConversation}
          >
            <Plus size={15} /> New conversation
          </button>
        )}
      </>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <AudioLines size={22} />
          </div>

          <div>
            <strong>Yash AI</strong>
            <span>AI FOR EVERYONE</span>
          </div>
        </div>

        <button
          className="new-chat"
          onClick={newConversation}
        >
          <Plus size={17} />
          New conversation
          <span>⌘ K</span>
        </button>

        <div className="side-label">YOUR WORKSPACE</div>

        <div className="side-active">
          <Sparkles size={17} />
          AI Assistant
          <i className="live-dot" />
        </div>

        <div className="history-heading">
          <span>HISTORY</span>
          <span>
            {conversations.length}/{MAX_CONVERSATIONS}
          </span>
        </div>

        {renderHistory()}

        <div className="side-note">
          <Sparkles size={16} />
          <div>
            <b>Ideas have no borders.</b>
            <p>
              Learn, create, explore, and solve problems with AI.
            </p>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">
            <Sparkles size={17} />
          </div>

          <div className="profile">
            <b>AI Explorer</b>
            <span>Your workspace</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark">
              <AudioLines size={19} />
            </div>
            <b>Yash AI</b>
          </div>

          <div className="status">
            <i className="live-dot" />
            AI ASSISTANT
            <span>/</span>
            READY TO HELP
          </div>

          <div className="top-actions">
            <button
              className="top-icon mobile-history-toggle"
              title="Conversation history"
              aria-label="Open conversation history"
              onClick={() =>
                setMobileHistoryOpen((open) => !open)
              }
            >
              {mobileHistoryOpen ? (
                <X size={18} />
              ) : (
                <MessageSquare size={18} />
              )}
            </button>

            <button
              className="top-icon"
              title="New conversation"
              aria-label="New conversation"
              onClick={newConversation}
            >
              <Plus size={18} />
            </button>
          </div>
        </header>

        {mobileHistoryOpen && (
          <div className="mobile-history-panel">
            <div className="mobile-history-title">
              <span>CONVERSATION HISTORY</span>
              <span>{conversations.length}</span>
            </div>

            {renderHistory(true)}
          </div>
        )}

        <section className="conversation">
          {fresh ? (
            <div className="welcome">
              <div className="eyebrow">
                <Sparkles size={14} />
                YOUR AI, READY TO HELP
              </div>

              <h1>
                A good question
                <br />
                <em>can change everything.</em>
              </h1>

              <p className="welcome-copy">
                Explore ideas, learn new skills, write code, solve
                problems, and discover what you can create with AI.
              </p>

              <div className="suggestions">
                {suggestions.map((item) => (
                  <button
                    key={item.title}
                    className="suggestion"
                    onClick={() => void send(item.prompt)}
                  >
                    <span className="suggestion-icon">
                      {item.icon}
                    </span>

                    <span>
                      <b>{item.title}</b>
                      <small>{item.prompt}</small>
                    </span>

                    <span className="suggest-arrow">↗</span>
                  </button>
                ))}
              </div>

              <div className="hint">
                <i />
                ASK ANYTHING. START SOMEWHERE.
                <i />
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <article
                  className={`message ${message.role}`}
                  key={`${activeId}-${index}`}
                >
                  <div className="message-avatar">
                    {message.role === 'assistant' ? (
                      <AudioLines size={16} />
                    ) : (
                      'Y'
                    )}
                  </div>

                  <div className="message-body">
                    <div className="message-label">
                      {message.role === 'assistant'
                        ? 'YASH AI'
                        : 'YOU'}

                      <span>
                        {' '}
                        ·{' '}
                        {message.role === 'assistant'
                          ? 'RESPONSE'
                          : 'MESSAGE'}
                      </span>
                    </div>

                    <div className="message-content">
                      {message.content}
                    </div>

                    {message.role === 'assistant' && (
                      <div className="message-actions">
                        <button
                          onClick={() =>
                            void copy(message.content, index)
                          }
                        >
                          {copied === index ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}

                          {copied === index
                            ? 'Copied'
                            : 'Copy'}
                        </button>

                        <button
                          onClick={() => speak(message.content)}
                        >
                          <Volume2 size={14} />
                          Read aloud
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {busy && (
                <article className="message assistant">
                  <div className="message-avatar">
                    <AudioLines size={16} />
                  </div>

                  <div className="message-body">
                    <div className="message-label">
                      YASH AI · THINKING
                    </div>

                    <div className="thinking">
                      <i />
                      <i />
                      <i />
                      <span>Working on it</span>
                    </div>
                  </div>
                </article>
              )}

              <div ref={endRef} />
            </div>
          )}
        </section>

        <div className="composer-wrap">
          <div className="composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask anything…"
              rows={2}
            />

            <div className="composer-bottom">
              <div className="composer-note">
                <Sparkles size={14} />
                Curious minds are welcome
              </div>

              <div className="composer-controls">
                <button
                  className={`voice-btn ${
                    voice ? 'recording' : ''
                  }`}
                  title="Use voice input"
                  aria-label="Use voice input"
                  onClick={startVoice}
                >
                  <Mic size={16} />
                </button>

                <button
                  className="send-btn"
                  disabled={!input.trim() || busy}
                  onClick={() => void send()}
                >
                  <span>{busy ? 'Thinking' : 'Send'}</span>
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="disclaimer">
            Yash AI can make mistakes. Check important information.
          </div>
        </div>

        <footer>
          <span>AI FOR EVERYONE</span>
          <span>
            CREATED BY <b>YASH</b> ✳
          </span>
        </footer>
      </main>
    </div>
  );
}
