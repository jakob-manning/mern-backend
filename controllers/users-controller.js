const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SERVER_TOKEN_KEY = process.env.WEB_TOKEN_SECRET_KEY

const HttpError = require("../models/http-error")
const User = require("../models/user")

const getUsers = async (req, res,  next) => {
    let users;
    try {
        users = await User.find({}, '-password');
    } catch (e) {
        console.log(e);
        return next(new HttpError("Something went wrong, couldn't find users.", 500))
    }
    res.json({users: users.map(user => user.toObject({getters: true}))})
};

const signup = async (req, res,  next) => {
    const errors = validationResult(req)
    console.log(errors)
    if(!errors.isEmpty()){
        return next(new HttpError("Please provide a valid email and password.", 422))
    }
    const {name, email, password } = req.body

    let existingUser;

    try {
        existingUser = await User.findOne( {email})
    } catch (e) {
        console.log(e);
        return next(new HttpError("Something went wrong, couldn't create user.", 500))
    }

    if(existingUser){
        return next(new HttpError("Email exists already, please login instead", 422))
    }

    let hashedPassword;
    try{
        hashedPassword = await bcrypt.hash(password, 12)
    } catch (e) {
        const error = new HttpError(("Could not create user, please try again."),
            500)
    }

    const newUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []
    })

    try {
        await newUser.save();
    } catch (e) {
        console.log(e);
        return next(new HttpError("Something went wrong, couldn't create user.", 500))
    }

    let token;
    try{
        token = jwt.sign(
            {userId: newUser.id, email: newUser.email},
            SERVER_TOKEN_KEY,
            {expiresIn: "1h"}
        );
    } catch (e) {
        return next(new HttpError("Unable to log you in, please try signing in again."))
    }
    res
        .status(201)
        .json({
            message: "signup successful",
            userId: newUser.id,
            email: newUser.email,
            token: token
            });
};

const login = async (req, res,  next) => {
    const {email, password} = req.body

    let user;
    try {
        user = await User.findOne({email})
    } catch (e) {
        return next(new HttpError("Something went wrong, couldn't complete sign-in.", 500))
    }

    if(!user){
        return next(new HttpError("Couldn't authenticate user, no such user.", 403))
    }

    //compare plain string password to hashed password
    let isValidPassword = false;
    try{
        isValidPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
        return next(new HttpError("Couldn't log you in, check email and password and try again."), 403)
    }

    if(!isValidPassword){
        return next(new HttpError("Invalid login credentials, please check your username and password"))
    }

    //generate token
    let token;
    try{
        token = jwt.sign(
            {userId: user.id, email: user.email},
            SERVER_TOKEN_KEY,
            {expiresIn: "1h"}
        );
    } catch (e) {
        return next(new HttpError("Unable to log you in, please try signing in again."))
    }

    res
        .status(201)
        .json({
            message: "logging in successful",
            userId: user.id,
            email: user.email,
            token: token
        });
};

exports.getUsers = getUsers;
exports.login = login;
exports.signup = signup;