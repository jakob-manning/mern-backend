const express = require('express');
const bodyParser = require('body-parser');

const placesRoutes = require('./routes/places-routes')
const HttpError = require('./models/http-error')
const userRoutes = require('./routes/users-routes')
const mongoose = require("mongoose")
const mongoURL = require("./hidden/mongoLogin")

const app = express();

app.use(bodyParser.json())

app.use('/api/places', placesRoutes)

app.use('/api/users', userRoutes)

app.use((req, res, next) => {
    const error = new HttpError("couldn't find this route", 404)
    throw error;
})

//passing four parameters to express middleware tells it you are writing an error handling function
//this code will execute if any above middleware has thrown an error
app.use((error, req, res, next) => {
    //check if a response has already been sent
    if( res.headerSent){
        return next(error);
    }
    res.status(error.code || 500)
    res.json({message: error.message || "An unknown error occurred"});

})

mongoose
    .connect(mongoURL)
    .then( ()=> {
        app.listen(5000)
    })
    .catch( err => {
        console.log(err)
    })