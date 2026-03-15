import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserRole } from '../lib/api.js';
import { usePermissions } from '../context/PermissionsContext.jsx';

export default function RequireStaff({ children }) {
  const navigate = useNavigate();
  const { permissions, loaded } = usePermissions();

  useEffect(() => {
    const token = getToken();
    const role = getUserRole();
    if (!token) {
      navigate('/auth/login');
      return;
    }
    if (!['admin', 'supervisor', 'referee', 'moderator'].includes(role)) {
      navigate('/player/dashboard');
      return;
    }
    if (role !== 'admin' && loaded && permissions?.staff === false) {
      navigate('/');
    }
  }, [navigate, loaded, permissions]);

  const role = getUserRole();
  if (!getToken() || !['admin', 'supervisor', 'referee', 'moderator'].includes(role)) {
    return null;
  }
  if (role !== 'admin' && loaded && permissions?.staff === false) {
    return null;
  }

  return children;
}
