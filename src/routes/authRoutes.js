const express = require("express");
const router = express.Router();
const AuthService = require("../services/authService");
const authMiddleware = require("../middleware/authMiddleware");

// Lazy-load service
let authService;

function getAuthService() {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { email, password, firstName, lastName }
 */
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const result = await getAuthService().register({
      email,
      password,
      firstName,
      lastName,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login user
 * Body: { email, password }
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await getAuthService().login({ email, password });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 * Body: { refreshToken }
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result = await getAuthService().refreshToken(refreshToken);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 * Requires: Bearer token
 */
router.get("/profile", authMiddleware, async (req, res, next) => {
  try {
    const result = await getAuthService().getProfile(req.user.userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 * Requires: Bearer token
 * Body: { firstName, lastName }
 */
router.put("/profile", authMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;

    const result = await getAuthService().updateProfile(req.user.userId, {
      firstName,
      lastName,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 * Requires: Bearer token
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await getAuthService().changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 * Note: JWT tokens are stateless, so logout is handled client-side by removing the token
 */
router.post("/logout", authMiddleware, async (req, res) => {
  res.json({
    success: true,
    message:
      "Logged out successfully. Please remove the token from client storage.",
    requestTimestamp: new Date().toISOString(),
  });
});

module.exports = router;
