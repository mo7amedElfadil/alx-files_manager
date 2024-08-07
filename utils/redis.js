/**
 * @class RedisClient - Redis client
 */
import { promisify } from 'util';

const redis = require('redis');

/**
 * @class RedisClient - Redis client
 * @method isAlive - Check if Redis client is connected to the server
 * @method get - Get value from Redis
 * @method set - Set value in Redis
 * @method del - Delete value from Redis
 * @method handleAsync - Handle async functions
 * @method constructor - Redis client constructor
 * @property {Object} client - Redis client
 * @property {Function} getAsync - Promisified get method
 * @property {Function} setAsync - Promisified set method
 * @property {Function} delAsync - Promisified del method
 */
class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);

    this.client.on('error', (error) => {
      console.error(`Redis client not connected to the server: ${error.message}`);
    });

    // this.client.on('connect', () => {
    //   console.log(`Redis client connected to the server: ${this.client.connected}`);
    // });
  }

  /**
   * @method handleAsync - Handle async functions
   * @param {Function} fn - Async function
   * @returns {Promise} - Promise object
   */
  static async handleAsync(fn) {
    try {
      return await fn();
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * @method isAlive - Check if Redis client is connected to the server
   * @returns {Boolean} - True if connected, false otherwise
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * @method get - Get value from Redis
   * @param {String} key - Key to get value from
   * @returns {String} - Value of the key
   */
  async get(key) {
    // return RedisClient.handleAsync(async () => this.getAsync(key));
    return this.getAsync(key);
  }

  /**
   * @method set - Set value in Redis
   * @param {String} key - Key to set value in
   * @param {String} value - Value to set
   * @param {Number} duration - Duration to set the key
   * @returns {String} - Value of the key
   */
  async set(key, value, duration) {
    // return RedisClient.handleAsync(async () => this.setAsync(key, duration, value));
    return this.setAsync(key, duration, value);
  }

  /**
   * @method del - Delete value from Redis
   * @param {String} key - Key to delete value from
   * @returns {Promise} - Promise object of the del method
   */
  async del(key) {
    // return RedisClient.handleAsync(async () => this.delAsync(key));
    return this.delAsync(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
