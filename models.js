const mongoose = require("mongoose");
const Schema = mongoose.Schema;

class BaseSchema extends Schema {
  constructor(schema) {
    super(schema);
    this.set("toJSON", {
      virtuals: true,
      transform: (doc, converted) => {
        delete converted._id;
      },
    });
    this.set("toObject", { virtuals: true });

    this.add({
      isDeleted: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });
  }
}

const UserSchema = new BaseSchema({
  uid: { type: String, required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true , },
});

const LocationSchema = new BaseSchema({
  gmapLink: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  areaName: { type: String, required: true },
  fullAddress: { type: String },
});

const TimeOfDaySchema = new BaseSchema({
  hour: { type: Number, required: true },
  minute: { type: Number, required: true },
});

const TimePeriodSchema = new BaseSchema({
  startTime: { type: TimeOfDaySchema, required: true },
  endTime: { type: TimeOfDaySchema, required: true },
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
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
});

const UserWithRestaurantSchema = new BaseSchema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
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

module.exports = {RestaurantEditModel, RestaurantModel, UserModel, UserWithRestaurantModel}