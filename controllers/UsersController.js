import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

/**
 * @class UsersController
 */
class UsersController {
  /**
   * @static postNew - should create a new user in DB
   * @param {Request} req - request object
   * @param {Response} res - response object
   * @returns {Promise<void>}
   * @memberof UsersController
   */
  static async postUser(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    // check if email exists
    try {
      if (await dbClient.users.findOne({ email })) {
        return res.status(400).send({ error: 'Already exist' });
      }

      const newUser = await dbClient.users.insertOne({
        email,
        password: sha1(password),
      });
      return res.status(201).send({ email, id: newUser._id });
    } catch (error) {
      return res.status(500).send({ error: error.message });
    }
  }

  /**
   * @static getMe - should get the current user
   * @param {Request} req - request object
   * @param {Response} res - response object
   * @returns {Promise<void>}
   * @memberof UsersController
   */
  static async getMe(req, res) {
    const { userId } = await userUtils.getUserIdAndKey(req);
    try {
      const user = await userUtils.getUser({ _id: ObjectId(userId) });
      if (!user) return res.status(401).send({ error: 'Unauthorized' });
      return res.status(200).send({ email: user.email, id: user._id });
    } catch (error) {
      return res.status(500).send({ error: 'Server Error' });
    }
  }
}

export default UsersController;
