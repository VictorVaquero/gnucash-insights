import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = ({isAuthenticated}: {isAuthenticated: boolean}) => {
	return isAuthenticated ? <Outlet /> : <Navigate to="/login"  replace />;
};