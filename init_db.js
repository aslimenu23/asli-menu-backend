const mongoose = require("mongoose");

module.exports = async function initDatabaseConnection() {
    const mongoUri = process.env.MONGO_URI;
    mongoose.set('strictQuery', false);
    return new Promise((resolve, reject) => {
        mongoose.connect(mongoUri, { dbName: "AsliMenu" }).then(connected => {
            console.log('connected with database');
            resolve();
        }).catch(err => {
            // TODO: setup a alert when this fails.
            console.error(`error while connecting to mongodb ${err}`);
            reject();
        });
    })
}

