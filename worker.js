import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import fileUtils from './utils/file';
import userUtils from './utils/user';
import validate from './utils/validation';

const imageThumbnail = require('image-thumbnail');

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

/**
 * Worker to generate thumbnails for uploaded file
 * @param {Object} job - Job data
 * @returns {Promise<void>}
 */
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  if (!fileId) {
    console.log('Missing fileId');
    throw new Error('Missing fileId');
  }

  if (!validate.isId(fileId) || !validate.isId(userId)) throw new Error('File not found');

  const file = await fileUtils.getFile({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) throw new Error('File not found');

  const { localPath } = file;
  const options = {};
  const widths = [500, 250, 100];

  widths.forEach(async (width) => {
    options.width = width;
    try {
      const thumbnail = await imageThumbnail(localPath, options);
      await fsPromises.writeFile(`${localPath}_${width}`, thumbnail);
      //   console.log(thumbnail);
    } catch (err) {
      console.error(err.message);
    }
  });
});

/**
 * Worker to send welcome email to user
 */
userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  if (!validate.isId(userId)) throw new Error('User not found');

  const user = await userUtils.getUser({
    _id: ObjectId(userId),
  });

  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
});
