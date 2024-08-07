#!/usr/bin/node
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';
import dbClient from './db';
import userUtils from './user';
import validate from './validation';

/**
 * Module with file utilities
 */
const fileUtils = {
  /**
   * Validates if body is valid for creating file
   * @request {request_object} express request obj
   * @return {object} object with err and validated params
   */
  async validateBody(request) {
    // obtain file parameters from request
    const {
      name, type, isPublic = false, data,
    } = request.body;

    // if parentId is not provided, set it to 0
    let { parentId = 0 } = request.body;

    // types allowed for file
    const typesAllowed = ['file', 'image', 'folder'];
    let msg = null;

    if (parentId === '0') parentId = 0;

    // validate if all required parameters are present
    if (!name) {
      msg = 'Missing name';
    } else if (!type || !typesAllowed.includes(type)) {
      msg = 'Missing type';
    } else if (!data && type !== 'folder') {
      msg = 'Missing data';
    } else if (parentId && parentId !== '0') {
      let file;

      // check if parent id is valid
      if (validate.isId(parentId)) {
        file = await this.getFile({
          _id: ObjectId(parentId),
        });
      } else {
        file = null;
      }

      // check if parent exists and is a folder
      if (!file) {
        msg = 'Parent not found';
      } else if (file.type !== 'folder') {
        msg = 'Parent is not a folder';
      }
    }

    // return error message if present in addition to file parameters
    const obj = {
      error: msg,
      fileParams: {
        name,
        type,
        parentId,
        isPublic,
        data,
      },
    };

    return obj;
  },

  /**
   * gets file document from db
   * @query {obj} query used to find file
   * @return {object} file
   */
  async getFile(query) {
    const file = await dbClient.files.findOne(query);
    return file;
  },

  /**
   * gets list of file documents from db belonging
   * to a parent id
   * @query {obj} query used to find file
   * @return {Array} list of files
   */
  async getFilesOfParentId(query) {
    const fileList = await dbClient.files.aggregate(query);
    return fileList;
  },

  /**
   * saves files to database and disk
   * @userId {string} query used to find file
   * @fileParams {obj} object with attributes of file to save
   * @FOLDER_PATH {string} path to save file in disk
   * @return {obj} object with error if present and file
   */
  async saveFile(userId, fileParams, FOLDER_PATH) {
    const {
      name, type, isPublic, data,
    } = fileParams;
    let { parentId } = fileParams;

    if (parentId !== 0) parentId = ObjectId(parentId);

    const query = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    if (fileParams.type !== 'folder') {
      const fileNameUUID = uuidv4();

      // decode file data
      const fileDataDecoded = Buffer.from(data, 'base64');

      const path = `${FOLDER_PATH}/${fileNameUUID}`;

      query.localPath = path;

      try {
        await fsPromises.mkdir(FOLDER_PATH, { recursive: true });
        await fsPromises.writeFile(path, fileDataDecoded);
      } catch (err) {
        return { error: err.message, code: 400 };
      }
    }

    const result = await dbClient.files.insertOne(query);

    // query.userId = query.userId.toString();
    // query.parentId = query.parentId.toString();

    const file = this.processFile(query);

    const newFile = { id: result.insertedId, ...file };

    return { error: null, newFile };
  },

  /**
   * Updates a file document in database
   * @query {obj} query to find document to update
   * @set {obj} object with query info to update in Mongo
   * @return {object} updated file
   */
  async updateFile(query, set) {
    const fileList = await dbClient.files.findOneAndUpdate(
      query,
      set,
      { returnOriginal: false },
    );
    return fileList;
  },

  /**
   * Makes a file public or private
   * @request {request_object} express request obj
   * @setPublish {boolean} true or false
   * @return {object} error, status code and updated file
   */
  async publishUnpublish(request, setPublish) {
    const { id: fileId } = request.params;

    if (!validate.isId(fileId)) { return { error: 'Unauthorized', code: 401 }; }

    const { userId } = await userUtils.getUserIdAndKey(request);

    if (!validate.isId(userId)) { return { error: 'Unauthorized', code: 401 }; }

    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!user) return { error: 'Unauthorized', code: 401 };

    const file = await this.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!file) return { error: 'Not found', code: 404 };

    const result = await this.updateFile(
      {
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      },
      { $set: { isPublic: setPublish } },
    );

    const {
      _id: id,
      userId: resultUserId,
      name,
      type,
      isPublic,
      parentId,
    } = result.value;

    const updatedFile = {
      id,
      userId: resultUserId,
      name,
      type,
      isPublic,
      parentId,
    };

    return { error: null, code: 200, updatedFile };
  },

  /**
   * Transform _id into id in a file document
   * @doc {object} document to be processed
   * @return {object} processed document
   */
  processFile(doc) {
    // Changes _id for id and removes localPath

    const file = { id: doc._id, ...doc };

    delete file.localPath;
    delete file._id;

    return file;
  },

  /**
   * Checks if a file is public and belongs to a
   * specific user
   * @file {object} file to evaluate
   * @userId {string} id of user to check ownership
   * @return {boolean} true or false
   */
  isOwnerAndPublic(file, userId) {
    if (
      (!file.isPublic && !userId)
      || (userId && file.userId.toString() !== userId && !file.isPublic)
    ) { return false; }

    return true;
  },

  /**
   * Gets a files data from database
   * @file {object} file to obtain data of
   * @size {string} size in case of file being image
   * @return {object} data of file or error and status code
   */
  async getFileData(file, size) {
    let { localPath } = file;
    let data;

    if (size) localPath = `${localPath}_${size}`;

    try {
      data = await fsPromises.readFile(localPath);
    } catch (err) {
      return { error: 'Not found', code: 404 };
    }

    return { data };
  },
};

export default fileUtils;
