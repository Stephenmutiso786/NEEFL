import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function PolicyPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState({ state: 'loading', error: '' });
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setStatus({ state: 'loading', error: '' });
    api(`/api/public/policies/${slug}`, { auth: false })
      .then((data) => {
        setPolicy(data.policy);
        setStatus({ state: 'ready', error: '' });
      })
      .catch((err) => {
        setPolicy(null);
        setStatus({ state: 'error', error: err.message });
      });
  }, [slug]);

  const paragraphs = useMemo(() => {
    if (!policy?.body) return [];
    return policy.body.split(/\n+/).filter(Boolean);
  }, [policy]);

  return (
    <div className="card p-6">
      <h3 className="section-title">{policy?.title || 'Policy'}</h3>
      {policy?.updated_at && (
        <p className="section-subtitle">Last updated: {new Date(policy.updated_at).toLocaleString()}</p>
      )}
      {status.state === 'error' && (
        <p className="mt-4 text-sm text-ink-500">
          No published document found for this policy yet.
        </p>
      )}
      {status.state === 'ready' && (
        <div className="mt-6 grid gap-4 text-sm text-ink-700">
          {paragraphs.map((text, idx) => (
            <p key={`${idx}-${text.slice(0, 12)}`}>{text}</p>
          ))}
          {!paragraphs.length && (
            <p className="text-sm text-ink-500">This policy has not been filled in yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
