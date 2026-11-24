import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Spinner } from './ui';

/** Guests are sent to /login and returned to the page they wanted. */
export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
