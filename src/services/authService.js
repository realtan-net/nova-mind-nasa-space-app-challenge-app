const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/config");

/**
 * Authentication Service
 * Handles user registration, login, and token management
 */
class AuthService {
  constructor() {
    this.userModel = new User();
  }

  /**
   * Initialize the authentication service (create tables if needed)
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.userModel.initTable();
  }

  /**
   * Register a new user
   * @param {Object} userData - { email, password, firstName, lastName }
   * @returns {Promise<Object>} User data and tokens
   */
  async register(userData) {
    const { email, password, firstName, lastName } = userData;

    // Validate input
    this.validateRegistrationData(userData);

    // Create user
    const user = await this.userModel.create({
      email,
      password,
      firstName,
      lastName,
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      success: true,
      message: "User registered successfully",
      data: {
        user,
        ...tokens,
      },
      requestTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} User data and tokens
   */
  async login(credentials) {
    const { email, password } = credentials;

    // Validate input
    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.code = "MISSING_CREDENTIALS";
      error.statusCode = 400;
      throw error;
    }

    // Find user
    const user = await this.userModel.findByEmail(email);

    if (!user) {
      const error = new Error("Invalid email or password");
      error.code = "INVALID_CREDENTIALS";
      error.statusCode = 401;
      throw error;
    }

    // Check if user is active
    if (!user.is_active) {
      const error = new Error("Account is deactivated");
      error.code = "ACCOUNT_DEACTIVATED";
      error.statusCode = 403;
      throw error;
    }

    // Validate password
    const isValidPassword = await this.userModel.validatePassword(
      password,
      user.password
    );

    if (!isValidPassword) {
      const error = new Error("Invalid email or password");
      error.code = "INVALID_CREDENTIALS";
      error.statusCode = 401;
      throw error;
    }

    // Format user for response
    const formattedUser = this.userModel.formatUser(user);

    // Generate tokens
    const tokens = this.generateTokens(formattedUser);

    return {
      success: true,
      message: "Login successful",
      data: {
        user: formattedUser,
        ...tokens,
      },
      requestTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      const error = new Error("Refresh token is required");
      error.code = "MISSING_REFRESH_TOKEN";
      error.statusCode = 400;
      throw error;
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret);

      // Get user
      const user = await this.userModel.findById(decoded.userId);

      if (!user) {
        const error = new Error("User not found");
        error.code = "USER_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }

      if (!user.isActive) {
        const error = new Error("Account is deactivated");
        error.code = "ACCOUNT_DEACTIVATED";
        error.statusCode = 403;
        throw error;
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return {
        success: true,
        message: "Token refreshed successfully",
        data: tokens,
        requestTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        const err = new Error("Refresh token has expired");
        err.code = "REFRESH_TOKEN_EXPIRED";
        err.statusCode = 401;
        throw err;
      }
      if (error.name === "JsonWebTokenError") {
        const err = new Error("Invalid refresh token");
        err.code = "INVALID_REFRESH_TOKEN";
        err.statusCode = 401;
        throw err;
      }
      throw error;
    }
  }

  /**
   * Get user profile by ID
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async getProfile(userId) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      const error = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    return {
      success: true,
      data: { user },
      requestTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Update user profile
   * @param {number} userId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, updateData) {
    const user = await this.userModel.update(userId, updateData);

    return {
      success: true,
      message: "Profile updated successfully",
      data: { user },
      requestTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Change password
   * @param {number} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password
    const user = await this.userModel.findById(userId);

    if (!user) {
      const error = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    // Get full user data including password
    const userWithPassword = await this.userModel.findByEmail(user.email);

    // Validate current password
    const isValid = await this.userModel.validatePassword(
      currentPassword,
      userWithPassword.password
    );

    if (!isValid) {
      const error = new Error("Current password is incorrect");
      error.code = "INVALID_PASSWORD";
      error.statusCode = 401;
      throw error;
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Update password
    await this.userModel.updatePassword(userId, newPassword);

    return {
      success: true,
      message: "Password changed successfully",
      requestTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate JWT tokens
   * @param {Object} user
   * @returns {Object} { accessToken, refreshToken, expiresIn }
   */
  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Verify JWT token
   * @param {string} token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        const err = new Error("Token has expired");
        err.code = "TOKEN_EXPIRED";
        err.statusCode = 401;
        throw err;
      }
      const err = new Error("Invalid token");
      err.code = "INVALID_TOKEN";
      err.statusCode = 401;
      throw err;
    }
  }

  /**
   * Validate registration data
   * @param {Object} data
   */
  validateRegistrationData(data) {
    const { email, password } = data;

    if (!email) {
      const error = new Error("Email is required");
      error.code = "MISSING_EMAIL";
      error.statusCode = 400;
      throw error;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Invalid email format");
      error.code = "INVALID_EMAIL_FORMAT";
      error.statusCode = 400;
      throw error;
    }

    this.validatePassword(password);
  }

  /**
   * Validate password strength
   * @param {string} password
   */
  validatePassword(password) {
    if (!password) {
      const error = new Error("Password is required");
      error.code = "MISSING_PASSWORD";
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 8) {
      const error = new Error("Password must be at least 8 characters long");
      error.code = "PASSWORD_TOO_SHORT";
      error.statusCode = 400;
      throw error;
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      const error = new Error("Password must contain at least one number");
      error.code = "PASSWORD_NO_NUMBER";
      error.statusCode = 400;
      throw error;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      const error = new Error("Password must contain at least one letter");
      error.code = "PASSWORD_NO_LETTER";
      error.statusCode = 400;
      throw error;
    }
  }
}

module.exports = AuthService;
