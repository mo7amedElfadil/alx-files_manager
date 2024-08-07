import redisClient from '../utils/redis';
import dbClient from '../utils/db';

/**
 * @class AppController
 */
class AppController {
  /**
   * @static getStatus - should return if Redis is alive and if the DB is alive too
   * by using the 2 isAlive utils created previously:
   */
  static getStatus(_, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).send(status);
  }

  /**
   * @static getStats - should return the number of users and files in DB
   *  with a status code 200
   */
  static async getStats(_, res) {
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    res.status(200).send(stats);
  }
}

export default AppController;
