const express = require("express");
const {
  validateUserMiddleware,
  validateUserHasAccessToRestaurant,
  validateAdminUser,
} = require("../../middlewares/middlewares");
const {
  RestaurantModel,
  UserWithRestaurantModel,
  RestaurantEditModel,
  RestaurantState,
  RestaurantChoicesModel,
} = require("../../models/models");
const {
  getCoordinatesFromGmapLink,
  calculateCriticalRestaurantUpdateChanges,
} = require("../../utils");
const { DEFAULT_RESTAURANT_CHOICES } = require("../../constants");

// BASE PATH - /partner/restaurant
const router = express.Router();
router.use(validateUserMiddleware);

router.get("/", async (req, res) => {
  const userRestaurants = await UserWithRestaurantModel.objects({
    user: req.user.id,
  });
  const restaurant_edit_ids = userRestaurants.map((element) => element.resEdit);

  const editedRestaurants = await RestaurantEditModel.objects({
    id: { $in: restaurant_edit_ids },
  });

  return res.status(200).json(editedRestaurants);
});

router.get("/restaurant_choices", async (req, res) => {
  const restaurantChoices = await RestaurantChoicesModel.get_object();
  return res.status(200).json(restaurantChoices ?? DEFAULT_RESTAURANT_CHOICES);
});

router.get("/:id", async (req, res) => {
  const resEdit = await RestaurantEditModel.get_object({
    id: req.params.id,
  });
  return res.status(200).json(resEdit);
});

router.post("/", async (req, res) => {
  const body = req.body;

  const restaurant = new RestaurantModel({
    name: body.name,
    description: body.description,
    cuisines: body.cuisines,
    phoneNumbers: body.phoneNumbers,
    avgPrice: body.avgPrice,
    dineInDetails: body.dineInDetails,
    deliveryDetails: body.deliveryDetails,
    takeawayDetails: body.takeawayDetails,
    facilities: body.facilities,
    metadata: body.metadata,
  });

  //TODO: validate that map link should be of google maps only
  const gmapLink = body.location.gmapLink;
  const coordinates = await getCoordinatesFromGmapLink(gmapLink);
  const location = {
    gmapLink: gmapLink,
    latitude: coordinates["lat"],
    longitude: coordinates["long"],
    areaName: body.location.areaName,
    fullAddress: body.location.fullAddress,
  };
  restaurant.location = location;

  await restaurant.save();
  const resEdit = await RestaurantEditModel({
    editValue: restaurant,
    restaurant: restaurant.id,
  }).save();

  await UserWithRestaurantModel({
    user: req.user.id,
    resEdit: resEdit.id,
  }).save();

  return res.status(200).json(restaurant);
});

router.post("/:id", validateUserHasAccessToRestaurant, async (req, res) => {
  const body = req.body;

  const resEdit = await RestaurantEditModel.get_object({
    id: req.params.id,
  });

  // to avoid updating menu
  body.menu = resEdit.editValue.menu;

  const currentCriticalChanges = calculateCriticalRestaurantUpdateChanges(
    resEdit.editValue,
    body
  );
  if (currentCriticalChanges.includes("gmapLink")) {
    const gmapLink = body.location.gmapLink;
    const coordinates = await getCoordinatesFromGmapLink(gmapLink);
    body.location = {
      gmapLink: gmapLink,
      latitude: coordinates["lat"],
      longitude: coordinates["long"],
      areaName: body.location.areaName,
      fullAddress: body.location.fullAddress,
    };
  } else {
    body.location = resEdit.editValue.location;
  }

  const updatedCriticalFields = [
    ...(resEdit.updatedFields ?? []),
    ...currentCriticalChanges,
  ];

  resEdit.editValue = body;

  if (!updatedCriticalFields) {
    if (resEdit.state == RestaurantState.ACTIVE) {
      // directly update the restaurant since changes are auto-approved
      const restaurant = resEdit.restaurant;
      await restaurant.update(resEdit.editValue);
    }
  } else {
    resEdit.state = RestaurantState.IN_REVIEW;
    resEdit.updatedFields = updatedCriticalFields;
  }

  await resEdit.save();
  return res.status(200).json(resEdit);
});

router.post(
  "/:id/menu",
  validateUserHasAccessToRestaurant,
  async (req, res) => {
    // TODO: calculate if there are actually any changes in menu
    const resEdit = await RestaurantEditModel.get_object({
      id: req.params.id,
    });
    resEdit.editValue.menu = req.body.menu;
    if (!resEdit.updatedFields?.length) resEdit.updatedFields = [];
    resEdit.updatedFields.push("menu");

    resEdit.state = RestaurantState.IN_REVIEW;

    await resEdit.save();

    return res.status(200).json(resEdit);
  }
);

router.delete("/:id", validateUserHasAccessToRestaurant, async (req, res) => {
  // delete RestaurantEditModel, Restaurant, UserWithRestaurantModel
  const resEdit = await RestaurantEditModel.get_object({
    id: req.params.id,
  });
  await resEdit.delete();

  const uwr = await UserWithRestaurantModel.get_object({
    resEdit: req.params.id,
  });

  // Admin can delete any restaurant but we need userId of restaurant owner.
  const userId = uwr.user;

  await uwr.delete();

  const remaininUserRestaurants =
    (await UserWithRestaurantModel.objects({
      user: userId,
    }).populate("resEdit")) ?? [];
  const remainingResEdits = remaininUserRestaurants.map(
    (element) => element.resEdit
  );

  return res.status(200).json(remainingResEdits);
});

// This API can only be accessed by special accounts (admins)
// API to set the state of restaurant
router.post("/:id/state", validateAdminUser, async (req, res) => {
  const newState = req.body.state;

  const resEdit = await RestaurantEditModel.get_object({
    id: req.params.id,
  });

  const restaurant = resEdit.restaurant;

  if (!resEdit || !restaurant) {
    return res.status(404).send("invalid restaurant id");
  }

  // If new state is active or inactive
  if ([RestaurantState.ACTIVE, RestaurantState.IN_ACTIVE].includes(newState)) {
    resEdit.editValue.metadata.state = newState;
    resEdit.reasonsForDisApproval = null;
    resEdit.updatedFields = [];
    await restaurant.update(resEdit.editValue);
  } else {
    // remaining new states are approved/disapproved, which can't affect the RestaurantModel
    if (newState == RestaurantState.APPROVED) {
      resEdit.reasonsForDisApproval = null;
      resEdit.updatedFields = [];
    } else if (newState == RestaurantState.DIS_APPROVED) {
      resEdit.reasonsForDisApproval = req.body.reasonsForDisApproval;
    } else {
      return res.status(400).send("Invalid state value");
    }
  }

  resEdit.state = newState;
  await resEdit.save();

  return res.status(200).json(resEdit);
});

module.exports = router;
