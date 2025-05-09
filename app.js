require("dotenv").config()

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
const documentRouter = require("./routes/documentRoutes")
const fileRouter = require("./routes/fileRoutes")
const homeRouter = require("./routes/homeRoutes")
const searchRouter = require("./routes/searchRoutes")

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/document', documentRouter)
app.use('/file', fileRouter)
app.use('/home', homeRouter)
app.use('/search', searchRouter)

module.exports = app;
