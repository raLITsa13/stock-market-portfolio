const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
require("dotenv").config({ path: "../.env" });


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://stock-market-predictor-98d40-default-rtdb.firebaseio.com/", // Replace with your Firebase URL
});

const auth = admin.auth();
const db = admin.database();

module.exports = { auth, db };