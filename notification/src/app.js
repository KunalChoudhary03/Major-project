const express = require('express');
const {connect,subscribeToQueue} = require('./broker/broker');
const setListeners = require('./broker/listener');
const app = express();

connect().then(()=>{
    setListeners();
})
app.get('/',(req,res)=>{
    res.send("Notification Service is up and running")
})

module.exports = app;