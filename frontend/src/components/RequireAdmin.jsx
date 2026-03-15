import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserRole } from '../lib/api.js';

export default function RequireAdmin({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    const role = getUserRole();
    if (!token) {
      navigate('/admin/login');
      return;
    }
    if (role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  if (!getToken() || getUserRole() !== 'admin') {
    return null;
  }

  return children;
}
