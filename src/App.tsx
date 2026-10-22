import { useEffect, useRef, useState } from 'react';
import {
ArrowUp, AudioLines, Check, Copy, Mic, Plus, Sparkles, Volume2
} from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const API_URL = 'https://yashaibackend.yashkishorepower123.workers.dev/';

const welcome: Message = {
role: 'assistant',
content: 'Hey Yash, I’m ready. Ask me anything, or choose a suggestion below to get started.'
};

const suggestions = [
{ icon: '✦', title: 'Explain a concept', prompt: 'Explain how artificial intelligence works in simple terms.' },
{ icon: '⌘', title: 'Help me code', prompt: 'Help me write a clean JavaScript function and explain it.' },
{ icon: '◷', title: 'Plan my day', prompt: 'Help me make a balanced and productive plan for today.' },
{ icon: '↗', title: 'Explore an idea', prompt: 'Suggest an interesting project I can build and learn from.' }
];

export default function App() {
const [messages, setMessages] = useState<Message[]>(() => {
try {
return JSON.parse(localStorage.getItem('yash-ai-chat') || 'null') || [welcome];
} catch {
return [welcome];
}
});

const [input, setInput] = useState('');
const [busy, setBusy] = useState(false);
const [voice, setVoice] = useState(false);
const [copied, setCopied] = useState<number | null>(null);
const endRef = useRef<HTMLDivElement>(null);
const inputRef = useRef<HTMLTextAreaElement>(null);

useEffect(() => {
localStorage.setItem('yash-ai-chat', JSON.stringify(messages));
endRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, busy]);

async function send(text = input) {
const clean = text.trim();
if (!clean || busy) return;

const next: Message[] = [
  ...messages,
  { role: 'user', content: clean }
];

setMessages(next);
setInput('');
setBusy(true);

try {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: next.slice(-16)
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof result.error === 'string'
        ? result.error
        : 'The AI request failed.'
    );
  }

  if (typeof result.text !== 'string') {
    throw new Error('The server returned an invalid response.');
  }

  setMessages([
    ...next,
    {
      role: 'assistant',
      content: result.text
    }
  ]);
} catch (error) {
  console.error('Yash AI request failed:', error);

  const errorMessage =
    error instanceof Error && error.message
      ? error.message
      : 'Unknown connection error';

  setMessages([
    ...next,
    {
      role: 'assistant',
      content: `I couldn’t connect to the AI service. ${errorMessage} Please check the Cloudflare Worker and try again.`
    }
  ]);
} finally {
  setBusy(false);
  inputRef.current?.focus();
}

}

function startVoice() {
const w = window as Window & {
SpeechRecognition?: new () => any;
webkitSpeechRecognition?: new () => any;
};

const SpeechRecognition =
  w.SpeechRecognition || w.webkitSpeechRecognition;

if (!SpeechRecognition) {
  setInput('Voice input is not supported in this browser.');
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
  new SpeechSynthesisUtterance(text)
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

const fresh = messages.length === 1;

return (
<div className="shell">
<aside className="sidebar">
<div className="brand">
<div className="brand-mark"><AudioLines size={22} /></div>
<div>
<strong>Yash AI</strong>
<span>PERSONAL ASSISTANT</span>
</div>
</div>

    <button
      className="new-chat"
      onClick={() => {
        setMessages([welcome]);
        setInput('');
      }}
    >
      <Plus size={17} /> New conversation <span>⌘ K</span>
    </button>

    <div className="side-label">YOUR SPACE</div>
    <div className="side-active">
      <Sparkles size={17} /> Assistant <i className="live-dot" />
    </div>

    <div className="side-note">
      <Sparkles size={16} />
      <div>
        <b>A little more capable.</b>
        <p>Think, create, learn and build — all in one place.</p>
      </div>
    </div>

    <div className="sidebar-bottom">
      <div className="avatar">Y</div>
      <div className="profile">
        <b>Yash</b>
        <span>Personal workspace</span>
      </div>
    </div>
  </aside>

  <main className="main">
    <header className="topbar">
      <div className="mobile-brand">
        <div className="brand-mark"><AudioLines size={19} /></div>
        <b>Yash AI</b>
      </div>

      <div className="status">
        <i className="live-dot" /> AI ASSISTANT <span>/</span> READY TO HELP
      </div>

      <button
        className="top-icon"
        title="New conversation"
        onClick={() => {
          setMessages([welcome]);
          setInput('');
        }}
      >
        <Plus size={18} />
      </button>
    </header>

    <section className="conversation">
      {fresh ? (
        <div className="welcome">
          <div className="eyebrow">
            <Sparkles size={14} /> YOUR PERSONAL AI, REIMAGINED
          </div>

          <h1>A good question<br /><em>can change everything.</em></h1>

          <p className="welcome-copy">
            Your thinking partner for ideas, code, learning, and whatever comes next.
          </p>

          <div className="suggestions">
            {suggestions.map(item => (
              <button
                key={item.title}
                className="suggestion"
                onClick={() => void send(item.prompt)}
              >
                <span className="suggestion-icon">{item.icon}</span>
                <span>
                  <b>{item.title}</b>
                  <small>{item.prompt}</small>
                </span>
                <span className="suggest-arrow">↗</span>
              </button>
            ))}
          </div>

          <div className="hint">
            <i /> ASK ANYTHING. START SOMEWHERE. <i />
          </div>
        </div>
      ) : (
        <div className="messages">
          {messages.map((message, index) => (
            <article
              className={'message ' + message.role}
              key={index}
            >
              <div className="message-avatar">
                {message.role === 'assistant'
                  ? <AudioLines size={16} />
                  : 'Y'}
              </div>

              <div className="message-body">
                <div className="message-label">
                  {message.role === 'assistant' ? 'YASH AI' : 'YOU'}
                  <span>
                    · {message.role === 'assistant' ? 'RESPONSE' : 'MESSAGE'}
                  </span>
                </div>

                <div className="message-content">{message.content}</div>

                {message.role === 'assistant' && (
                  <div className="message-actions">
                    <button onClick={() => void copy(message.content, index)}>
                      {copied === index
                        ? <Check size={14} />
                        : <Copy size={14} />}
                      {copied === index ? 'Copied' : 'Copy'}
                    </button>

                    <button onClick={() => speak(message.content)}>
                      <Volume2 size={14} /> Read aloud
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
                <div className="message-label">YASH AI · THINKING</div>
                <div className="thinking">
                  <i /><i /><i /> <span>Working on it</span>
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
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Ask anything… or tell me what you're working on"
          rows={2}
        />

        <div className="composer-bottom">
          <div className="composer-note">
            <Sparkles size={14} /> Thoughtful answers, made for you
          </div>

          <div className="composer-controls">
            <button
              className={'voice-btn ' + (voice ? 'recording' : '')}
              title="Use voice input"
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
      <span>DESIGNED WITH INTENTION</span>
      <span>CREATED BY <b>YASH</b> ✳</span>
    </footer>
  </main>
</div>

);
}
