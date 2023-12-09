const mongoose = require("mongoose");
const {
  EmbeddedDocSchema,
  BaseModelSchema,
  StrModelChoices,
} = require("./base");
const logger = require("../logger");
const {
  DarkLaunchFeatureModel,
  DarkLaunchFeatures,
} = require("./dark_launch_features");

const UserSchema = new BaseModelSchema({
  uid: { type: String, required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
});

const LocationSchema = new EmbeddedDocSchema({
  gmapLink: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  areaName: { type: String, required: true },
  fullAddress: { type: String },
});

const TimePeriodSchema = new EmbeddedDocSchema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
});

const ServingDetailsSchema = new EmbeddedDocSchema({
  enabled: { type: Boolean, required: true },
  timings: { type: [TimePeriodSchema], default: [] },
});

const DeliveryDetailsSchema = ServingDetailsSchema.clone().add({
  freeDeliveryDistance: { type: Number },
  deliveryFee: { type: Number },
  maxDeliveryDistance: { type: Number },
});

const FacilitiesSchema = new EmbeddedDocSchema({
  indoorSeating: { type: Boolean },
  freeWifi: { type: Boolean },
  valetParking: { type: Boolean },
});

// A restaurant can be approved of its details but still may not active due to subcription or other reasons.
const RestaurantState = StrModelChoices([
  "IN_REVIEW",
  "DIS_APPROVED",
  "APPROVED",
  "ACTIVE",
  "IN_ACTIVE",
]);
const DishType = StrModelChoices(["VEG", "VEG_EGG", "NON_VEG"]);

const DishSchema = new EmbeddedDocSchema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  dishType: { type: String, required: true, enum: Object.keys(DishType) },
  isBestSeller: { type: Boolean, default: false },
});

const RestaurantMetadataSchema = new EmbeddedDocSchema({
  state: {
    type: String,
    enum: Object.keys(RestaurantState),
    default: RestaurantState.IN_REVIEW,
  },
  onboardedOn: { type: Date, default: Date.now },
  subscriptionExpiresOn: { type: Date },
  isFreeSubscription: { type: Boolean },
  isManagedByOwner: { type: Boolean },
});

const RestaurantSchema = new BaseModelSchema({
  name: { type: String, required: true },
  description: { type: String },
  location: { type: LocationSchema, required: true },
  cuisines: { type: [String], default: [] },
  phoneNumbers: { type: [String], default: [] },
  dineInDetails: { type: ServingDetailsSchema },
  takeAwayDetails: { type: ServingDetailsSchema },
  deliveryDetails: { type: DeliveryDetailsSchema },

  avgPrice: { type: Number },
  facilities: { type: FacilitiesSchema },

  menu: { type: [DishSchema], default: [] },

  metadata: {
    type: RestaurantMetadataSchema,
    default: { state: RestaurantState.IN_REVIEW },
  },
});

const DisApprovalReasonDetail = new EmbeddedDocSchema({
  isReason: { type: Boolean, required: true },
  detail: { type: String },
});

const ReasonsForDisApproval = new EmbeddedDocSchema({
  name: { type: DisApprovalReasonDetail },
  description: { type: DisApprovalReasonDetail },
  address: { type: DisApprovalReasonDetail },
  gmapLink: { type: DisApprovalReasonDetail },
  menu: { type: DisApprovalReasonDetail },
});

const RestaurantEditSchema = new BaseModelSchema({
  state: {
    type: String,
    enum: Object.keys(RestaurantState),
    default: RestaurantState.IN_REVIEW,
  },
  editValue: { type: RestaurantSchema, required: true },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  reasonsForDisApproval: { type: ReasonsForDisApproval },
  updatedFields: { type: [String], default: [] },
  reasonForInactive: { type: String },
});
RestaurantEditSchema.pre("find", function () {
  this.populate("restaurant");
});
RestaurantEditSchema.pre("findOne", function () {
  this.populate("restaurant");
});

// deleting the related restaurant
RestaurantEditSchema.pre("delete", async function () {
  await this.restaurant.delete();
});

RestaurantEditSchema.pre("really_hard_delete", async function () {
  await this.restaurant.really_hard_delete();
});

// updating restaurant choices on save
RestaurantEditSchema.post("save", async function (resEdit, next) {
  await updateRestaurantChoices(resEdit);
  next();
});
RestaurantEditSchema.post("update", async function (resEdit, next) {
  await updateRestaurantChoices(resEdit);
  next();
});

const UserWithRestaurantSchema = new BaseModelSchema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  resEdit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RestaurantEdit",
    required: true,
  },
});

const RestaurantChoicesSchema = new BaseModelSchema({
  cuisines: { type: [String], default: [] },
  dishCategories: { type: [String], default: [] },
  dishNames: { type: [String], default: [] },
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

const RestaurantChoicesModel = mongoose.model(
  "RestaurantChoices",
  RestaurantChoicesSchema
);

async function updateRestaurantChoices(resEdit) {
  try {
    // only if changes are approved/active then update the choices
    // or if the dark launch flag is enabled
    if (
      !(
        [RestaurantState.APPROVED, RestaurantState.ACTIVE].includes(
          resEdit.state
        ) ||
        (await DarkLaunchFeatureModel.isEnabled(
          DarkLaunchFeatures.IGNORE_STATE_FOR_RES_CHOICES
        ))
      )
    ) {
      return;
    }

    // there should only be a single object for this model
    let restaurantChoices = await RestaurantChoicesModel.get_object();
    if (!restaurantChoices) {
      restaurantChoices = new RestaurantChoicesModel();
    }

    const cuisines = new Set(restaurantChoices.cuisines);
    const dishCategories = new Set(restaurantChoices.dishCategories);
    const dishNames = new Set(restaurantChoices.dishNames);

    // taking new choices from editValue
    const editValue = resEdit.editValue;

    editValue.cuisines.forEach((element) => cuisines.add(element));
    editValue.menu.forEach((element) => {
      dishCategories.add(element.category);
      dishNames.add(element.name);
    });

    restaurantChoices.cuisines = Array.from(cuisines);
    restaurantChoices.dishCategories = Array.from(dishCategories);
    restaurantChoices.dishNames = Array.from(dishNames);

    await restaurantChoices.save();
  } catch (error) {
    logger.error(error.stack);
  }
}

module.exports = {
  RestaurantEditModel,
  RestaurantModel,
  UserModel,
  UserWithRestaurantModel,
  RestaurantState,
  RestaurantChoicesModel,
};
