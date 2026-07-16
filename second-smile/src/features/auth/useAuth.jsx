import { useSelector, useDispatch } from "react-redux";
import { selectAuth, logout as logoutAction } from "./authSlice.jsx";

export function useAuth() {
  const dispatch = useDispatch();
  const { user, token, status, error } = useSelector(selectAuth);
  const isAuthenticated = Boolean(token && user);
  const role = user?.role || null;

  const logout = () => {
    dispatch(logoutAction());
  };

  return {
    user,
    token,
    status,
    error,
    isAuthenticated,
    role,
    logout,
  };
}
