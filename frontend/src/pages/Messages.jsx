import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getUserId } from '../lib/api.js';

export default function Messages() {
  const [searchParams] = useSearchParams();
  const requestedUser = searchParams.get('user');
  const currentUserId = getUserId();
  const [threads, setThreads] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newThreadUserId, setNewThreadUserId] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const loadThreads = () => {
    api('/api/messages/threads')
      .then((data) => setThreads(data.threads || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  const loadThread = (userId) => {
    if (!userId) return;
    api(`/api/messages/thread/${userId}`)
      .then((data) => setMessages(data.messages || []))
      .catch((err) => setStatus({ state: 'error', message: err.message }));
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (requestedUser) {
      setSelectedUserId(String(requestedUser));
    }
  }, [requestedUser]);

  useEffect(() => {
    if (!selectedUserId) return;
    loadThread(selectedUserId);
  }, [selectedUserId]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !newMessage.trim()) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api(`/api/messages/thread/${selectedUserId}`, {
        method: 'POST',
        body: { message: newMessage.trim() }
      });
      setNewMessage('');
      setStatus({ state: 'success', message: 'Message sent.' });
      loadThread(selectedUserId);
      loadThreads();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const startThread = (event) => {
    event.preventDefault();
    if (!newThreadUserId) return;
    setSelectedUserId(String(newThreadUserId));
    setNewThreadUserId('');
  };

  const activeThread = useMemo(
    () => threads.find((item) => String(item.partner_id) === String(selectedUserId)),
    [threads, selectedUserId]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <section className="card p-6">
        <h3 className="section-title">Conversations</h3>
        <form className="mt-4 grid gap-3" onSubmit={startThread}>
          <label className="label">Start new chat (user ID)</label>
          <div className="flex gap-2">
            <input
              className="input"
              value={newThreadUserId}
              onChange={(e) => setNewThreadUserId(e.target.value)}
              placeholder="Enter user ID"
            />
            <button className="btn-secondary" type="submit">Open</button>
          </div>
        </form>
        <div className="mt-4 grid gap-3">
          {threads.map((thread) => (
            <button
              key={thread.partner_id}
              type="button"
              onClick={() => setSelectedUserId(String(thread.partner_id))}
              className={`flex w-full items-center justify-between rounded-2xl border border-sand-200 p-3 text-left text-sm ${
                String(thread.partner_id) === String(selectedUserId) ? 'bg-sand-50' : 'bg-white'
              }`}
            >
              <div>
                <p className="font-semibold text-ink-900">{thread.gamer_tag || thread.email || `User ${thread.partner_id}`}</p>
                <p className="text-xs text-ink-500">{thread.message}</p>
              </div>
              <div className="text-xs text-ink-500">
                {thread.unread_count > 0 && (
                  <span className="chip">+{thread.unread_count}</span>
                )}
              </div>
            </button>
          ))}
          {!threads.length && (
            <p className="text-sm text-ink-500">No conversations yet.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h3 className="section-title">
          {activeThread?.gamer_tag || activeThread?.email || (selectedUserId ? `User ${selectedUserId}` : 'Messages')}
        </h3>
        <p className="section-subtitle">Only logged-in users can chat.</p>
        <div className="mt-4 grid gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-2xl border border-sand-200 p-3 text-sm ${
                msg.sender_id === Number(currentUserId) ? 'bg-sand-50' : 'bg-white'
              }`}
            >
              <p className="text-xs text-ink-500">
                {msg.sender_id === Number(currentUserId) ? 'You' : 'Them'} · {new Date(msg.created_at).toLocaleString()}
              </p>
              <p className="mt-1 text-ink-900">{msg.message}</p>
            </div>
          ))}
          {selectedUserId && !messages.length && (
            <p className="text-sm text-ink-500">No messages yet. Say hello.</p>
          )}
          {!selectedUserId && (
            <p className="text-sm text-ink-500">Select a conversation to view messages.</p>
          )}
        </div>

        <form className="mt-4 grid gap-3" onSubmit={sendMessage}>
          <label className="label">New Message</label>
          <textarea
            className="input min-h-[120px]"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message"
            disabled={!selectedUserId}
          />
          <div>
            <button className="btn-primary" type="submit" disabled={!selectedUserId || !newMessage.trim()}>
              Send
            </button>
          </div>
        </form>

        {status.message && (
          <p className={`mt-2 text-sm ${status.state === 'error' ? 'text-red-600' : 'text-ink-700'}`}>
            {status.message}
          </p>
        )}
      </section>
    </div>
  );
}
