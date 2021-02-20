const HttpError = require("../models/http-error")
const { v4: uuid } = require("uuid")
const { validationResult } = require("express-validator")
const mongoose = require("mongoose")

const getCoordsForAddress = require("../util/location")
const Place = require("../models/place")
const User = require("../models/user")

const getPlaceByID = async (req, res,  next) => {
    const placeID = req.params.pid;
    let place

    try {
        place = await Place.findById(placeID)
    } catch (e) {
        console.log(e)
        return next(new HttpError("Something went wrong, couldn't find a place.", 500))
    }

    if(!place){
        return next(new HttpError("Couldn't find a place for the provided id.", 404))
    }

    res.json({place: place.toObject({getters: true})});
};

const getPlacesByUserID = async (req, res,  next) => {
    const userID = req.params.uid;

    let userWithPlaces

    try{
       userWithPlaces = await User.findById(userID).populate('places');
        console.log(userWithPlaces);
    } catch (err) {
        console.log(err)
        return next(new HttpError("Something went wrong, couldn't find places.", 500))
    }

    if(!userWithPlaces || userWithPlaces.places.length === 0){
        return next(new HttpError("Couldn't find places for the provided id.", 404))
    }
    else res.json({ places: userWithPlaces.places.map( place => place.toObject({getters: true})) });
};

const createPlace = async (req, res, next) => {
    const errors = validationResult(req)
    console.log(errors)
    if(!errors.isEmpty()){
        return next(new HttpError("Invalid inputs passed, please check your data.", 422))
    }
    const { title, description, address, creator } = req.body;

    let coordinates
    try{
        coordinates = await getCoordsForAddress(address);
    } catch (error){
        console.log(error)
        return next(error)
    }


    const createdPlace = new Place(
        {
            title,
            description,
            address,
            location: coordinates,
            image: "https://commons.wikimedia.org/wiki/File:Ranch_style_home_in_Salinas,_California.JPG",
            creator
        }
    )
    console.log(createdPlace)

    let user;
    try {
        user = await User.findById(creator);
    } catch (e) {
        console.log(e);
        return next(new HttpError("Creating place failed, please try again.", 500))
    }

    if(!user){
        return next(new HttpError("Couldn't find user for provided ID.", 404))
    }

    try{
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save( {session: sess});
        user.places.push(createdPlace);
        await user.save({session: sess});
        await sess.commitTransaction()
    } catch (err) {
        console.log(err)
        return next(new HttpError("Creating place failed, please try again"))
    }

    res.status(201).json({place: createdPlace.toObject({getters: true})})

};

const patchPlace = async (req, res, next) => {
    const errors = validationResult(req)
    console.log(errors)
    if(!errors.isEmpty()){
        return next(new HttpError("Invalid inputs passed, please check your data.", 422))
    }
    const placeID = req.params.pid;
    const { title, description } = req.body;
    let place

    try {
        place = await Place.findOneAndUpdate(placeID, {title, description})
    } catch (e) {
        console.log(e)
        return next(new HttpError("Something went wrong, couldn't find a place.", 500))
    }

    if(!place){
        return next(new HttpError("Couldn't find a place for the provided id.", 404))
    }

    res.status(200).json({message:"place updated!", placeData: place.toObject({getters: true})});

};

const deletePlace = async (req, res, next) => {
    const placeID = req.params.pid;
    let deletedPlace;

    try {
        deletedPlace = await Place.findById(placeID).populate('creator')
        console.log(deletedPlace);
        // deletedPlace = await Place.findByIdAndDelete(placeID);
    } catch (e) {
        console.log(e);
        return next(new HttpError("Something went wrong, couldn't delete place.", 500))
    }

    if(!deletedPlace){
        return next(new HttpError("Place could not be found, invalid place ID.", 404))
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await deletedPlace.remove( {session: sess});
        deletedPlace.creator.places.pull(placeID);
        await deletedPlace.creator.save({session: sess});
        await sess.commitTransaction()
    } catch (e) {
        console.log(e);
        return next(new HttpError("Something went wrong, couldn't delete place.", 500))
    }

    res.status(200).json({deletedPlaceID: placeID, deletedPlace: deletedPlace.toObject({getters: true})});
};


exports.getPlaceById = getPlaceByID;
exports.getPlacesByUserID = getPlacesByUserID;
exports.createPlace = createPlace;
exports.patchPlace = patchPlace;
exports.deletePlace = deletePlace;