const mongoose = require("mongoose");
const { softCRUDPlugin } = require("./plugins");
const Schema = mongoose.Schema;

class EmbeddedDocSchema extends Schema {
  // This Schema is used to create objects within models
  constructor(schema, options) {
    super(schema, options);

    this.set("toJSON", {
      virtuals: true,
      transform: (doc, converted) => {
        delete converted._id;
        delete converted.__v;
      },
    });
    this.set("toObject", { virtuals: true });
  }
}

class BaseModelSchema extends EmbeddedDocSchema {
  // This Schema is used to create models
  constructor(schema, options) {
    super(schema, options);

    this.add({
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    function updateIdFilter(filter = {}) {
      if ("id" in filter) {
        filter._id = filter.id;
        delete filter.id;
      }
    }

    [
      "find",
      "findOne",
      "updateOne",
      "updateMany",
      "deleteOne",
      "deleteMany",
    ].forEach((type) => {
      this.pre(type, function (next) {
        updateIdFilter(this._conditions);
        next();
      });
    });

    this.pre("save", function (next) {
      this.updatedAt = new Date();

      next();
    });

    this.pre("updateOne", { document: true, query: false }, function (next) {
      this.updatedAt = new Date();
      next();
    });

    this.pre("updateOne", { document: false, query: true }, function (next) {
      this._update.updatedAt = new Date();
      next();
    });

    this.pre("updateMany", { document: false, query: true }, function (next) {
      this._update.updatedAt = new Date();
      next();
    });

    this.plugin(softCRUDPlugin);
  }
}

function StrModelChoices(values) {
  const obj = {};
  values.forEach((val) => {
    obj[val] = val;
  });
  return obj;
}

module.exports = { EmbeddedDocSchema, BaseModelSchema, StrModelChoices };
