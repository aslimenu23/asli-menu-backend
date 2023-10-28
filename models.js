const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const softDeletePlugin = require("./soft_delete_plugin");

class BaseSchema extends Schema {
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

    this.plugin(softDeletePlugin);
  }
}

const UserSchema = new BaseSchema({
  uid: { type: String, required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
});

const LocationSchema = new BaseSchema({
  gmapLink: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  areaName: { type: String, required: true },
  fullAddress: { type: String },
});

const TimePeriodSchema = new BaseSchema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
});

const ServingDetailsSchema = new BaseSchema({
  enabled: { type: Boolean, required: true },
  timings: { type: [TimePeriodSchema], default: [] },
});

const DeliveryDetailsSchema = ServingDetailsSchema.clone().add({
  freeDeliveryDistance: { type: Number },
  minAmount: { type: Number },
  maxDeliveryDistance: { type: Number },
});

const FacilitiesSchema = new BaseSchema({
  indoorSeating: { type: Boolean },
  freeWifi: { type: Boolean },
  valetParking: { type: Boolean },
});

const RestaurantState = ["IN_REVIEW", "DIS_APPROVED", "ACTIVE"];
const DishTypeEnum = ["veg", "veg_egg", "non_veg"];

const DishSchema = new BaseSchema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  dishType: { type: String, required: true, enum: DishTypeEnum },
  isBestSeller: { type: Boolean, default: false },
});

const RestaurantMetadataSchema = new BaseSchema({
  state: { type: String, enum: RestaurantState, default: "IN_REVIEW" },
  onboardedOn: { type: Date, default: Date.now },
  subscriptionExpiresOn: { type: Date },
  isFreeSubscription: { type: Boolean },
  isManaged: { type: Boolean },
});

const RestaurantSchema = new BaseSchema({
  name: { type: String, required: true },
  description: { type: String },
  location: { type: LocationSchema, required: true },
  cuisines: { type: [String], default: [] },
  phoneNumbers: { type: [String], default: [] },
  dineInDetails: { type: ServingDetailsSchema, default: {} },
  takeAwayDetails: { type: ServingDetailsSchema, default: {} },
  deliveryDetails: { type: DeliveryDetailsSchema, default: {} },

  avgPrice: { type: Number },
  facilities: { type: FacilitiesSchema, default: {} },

  dishes: { type: [DishSchema], default: [] },

  metadata: { type: RestaurantMetadataSchema, default: {} },
});

const RestaurantEditSchema = new BaseSchema({
  editState: { type: String, enum: RestaurantState, default: "IN_REVIEW" },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
});

const UserWithRestaurantSchema = new BaseSchema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
});

const UserModel = mongoose.model("User", UserSchema);
const RestaurantModel = mongoose.model("Restaurant", RestaurantSchema);
const UserWithRestaurantModel = mongoose.model(
  "UserWithRestaurant",
  UserWithRestaurantSchema
);

const RestaurantEditModel = mongoose.model(
  "RestaurantEdit",
  RestaurantEditSchema
);

module.exports = {
  RestaurantEditModel,
  RestaurantModel,
  UserModel,
  UserWithRestaurantModel,
};
