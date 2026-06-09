import { Navigate } from "react-router-dom";
import { getLoggedInUser } from "../utils/auth";

interface Props {
  children: React.ReactNode;
  requireOrg?: boolean;
}

const ProtectedRoute = ({ children, requireOrg = true }: Props) => {
  const user = getLoggedInUser();

  // Not authenticated (or token expired) -> login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but hasn't created/joined an organization yet -> onboarding.
  if (requireOrg && !user.organizationId) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
