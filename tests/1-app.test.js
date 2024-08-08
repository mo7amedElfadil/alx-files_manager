import {
  expect, use, should, request,
} from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';
import dbClient from '../utils/db';

use(chaiHttp);
should();

/**
 * integration test for App Status Endpoints
 */
describe('testing App Status Endpoints', () => {
  describe('get /status', () => {
    it('returns the status of redis and mongo connection', async () => {
      const response = await request(app).get('/status').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ redis: true, db: true });
      expect(response.statusCode).to.equal(200);
    });
  });

  describe('get /stats', () => {
    before(async () => {
      await dbClient.users.deleteMany({});
      await dbClient.files.deleteMany({});
    });

    it('returns number of users and files in db 0 for this one', async () => {
      const response = await request(app).get('/stats').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 0, files: 0 });
      expect(response.statusCode).to.equal(200);
    });

    it('returns number of users and files in db 1 and 2 for this one', async () => {
      await dbClient.users.insertOne({ name: 'Mohamed' });
      await dbClient.files.insertOne({ name: 'image.png' });
      await dbClient.files.insertOne({ name: 'file.txt' });

      const response = await request(app).get('/stats').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 1, files: 2 });
      expect(response.statusCode).to.equal(200);
    });
  });
});
