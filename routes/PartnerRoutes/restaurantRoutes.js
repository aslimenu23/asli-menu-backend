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
} = require("../../models/models");
const { getCoordinatesFromGmapLink } = require("../../utils");

// BASE PATH - /user/restaurant
const router = express.Router();
router.use(validateUserMiddleware);

function calculateCriticalRestaurantUpdateChanges(oldValue, newValue) {
  const updatedFields = [];
  if (oldValue.name != newValue.name) updatedFields.push("name");
  if (oldValue.description != newValue.description)
    updatedFields.push("description");
  if (oldValue.location.gmapLink != newValue.location.gmapLink)
    updatedFields.push("gmapLink");
  if (oldValue.cuisines != newValue.cuisines) updatedFields.push("cuisines");
  if (oldValue.phoneNumbers != newValue.phoneNumbers)
    updatedFields.push("phoneNumbers");
  if (oldValue.avgPrice != newValue.avgPrice) updatedFields.push("avgPrice");

  // we don't check for dine in / takeaway / delivery details => those are auto-approved
}

router.get("/", async (req, res) => {
  const userRestaurants = await UserWithRestaurantModel.objects({
    user: req.user.id,
  });
  const restaurant_ids = userRestaurants.map((element) => element.restaurant);

  const editedRestaurants = await RestaurantEditModel.objects({
    restaurant: { $in: restaurant_ids },
  });

  return res.status(200).json(editedRestaurants);
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
    contacts: body.contacts,
    avgPrice: body.avgPrice,
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

  restaurant.dineInDetails = body.dineInDetails;

  if (body.takeAwayDetails) {
    if (body.takeAwayDetails.sameAsDineIn) {
      delete body.takeAwayDetails.sameAsDineIn;
      restaurant.takeAwayDetails = restaurant.dineInDetails;
    } else restaurant.takeAwayDetails = body.takeAwayDetails;
  }

  if (body.deliveryDetails) {
    if (body.deliveryDetails.sameAsDineIn) {
      delete body.deliveryDetails.sameAsDineIn;
      restaurant.deliveryDetails = {
        ...restaurant.dineInDetails,
        ...body.deliveryDetails,
      };
    } else restaurant.takeAwayDetails = body.takeAwayDetails;
  }

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

  const resEdit = RestaurantEditModel.get_object({
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
  }

  const updatedCriticalFields = [...resEdit.updatedFields, ...currentChanges];

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

  return res.status(200).send(resEdit);
});

module.exports = router;
