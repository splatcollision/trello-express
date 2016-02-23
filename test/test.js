// test.js

var chai = require('chai'),
    assert = chai.assert;
var httpMocks = require('node-mocks-http');
var jade = require('jade'); // for checking our rendering
var fs = require('fs');
// ready to go jade template
var template = jade.compile(fs.readFileSync(__dirname + '/../views/trello-list.jade'), {filename: __dirname + "/../views/trello-list.jade"});

// var testBoardId = "4d5ea62fd76aa1136000000c";
var trelloRouter = require('../lib/trello-express')({
    // boardId: "4d5ea62fd76aa1136000000c" // trello development board!
    boardId: "4f84a60f0cbdcb7e7d40e099" // trello resources board!
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
            done(err);
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
            url: '/Tips'
        });

        var response = httpMocks.createResponse({
            eventEmitter: require('events').EventEmitter
        });

        response.on('end', function(){
            // manually render the body as this is a mock http response and has no real body
            var rdata = this._getRenderData();
            var body = template(rdata);

            assert.equal(200, this.statusCode);
            assert.include(body, "<h2>Use the keyboard shortcuts</h2>", "the card title was rendered on the page");
            assert.include(body, "Often, you can just hover over a card in a list with your mouse and then use a keyboard shortcut.", "the card description was rendered on the page");
                
            done();
        });
        response.on('error', done);

        router(request, response, function(){
            console.log('router done called');
            // done();
        });

    });

    it('should render attachments', function(done){
        // check for img with alt="LinkToCardComment.gif"
        this.timeout(5000);
        var request  = httpMocks.createRequest({
            method: 'GET',
            url: '/Press-Kit'
        });

        var response = httpMocks.createResponse({
            eventEmitter: require('events').EventEmitter
        });

        response.on('end', function(){
            // manually render the body as this is a mock http response and has no real body
            var rdata = this._getRenderData();
            var body = template(rdata);

            assert.equal(200, this.statusCode);
            assert.include(body, 'src="https://trello-attachments.s3.amazonaws.com/54526db2a3396c5f227301cd/2000x1333/560e3d34e8ac387e6795e109268d9cab/michaeljoel_casual.jpg" alt="michaeljoel_casual.jpg"');
                
            done();
        });
        response.on('error', done);

        router(request, response, function(){
            console.log('router done called');
            // done();
        });
    });

    it('should render labels', function(done){

        // get /Tips
        this.timeout(5000);
        var request  = httpMocks.createRequest({
            method: 'GET',
            url: '/Tips'
        });

        var response = httpMocks.createResponse({
            eventEmitter: require('events').EventEmitter
        });

        response.on('end', function(){
            // manually render the body as this is a mock http response and has no real body
            var rdata = this._getRenderData();
            var body = template(rdata);

            assert.equal(200, this.statusCode);
            assert.include(body, '<div class="labels"><span class="label-green"></span></div>', "the card label was rendered on the page");
            // assert.include(body, "Often, you can just hover over a card in a list with your mouse and then use a keyboard shortcut.", "the card description was rendered on the page");
                
            done();
        });
        response.on('error', done);

        router(request, response, function(){
            console.log('router done called');
            // done();
        });

    });

    // TODO add a test to fetch index page and make sure all hyperlinks exist in the nav...


})