import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../lib/api.js';

export default function RequireAuth({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      navigate('/auth/login');
    }
  }, [navigate]);

  if (!getToken()) {
    return null;
  }

  return children;
}
