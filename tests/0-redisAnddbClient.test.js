import { expect, use, should } from 'chai';
import chaiHttp from 'chai-http';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

use(chaiHttp);
should();

/**
 * integration test for MongoDB and Redis clients
 */
describe('testing the clients for MongoDB and Redis', () => {

  describe('redis Client', () => {

    before(async () => {
      await redisClient.client.flushall('ASYNC');
    });

    after(async () => {
      await redisClient.client.flushall('ASYNC');
    });

    it('shows that connection is alive', async () => {
      expect(redisClient.isAlive()).to.equal(true);
    });

    it('returns key as null because it does not exist', async () => {
      expect(await redisClient.get('testKey')).to.equal(null);
    });

    it('set key can be called without issue', async () => {
      expect(await redisClient.set('testKey', 12, 1)).to.equal('OK');
    });

    it('returns key with null because it expired', async () => {
      const sleep = promisify(setTimeout);
      await sleep(1100);
      expect(await redisClient.get('testKey')).to.equal(null);
    });
  });

  // dbClient
  describe('db Client', () => {
    before(async () => {
      await dbClient.users.deleteMany({});
      await dbClient.files.deleteMany({});
    });

    after(async () => {
      await dbClient.users.deleteMany({});
      await dbClient.files.deleteMany({});
    });

    it('shows that connection is alive', () => {
      expect(dbClient.isAlive()).to.equal(true);
    });

    it('shows number of user documents', async () => {
      await dbClient.users.deleteMany({});
      expect(await dbClient.nbUsers()).to.equal(0);

      await dbClient.users.insertOne({ name: 'Mohamed' });
      await dbClient.users.insertOne({ name: 'Elfadil' });
      expect(await dbClient.nbUsers()).to.equal(2);
    });

    it('shows number of file documents', async () => {
      await dbClient.files.deleteMany({});
      expect(await dbClient.nbFiles()).to.equal(0);

      await dbClient.files.insertOne({ name: 'File1' });
      await dbClient.files.insertOne({ name: 'File2' });
      expect(await dbClient.nbFiles()).to.equal(2);
    });
  });
});
