import { Navigate } from 'react-router-dom';

// We take "children" (the page) and wrap it in a check
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    // No JWT found? Redirect to login
    return <Navigate to="/login" replace />;
  }

  // Token exists? Let them in
  return <>{children}</>;
};

export default ProtectedRoute;