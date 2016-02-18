# Trello API + Express Router = "trello-express"

An example of driving an Express.js application routes and content from a single Trello board.

## Setup

Clone, npm install.

Customize .env file with your API keys as per Trello API docs.

[Massive overview of this here](https://trello.com/c/fD8ErOzA/26-getting-a-user-token-and-oauth-urls)

Check the boilerplate usage in app.js:

    // example usage of trello router
    var trelloRouter = require('./lib/trello-express')({
        boardName: "My Web Content Board"  
        // if boardName is not provided, we'll grab the first board we see
    });
    // trelloRouter is a Promise. 
    // When it resolves, we are returned an object with an express router and the source data from the Trello board.
    trelloRouter.then(function(routes){
        // The router has all lists as named / slugified routes
        // ... suitable for app.use(endpoint, routes.router)
        app.use('/', routes.router);
        // best to add 404 etc handlers _AFTER_ we get the trello data :)
        addErrorHandlers();
    }).catch(function(err){
        console.log('got err getting trello routes:', err);
    })

Run your app - see your whole board as a web thang!

## TODO

* Check ability to access public boards
* Live site / route updating as board updates are published (Socket API)
* Enable toggling of card content visibility according to card labels.
* Render card attachments!
* Checklists!
* Create NPM module
* Define default list name for router index page content
* Write tests
* Spec for writing custom templates
* More options - specify custom templates, anything else?

