require('dotenv').config();

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// example usage of trello router
var trelloRouter = require('./lib/trello-express')({
    // boardName: "My Web Content Board",
    // if boardName is not provided, we'll grab the first board we see
    // .. unless we provide a public boardId
    boardId: "4d5ea62fd76aa1136000000c" // trello development board!
    // TODO since the move to short codes in the URL, figure out how to get public board ids from short codes?
});

// trelloRouter is a Promise. 
// When it resolves, we are returned an Express Router object.
trelloRouter.then(function(routes){
    // The router is with all lists as named / slugified routes
    // ... suitable for app.use(endpoint, routes)
    app.use('/', routes.router);
    // best to add 404 etc handlers _AFTER_ we get the trello data :)
    addErrorHandlers();
}).catch(function(err){
    console.log('got err getting trello routes:', err);
})


var addErrorHandlers = function() {

    /// catch 404 and forward to error handler
    app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    /// error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function(err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}



// we can run via the express generated www script or directly
if (process.mainModule.filename.indexOf('bin/www') === -1) {
    // console.log('running not via www script...');
    server = app.listen(app.get('port'), function() {
      console.log('Express server listening on port ' + server.address().port);
    });
}

module.exports = app;
