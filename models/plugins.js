const softCRUDPlugin = (schema) => {
  schema.add({
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  // const typesFindQueryMiddleware = [
  //   "count",
  //   "find",
  //   "findOne",
  //   "findOneAndDelete",
  //   "findOneAndRemove",
  //   "findOneAndUpdate",
  //   "update",
  //   "updateOne",
  //   "updateMany",
  // ];

  // const excludeInFindQueriesIsDeleted = async function (next) {
  //   this.where({ isDeleted: false });
  //   next();
  // };

  // typesFindQueryMiddleware.forEach((type) => {
  //   schema.pre(type, excludeInFindQueriesIsDeleted);
  // });

  const excludeInDeletedInAggregateMiddleware = async function (next) {
    this.pipeline().unshift({ $match: { isDeleted: false } });
    next();
  };
  schema.pre("aggregate", excludeInDeletedInAggregateMiddleware);

  const setDocumentIsDeleted = async (doc) => {
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.$isDeleted(true);
    return await doc.save();
  };

  // delete methods (on document level)
  schema.methods.delete = async function () {
    await setDocumentIsDeleted(this);
  };

  schema.methods.really_hard_delete = async function () {
    await this.deleteOne();
  };

  // fetch methods (on model level)

  schema.statics.objects = function (filter = {}) {
    return this.find({ ...filter, isDeleted: false });
  };

  schema.statics.objects_including_deleted = function (filter = {}) {
    return this.find(filter);
  };

  schema.statics.get_object = function (filter = {}) {
    return this.findOne({ ...filter, isDeleted: false });
  };

  schema.statics.get_object_including_deleted = function (filter = {}) {
    return this.findOne(filter);
  };

  // update (on document level)
  schema.methods.update = function (updates) {
    return this.updateOne(updates);
  };
};
module.exports = { softCRUDPlugin };
