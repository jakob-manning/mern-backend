const { validationResult } = require("express-validator")

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

    let existingUser

    try {
        existingUser = await User.findOne( {email})
    } catch (e) {
        console.log(e);
        return next(new HttpError("Something went wrong, couldn't create user.", 500))
    }

    if(existingUser){
        return next(new HttpError("Email exists already, please login instead", 422))
    }

    const newUser = new User({
        name,
        email,
        image: "https://commons.wikimedia.org/wiki/File:Ranch_style_home_in_Salinas,_California.JPG",
        password,
        places: []
    })

    try {
        await newUser.save();
    } catch (e) {
        console.log(e);
        return next(new HttpError("Something went wrong, couldn't create user.", 500))
    }

    res.status(201).json({message: "signup successful", user: newUser.toObject({getters: true})});
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
        return next(new HttpError("Couldn't authenticate user, no such user.", 401))
    }

    if(user.password !== password){
        return next(new HttpError("Couldn't authenticate user, check email and password.", 401))
    }
    res.json({message: "login successful!", token: "1091230918230932"});

};

exports.getUsers = getUsers;
exports.login = login;
exports.signup = signup;