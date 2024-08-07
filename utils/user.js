import { ObjectId } from 'mongodb';
import redisClient from './redis';
import dbClient from './db';

/**
 * @module with user utilities
 */
const userUtils = {
  /**
   * Gets a user id and key of redis from request
   * @request {request_object} express request obj
   * @return {object} object containing userId and
   * redis key for token
   */
  async getUserIdAndKey(request) {
    const token = request.header('X-Token');
    const user = this.verifyUser(token);

    if (!user) return { userId: null, key: null };

    return {
      userId: await redisClient.get(`auth_${token}`),
      key: `auth_${token}`,
    };
  },

  /**
   * Gets a user from database
   * @query {object} query expression for finding
   * user
   * @return {object} user document object
   */
  async getUser(query) {
    const user = await dbClient.users.findOne(query);
    return user;
  },

  /**
   * Verifies a user based on the provided token.
   * @param {string} token - The token to verify.
   * @returns {Promise<Object|null>} The user object if the token is valid, otherwise null.
   */
  async verifyUser(token) {
    if (!token) return null;

    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return null;

      const user = await dbClient.users.findOne({ _id: new ObjectId(userId) });
      return user || null;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
};

export default userUtils;
