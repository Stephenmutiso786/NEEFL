import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserRole } from '../lib/api.js';
import { usePermissions } from '../context/PermissionsContext.jsx';

export default function RequireRole({ roles, permission, children }) {
  const navigate = useNavigate();
  const { permissions, loaded } = usePermissions();

  useEffect(() => {
    const token = getToken();
    const role = getUserRole();
    if (!token) {
      navigate('/login');
      return;
    }
    if (!roles.includes(role)) {
      navigate('/player/dashboard');
      return;
    }
    if (permission && loaded && permissions?.[permission] === false) {
      navigate('/');
    }
  }, [navigate, roles, permission, loaded, permissions]);

  const role = getUserRole();
  if (!getToken() || !roles.includes(role)) {
    return null;
  }
  if (permission && loaded && permissions?.[permission] === false) {
    return null;
  }

  return children;
}
