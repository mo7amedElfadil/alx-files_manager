import { ObjectId } from 'mongodb';

/**
 * @module validate
 */
const validate = {

  /**
   * Checks if Id is Valid for Mongo
   * @id {string|number} id to be evaluated
   * @return {boolean} true if valid, false if not
   */
  isId(id) {
    try {
      ObjectId(id);
    } catch (err) {
      return false;
    }
    return true;
  },
};

export default validate;
