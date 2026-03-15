const express = require("express");
const AuthenticationController = require("../controller/AuthenticationController");

const router = express.Router();

/**
 * @route  POST /api/auth/register
 * @desc   Register user
 */
router.post("/register", AuthenticationController.register);

/**
 * @route  POST /api/auth/login
 * @desc   Login user
 */
router.post("/login", AuthenticationController.login);

module.exports = router;
