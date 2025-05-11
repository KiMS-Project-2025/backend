require("dotenv").config()

var express = require('express');
const cors = require("cors")
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
const documentRouter = require("./routes/documentRoutes")
const fileRouter = require("./routes/fileRoutes")
const homeRouter = require("./routes/homeRoutes")
const searchRouter = require("./routes/searchRoutes")
const categoryRouter = require("./routes/categoryRoutes")

var app = express();

app.use(cors({
    origin: process.env.FE_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/document', documentRouter)
app.use('/file', fileRouter)
app.use('/home', homeRouter)
app.use('/search', searchRouter)
app.use('/category', categoryRouter)

module.exports = app;
