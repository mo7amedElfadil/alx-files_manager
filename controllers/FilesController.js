import { ObjectId } from 'mongodb';
import Queue from 'bull';
import mime from 'mime-types';
import userUtils from '../utils/user';
import fileUtils from '../utils/file';
import validate from '../utils/validation';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Queue('fileQueue');

/**
 * @class FilesController
 * @description Controller for handling file uploads and downloads
 */
class FilesController {
  /**
   * static postUpload - should return the number of users and files in DB
   *  with a status code 200
   *  @param {Request} request - request object
   *  @param {Response} response - response object
   *  @returns {Promise<void>} - returns a promise
   */
  static async postUpload(request, response) {
    // Retrieve the user ID from the request token
    const { userId } = await userUtils.getUserIdAndKey(request);
    // Check if the user is valid
    if (!validate.isId(userId)) {
      return response.status(401).send({ error: 'Unauthorized' });
    }
    // If the file is an image, add it to the queue to process it
    if (!userId && request.body.type === 'image') {
      await fileQueue.add({});
    }
    // get user from db
    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    // If the user is not found, return an error
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Validate the request body and extract the file parameters
    const { error: validationError, fileParams } = await fileUtils.validateBody(
      request,
    );

    // If there is a validation error, return it
    if (validationError) { return response.status(400).send({ error: validationError }); }

    // If the parent ID is not 0 and is not valid, return an error
    if (fileParams.parentId !== 0 && !validate.isId(fileParams.parentId)) { return response.status(400).send({ error: 'Parent not found' }); }

    // save file to disk
    const { error, code, newFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      FOLDER_PATH,
    );

    // If there is an error, return it and add the file to the queue if it is an image
    if (error) {
      if (response.body.type === 'image') await fileQueue.add({ userId });
      return response.status(code).send(error);
    }

    // If the file is an image, add it to the queue to process it
    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      });
    }

    return response.status(201).send(newFile);
  }

  /**
   * static getShow - retrieves file document based on ID
   * @param {Request} request - request object
   * @param {Response} response - response object
   * @returns {Promise<void>} - returns a promise
   */
  static async getShow(request, response) {
    const fileId = request.params.id;

    // Retrieve the user ID from the request token
    const { userId } = await userUtils.getUserIdAndKey(request);

    // Retrieve the user from the database
    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    if (!validate.isId(fileId) || !validate.isId(userId)) { return response.status(404).send({ error: 'Not found' }); }

    // Retrieve the file from the database
    const result = await fileUtils.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!result) return response.status(404).send({ error: 'Not found' });

    // Process the file and return it
    const file = fileUtils.processFile(result);

    return response.status(200).send(file);
  }

  /**
   * static getIndex - retrieves a list of files based on the parent ID
   * @param {Request} request - request object
   * @param {Response} response - response object
   * @returns {Promise<void>} - returns a promise
   */
  static async getIndex(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    let parentId = request.query.parentId || '0';

    if (parentId === '0') parentId = 0;

    let page = Number(request.query.page) || 0;

    if (Number.isNaN(page)) page = 0;

    if (parentId !== 0 && parentId !== '0') {
      if (!validate.isId(parentId)) { return response.status(401).send({ error: 'Unauthorized' }); }

      parentId = ObjectId(parentId);

      const folder = await fileUtils.getFile({ _id: ObjectId(parentId) });

      if (!folder || folder.type !== 'folder') { return response.status(200).send([]); }
    }

    const pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      {
        $limit: 20,
      },
    ];

    const fileCursor = await fileUtils.getFilesOfParentId(pipeline);

    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc);
      fileList.push(document);
    });

    return response.status(200).send(fileList);
  }

  /**
   * static putPublish - set isPublic to true on the file document based on the ID
   * @param {Request} request - request object
   * @param {Response} response - response object
   * @returns {Promise<void>} - returns a promise
   */
  static async putPublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      true,
    );

    if (error) return response.status(code).send({ error });

    return response.status(code).send(updatedFile);
  }

  /**
   * static putUnpublish - set isPublic to false on the file document based on the ID
   * @param {Request} request - request object
   * @param {Response} response - response object
   * @returns {Promise<void>} - returns a promise
   */
  static async putUnpublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      false,
    );

    if (error) return response.status(code).send({ error });

    return response.status(code).send(updatedFile);
  }

  /**
   * static getFile - return the content of the file document based on the ID
   * @param {Request} request - request object
   * @param {Response} response - response object
   * @returns {Promise<void>} - returns a promise
   */
  static async getFile(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);
    const { id: fileId } = request.params;
    const size = request.query.size || 0;

    // Mongo Condition for Id
    if (!validate.isId(fileId)) { return response.status(404).send({ error: 'Not found' }); }

    const file = await fileUtils.getFile({
      _id: ObjectId(fileId),
    });

    if (!file || !fileUtils.isOwnerAndPublic(file, userId)) { return response.status(404).send({ error: 'Not found' }); }

    if (file.type === 'folder') {
      return response
        .status(400)
        .send({ error: "A folder doesn't have content" });
    }

    const { error, code, data } = await fileUtils.getFileData(file, size);

    if (error) return response.status(code).send({ error });

    const mimeType = mime.contentType(file.name);

    response.setHeader('Content-Type', mimeType);

    return response.status(200).send(data);
  }
}

export default FilesController;
