const fs = require("fs");
const path = require("path")
require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');

const placesRoutes = require('./routes/places-routes')
const HttpError = require('./models/http-error')
const userRoutes = require('./routes/users-routes')
const mongoose = require("mongoose")
const app = express();

const PORT = process.env.PORT || 5000;

app.use(bodyParser.json())
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
    /** Set CORS settings
     * CORS is enforced by the browser
     * We must add a header to signify that  all domains (*) can accept our response
     * **/
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
    next();
})

app.use('/api/places', placesRoutes)

app.use('/api/users', userRoutes)

app.get('/', (req,res) => {
    res.send("Hello World!")
} )

app.use((req, res, next) => {
    const error = new HttpError("couldn't find this route", 404)
    throw error;
})

//passing four parameters to express middleware tells it you are writing an error handling function
//this code will execute if any above middleware has thrown an error
app.use((error, req, res, next) => {
    if(req.file){
        fs.unlink(req.file.path, err => {
            console.log(err);
        })
    }
    //check if a response has already been sent
    if( res.headerSent){
        return next(error);
    }
    res.status(error.code || 500)
    res.json({message: error.message || "An unknown error occurred"});

})

const DB_URI = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.49781.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`

mongoose
    .connect(DB_URI)
    .then( ()=> {
        app.listen(PORT)
    })
    .catch( err => {
        console.log(err)
    })