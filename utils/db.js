#!/usr/bin/node
import { MongoClient } from 'mongodb';

/**
 * @class DBClient - Database client class
 */

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        // console.log('Connected successfully to server');
        this.db = client.db(database);
        this.users = this.db.collection('users');
        this.files = this.db.collection('files');
      } else {
        console.log(err.message);
        this.db = false;
      }
    });
  }

  /**
   * @method isAlive - checks redis connection is alive
   * @returns {boolean} - true if connection is alive
   */
  isAlive() {
    return !!this.db;
  }

  /**
   * @method nbUsers - Returns the number of documents in the collection users
   * @return {number} amount of users
   */
  async nbUsers() {
    const numUsers = this.users.countDocuments();
    return numUsers;
  }

  /**
   * Returns the number of documents in the collection files
   * @return {number} amount of files
   */
  async nbFiles() {
    const numFiles = this.files.countDocuments();
    return numFiles;
  }
}

const dbClient = new DBClient();
export default dbClient;
