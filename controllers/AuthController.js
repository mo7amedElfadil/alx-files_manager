#!/usr/bin/node
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import userUtils from '../utils/user';

/**
 * @class AuthController
 */
class AuthController {
  /**
   * @static getConnect
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise,Object} response object or error
   */
  static async getConnect(req, res) {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Basic ')) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const [email, password] = Buffer
      .from(authorization.split(' ')[1], 'base64')
      .toString('utf-8')
      .split(':');

    if (!email || !password) { return res.status(401).send({ error: 'Unauthorized' }); }

    const sha1Password = sha1(password);

    const user = await userUtils.getUser({
      email,
      password: sha1Password,
    });

    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const token = uuidv4();
    const key = `auth_${token}`;
    const hrsExp = 24;

    await redisClient.set(key, user._id.toString(), hrsExp * 3600);

    return res.status(200).send({ token });
  }

  /**
   * @static getDisconnect
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise,Object} response object or error
   */
  static async getDisconnect(req, res) {
    const { userId, key } = await userUtils.getUserIdAndKey(req);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    await redisClient.del(key);

    return res.status(204).send();
  }
}

export default AuthController;
