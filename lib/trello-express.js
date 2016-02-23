var Trello = require("trello");
var key = process.env.TRELLO_APP_KEY, token = process.env.TRELLO_USER_TOKEN;
var async = require('async');
var _ = require('lodash');
var slug = require('slug');
var marked = require('marked');
marked.setOptions({
    gfm: true,
    tables: true,
    breaks: true
}); // TODO further parser customizations as per trello-markdown ? headings with no space broken...

var markedp = require('marked');


var trello = new Trello(key, token);

// var api = {};
// api.uri = "https://api.trello.com/1";
// Trello.get('/sessions/socket', success, error);

// var io = require('socket.io-client')
// var socket = io.connect(api.uri + '/sessions/socket?key=' + key + '&token=' + token, {reconnect: true});
// console.log('io:', io, socket);
// Add a connect listener
// socket.on('connect', function(socket) { 
    // console.log('Connected!', socket);
// });

// socket.on('connect_error', function(err){
    // console.log('connect_error on socket:', err);
// })

// this is our return object
var router = require('express').Router();

// we store an array of slug url / name combos for building a simple one-level deep navigation
var nav = []; 

// generic route handler
function handler(req, res) {
    // for now we just do render statics
    // "this" is used to create a bound route definition object, as parsed from Trello API.
    // console.log("handler:", this.name, this.slug, this.cards.length);
    res.render("trello-list", {
        content: this.cards,
        title: this.name,
        nav: nav,
        path: this.slug
    });
}

// addroute: 
// once we have a handler bound to a route definition, we wire it up to our router on the path
function addroute(path, hdlr) {
    // console.log("ADDROUTE:", path);
    router.get(path, hdlr);
}

// iterate all our configured routes, adding using above methods
function addroutes(cfg, sitename) {

    _.each(cfg, function (routedef, listid) {
        // add the bound route handler for each board list
        var path = "/" + routedef.slug;
        addroute(path, handler.bind(routedef));
        // add relevant info to the nav object
        nav.push({url: path, text: routedef.name});
    });
    // add an index page! TODO maybe look for a special list name to use here OR use an option
    addroute('/', handler.bind({name: sitename, cards: [], slug: '/'}))
}
// end router stuff

// our export function so we can get some options.
module.exports = function(options){
    // specify a board via passed option, will default to first board if not set or if not found
    var boardName = options.boardName || "";
    var boardId = options.boardId; // overrides board name
    // console.log('trello logged in:', trello);
    // new options:
    // rootList: 'listid' // specify a list name or list id to use as the root URL of the router

    // use labels to change rendering styles
    var boardLabelData;

    // local async helper method...
    var fetchCards = function(listid, done) {
        // default to all actions for a list get all cards
        trello.getCardsForList(listid, 'all', done);
    }

    // prepare our promise - will collate card content onto the express router 
    var routeP = new Promise(function(resolve, reject) {
        var routeObj = {}; // route and content meta
        // do a bunch of stuff in order on the Trello API
        async.waterfall([
                // get my boards
                function(next) {
                    // console.log('get boards:', boardId, boardName);
                    if (boardId) {
                        next(null, boardId);
                    } else {
                        trello.getBoards("me", next);    
                    }
                    
                },
                // find the named or first board
                function(boards, next) {
                    if (typeof boards === 'string') return next(null, {id: boards});
                    var boardNames = _.map(boards, 'name');
                    // console.log('found board names:', boardNames);
                    var board = _.find(boards, ['name', boardName]);
                    if (!board) {
                        board = boards[0];
                        boardName = board.name;
                    }
                    console.log('found board:', board);  // has labelNames
                    next(null, board);
                },
                // use labels for modifying templates.
                function(board, next) {
                    trello.getLabelsForBoard(board.id, function(err, labels){
                        if (err) return next(err);
                        boardLabelData = labels; // simpler
                        next(null, board);
                    })
                },
                // get lists on the board
                function(board, next) {
                    // need to get list names + ids at the very least.
                    // console.log('get lists on:', board);
                    trello.getListsOnBoard(board.id, next);
                },
                // start getting all the cards on the board, by list
                // TODO could optimize this by just getting all cards on the board, since we sort them out by list id anyway
                function(lists, next) {
                    // console.log('lists on the board:', lists);
                    // now we have enough info to start building our router definition
                    var names = _.map(lists, 'name');
                    // console.log('list names:', names);
                    // prepare the base of our route metadata here...
                    var slugs = _.map(names, (name) => {
                        return {slug: slug(name), name: name, cards: [], sitename: boardName}
                    });
                    var ids = _.map(lists, 'id');
                    routeObj = _.zipObject(ids, slugs);
                    // console.log(names, slugs, ids);
                    // start an async for each list
                    var listFetchers = lists.map((list) => {
                        return fetchCards.bind(this, list.id);
                    });
                    async.parallel(listFetchers, next);
                },
                // sort cards to their correct page by list, plucking the data we want for our pages
                function(listsOfCards, next) {
                    // populates router definition with cards

                    // console.log('routes so far:', routeObj);
                    _.flatten(listsOfCards).forEach((card) => {
                        // simplify card model just have name and desc for now - TODO attachments
                        // console.log('route a card stack:', card);
                        if (routeObj[card.idList]) {
                            // markdown parser here
                            // console.log(card.desc);
                            var cardFormatted = {
                                name: card.name,
                                desc: marked(card.desc),
                                actions: card.actions,
                                labels: card.idLabels
                            }

                            // console.log('actions:', card.actions);
                            var attachments = _.filter(card.actions, (action) => {
                                // console.log(action.type);
                                if (action.data.attachment) { // = 'addAttachmentToCard') {
                                    // console.log(action.data.attachment);
                                    return true;
                                }

                            });
                            var comments = _.reduce(card.actions, function(memo, action) {
                                if (action.type === "commentCard") {
                                    // console.log('comment:', action.data.text);
                                    // weird newline artifacts - some strangeness in the trello-markdown
                                    memo.push(marked(action.data.text).replace('\n', ''));

                                }
                                return memo;
                            }, []);
                            // tag labels for view rendering
                            var labels = _.reduce(card.labels, function(memo, labelId){
                                // console.log('label reduce:', boardLabelData, labelId);
                                memo.push('label-' + labelId.name + labelId.color);
                                return memo;
                            }, []);
                            // console.log('labels:', labels);
                            cardFormatted.labels = labels;
                            cardFormatted.attachments = attachments;
                            cardFormatted.comments = comments;
                            // console.log('attachments:', attachments);
                            routeObj[card.idList].cards.push(cardFormatted);
                            /* 
                            attachment: 
                             { previewUrl2x: 'https://trello-attachments.s3.amazonaws.com/561d2b01473eb47fd8739c48/1200x800/bd081c51b4ec6d24e4f490f0819ff1c0/winterwalk_cropped.jpg',
                               previewUrl: 'https://trello-attachments.s3.amazonaws.com/561d2b01473eb47fd8739c48/600x400/b2481541b9790103e920516075675062/winterwalk_cropped.jpg',
                               url: 'https://trello-attachments.s3.amazonaws.com/561d2b01473eb47fd8739c48/2000x1333/c4674d17f598c49cb0435147daa72de3/winterwalk_cropped.jpg',
                               name: 'winterwalk_cropped.jpg',
                               id: '56c7625f4600a34c913aa25f' } }
                            */
                        }
                    });
                    // TODO filter actions for attachments, resolve URLs of image mime types
                    next(null, routeObj);
                },
                // add all routes to the router
                function(routeData, next) {
                    addroutes(routeObj, boardName);
                    next(null, router);
                }
            ], function(err, router){
            // main async waterfall is done
            // console.log('done all api calls ok:', err, router);
            // resolve / reject our promise. Changed to return an object so we can confirm that the router matches the trello board data
            if (!err) resolve({router: router, data: routeObj});
            reject(err);
        })
    });

    // promise is returned from the module.exports function.
    return routeP;
}