const express = require("express");
const {
  UserModel,
  UserWithRestaurantModel,
  RestaurantEditModel,
} = require("../../models/models");
const { validateUserMiddleware } = require("../../middlewares/middlewares");
const router = express.Router();

const userRestaurantRouter = require("./restaurantRoutes");
router.use("/restaurant", userRestaurantRouter);

router.post("/", async (req, res) => {
  // TODO: validations
  const user = new UserModel(req.body);
  await user.save();
  return res.status(200).json(user);
});

router.get("/:uid", async (req, res) => {
  const uid = req.params.uid;
  const user = await UserModel.get_object({ uid });

  if (!user) return res.status(404).send("Invalid userId");

  return res.status(200).json(user);
});

router.post("/isnewuser/", async (req, res) => {
  const phoneNumber = req.body.phoneNumber;

  const user = await UserModel.get_object({ phoneNumber: phoneNumber });

  if (!user) return res.status(200).json({ isNewUser: true });
  return res.status(200).json({ ...user.toJSON(), isNewUser: false });
});

module.exports = router;
