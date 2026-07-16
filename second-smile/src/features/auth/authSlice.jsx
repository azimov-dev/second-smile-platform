import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../api/client";

const tokenKey = "token";
const userKey = "user";

const savedToken =
  typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null;
const savedUser =
  typeof window !== "undefined" ? localStorage.getItem(userKey) : null;

const initialState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  status: "idle", // "idle" | "loading" | "succeeded" | "failed"
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ phone, password }, { rejectWithValue }) => {
    try {
      const data = await apiClient("/auth/login", {
        method: "POST",
        body: { phone, password },
      });

      // Expected response: { token, user }
      if (!data.token || !data.user) {
        return rejectWithValue("Invalid response from server");
      }

      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Login failed");
    }
  },
);

// Simple logout thunk (no async needed, but kept for consistency)
export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  return true;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Optional: manual logout if needed elsewhere
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.status = "idle";
      state.error = null;
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
    },
    setUser: (state, action) => {
      state.user = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem(userKey, JSON.stringify(action.payload));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;

        const { token, user } = action.payload;

        // Normalize user data
        const fullName =
          user.full_name ||
          user.fullName ||
          user.name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          "User";

        const normalizedUser = {
          id: user.id,
          full_name: fullName,
          role: user.role || user.user_role || "reception", // fallback
          phone: user.phone,
          // Add other fields if needed
        };

        state.token = token;
        state.user = normalizedUser;

        // Persist to localStorage
        localStorage.setItem(tokenKey, token);
        localStorage.setItem(userKey, JSON.stringify(normalizedUser));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Login failed";
        state.token = null;
        state.user = null;
      })

      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = "idle";
        state.token = null;
        state.user = null;
        state.error = null;
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
      });
  },
});

// Export actions
export const { logout, setUser } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) =>
  Boolean(state.auth.token && state.auth.user);
export const selectUserRole = (state) => state.auth.user?.role || null;

export default authSlice.reducer;
