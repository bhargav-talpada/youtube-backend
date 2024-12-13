// line no : 2,3 both are same import dotenv package both are working
// require('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({
    path: './.env'
})

/* 
------- 1st approch to write db connection professionally -------
*/
connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server Running on ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log('MONGODB connection error !!! ', err)
})


/*
------- 2nd approch to write db connection professionally -------

import express from 'express';
const app = express();

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error) => {
            console.error("ERROR: ", error);
            throw error;            
        })

        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server Running on ${process.env.PORT}`)
        })

    } catch (error) {
        console.error("ERROR: ", error);
        throw error;
    }    
})()
*/