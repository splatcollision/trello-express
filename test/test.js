// test.js

var chai = require('chai'),
    assert = chai.assert;
var httpMocks = require('node-mocks-http');
var jade = require('jade'); // for checking our rendering
var fs = require('fs');
// ready to go jade template
var template = jade.compile(fs.readFileSync(__dirname + '/../views/trello-list.jade'), {filename: __dirname + "/../views/trello-list.jade"});

var Router = require('express').Router();
var testBoardId = "4d5ea62fd76aa1136000000c";
var trelloRouter = require('../lib/trello-express')({
    boardId: "4d5ea62fd76aa1136000000c" // trello development board!
});

// things we want to make sure of:

// we get a valid router
// we get all the lists as route paths
// each route path has all the cards 
// correct content is rendered on the page

describe('trello-express router tests', function(){
    var router, routerObj;
    before(function(done){
        this.timeout(5000);
        trelloRouter.then(function(routes){
           router = routes.router;
           routerObj = routes.data;
           done();
        }).catch(function(err){
            console.log('got err getting trello routes:', err);
        })
    })

    it('should return a routing function', function(){
        assert.instanceOf(router, Function, 'router is a function');
    })
    it('function should have arity of 3: req, res, next', function(){
        assert.equal(router.length, 3);
    })
    it('should have the correct routing stack', function(){
        var routePaths = []; // paths from the router stack
        var slugs = []; // slugs from the source data
        for (var key in router.stack) {
            if (!router.stack.hasOwnProperty(key)) continue;
            
            var val = router.stack[key];
            if (val.route) {
                routePaths.push(val.route.path);
                // console.log('a route:', val.route.path);
            }
        }
        for (var key in routerObj) {
            // console.log(routerObj[key]);
            var slug = routerObj[key].slug;
            slugs.push("/" + slug);
        }
        slugs.push('/'); // mimic index route add
        assert.sameMembers(routePaths, slugs);
    });

    it('should return correct content', function(done){
        this.timeout(5000);
        var request  = httpMocks.createRequest({
            method: 'GET',
            url: '/Live-February-2016'
        });

        var response = httpMocks.createResponse({
            eventEmitter: require('events').EventEmitter
        });

        response.on('end', function(){
            // manually render the body as this is a mock http response and has no real body
            var rdata = this._getRenderData();
            var body = template(rdata);

            assert.equal(200, this.statusCode);
            assert.include(body, "<h2>Linking to card actions or comments</h2>", "the card title was rendered on the page");
            assert.include(body, "Ever wanted to link", "the card description was rendered on the page");
            
            done();
        });
        response.on('error', done);

        router(request, response, function(){
            console.log('router done called');
            // done();
        });





        // test.ok( response._isEndCalled());
        // test.ok( response._isJSON());
        // test.ok( response._isUTF8());

        // test.done();
    });
})