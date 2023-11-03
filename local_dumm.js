const initDatabaseConnection = require("./init_db");
const mongoose = require("mongoose");

const {
  RestaurantModel,
  UserModel,
  UserWithRestaurantModel,
} = require("./models/models");

const { StrModelChoices } = require("./models/base");

async function func() {
  await initDatabaseConnection();

  const uwr = await UserWithRestaurantModel.objects();

  const user_ids = uwr.map((val) => val.user);
  console.log(user_ids);

  // const users = await UserWithRestaurantModel.objects_including_deleted({
  //   user: { $in: user_ids },
  // }).populate("user");

  // console.log(users);

  return;

  user = await UserModel.get_object_including_deleted({
    id: "65385b8d19cbd81f936818b5",
  });
  await UserWithRestaurantModel({ user: user }).save();

  user = await UserModel({ name: "b", uid: "bcdd", phoneNumber: "b" }).save();

  console.log(1);
  await user.updateOne({ name: "foden" });

  console.log(2);
  await UserModel.updateOne({ _id: user.id }, { name: "zlatan" });

  console.log(3);
  await UserModel.updateMany({ _id: user.id }, { name: "de bruyne" });

  let user_id = user.id;
  console.log(await UserModel.findById(user_id));

  console.log(4);
  await user.delete();
  console.log("object-", await UserModel.findById(user_id));

  return;
  //   await user.updateOne({ name: "messi" });
  //   return;
  await UserModel.updateMany(
    { _id: "6534d9f0400a2b851dd6b3dc" },
    { name: "messi" }
  );
  //   await UserModel.deleteOne({ _id: "6534ea32be703d913095b11c" });
  return;

  await user.deleteOne();

  await UserModel.updateMany(
    { name: "b" },
    {
      name: "b",
      uid: "bcdd",
      phoneNumber: "b",
      id: "6534ea32be703d913095b11c",
    }
  );

  //   user = await UserModel.findOne({ _id: "6534ea32be703d913095b18c" });

  //   await user.updateOne();

  //   user.id = "6534ea32be703d913095b16c";
  //   user.save();

  //   console.log(user);
  //   console.log(user.id, user._id);
}

func();
