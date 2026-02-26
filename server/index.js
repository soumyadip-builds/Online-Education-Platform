const express = require('express');
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
// const router = require("./routes/userRoutes");
const cors = require("cors");

// Creating the express application
const app = express();
// Creating the json parser middleware
app.use(bodyParser.json());
// Enabling CORS for all routes
app.use(cors());
// Loading the environment variables from the .env file
dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGOURL = process.env.MONGO_URL;

mongoose
    .connect(MONGOURL)
    .then(() => {
        console.log("DB Connected Successfully");
        // Starting the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log(err);
    });
