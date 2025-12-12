const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const config = require("../config/config");

/**
 * User Model for PostgreSQL
 * Handles user data operations and authentication
 */
class User {
  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: config.database.poolMax,
      idleTimeoutMillis: config.database.idleTimeout,
      connectionTimeoutMillis: config.database.connectionTimeout,
    });
  }

  /**
   * Initialize the users table
   * @returns {Promise<void>}
   */
  async initTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log("Users table initialized successfully");
    } catch (error) {
      console.error("Error initializing users table:", error.message);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data { email, password, firstName, lastName }
   * @returns {Promise<Object>} Created user (without password)
   */
  async create(userData) {
    const { email, password, firstName, lastName } = userData;

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, is_active, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(query, [
        email.toLowerCase(),
        hashedPassword,
        firstName || null,
        lastName || null,
      ]);

      return this.formatUser(result.rows[0]);
    } catch (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        const err = new Error("Email already exists");
        err.code = "EMAIL_EXISTS";
        err.statusCode = 409;
        throw err;
      }
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    const query = `
      SELECT id, email, password, first_name, last_name, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await this.pool.query(query, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Find user by ID
   * @param {number} id
   * @returns {Promise<Object|null>} User object (without password) or null
   */
  async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatUser(result.rows[0]);
  }

  /**
   * Validate password
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user
   * @param {number} id
   * @param {Object} updateData
   * @returns {Promise<Object>} Updated user
   */
  async update(id, updateData) {
    const { firstName, lastName, isActive } = updateData;

    const query = `
      UPDATE users
      SET first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          is_active = COALESCE($4, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, is_active, created_at, updated_at
    `;

    const result = await this.pool.query(query, [
      id,
      firstName,
      lastName,
      isActive,
    ]);

    if (result.rows.length === 0) {
      const error = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    return this.formatUser(result.rows[0]);
  }

  /**
   * Update password
   * @param {number} id
   * @param {string} newPassword
   * @returns {Promise<boolean>}
   */
  async updatePassword(id, newPassword) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const query = `
      UPDATE users
      SET password = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id, hashedPassword]);
    return result.rowCount > 0;
  }

  /**
   * Delete user
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const query = "DELETE FROM users WHERE id = $1";
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Format user object for response (camelCase)
   * @param {Object} dbUser
   * @returns {Object}
   */
  formatUser(dbUser) {
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      isActive: dbUser.is_active,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }

  /**
   * Close database connection pool
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = User;
