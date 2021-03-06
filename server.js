var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

// Our scraping tools
// request is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var request = require("request");
var cheerio = require("cheerio");

// Require all models
var models = require("./models");

// require ROUTES here
require("./routes/article-routes")(app);
require("./routes/comment-routes")(app);

// set the app to listen on port 3000
app.listen(process.env.PORT || 3000, function() {
  console.log("App running on port 3000!");
});
// var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));


// -------------DATABASE CONFIGURATION FOR MONGOOSE ------------
// -------------Define local MongoDB URI ------------
var databaseUri = "mongodb://localhost/news";
// -------------------------
if (process.env.MONGODB_URI) {
  // THIS EXECUTES WHEN HEROKU APP IS USED
  mongoose.connect(process.env.MONGODB_URI);
} else {
  // THIS EXECUTES WHEN LOCAL APP IS USED
  mongoose.connect(databaseUri);
}
//--------------END database configuration

var db = mongoose.connection;
  
// show any Mongoose errors
db.on('error', function(err) {
  console.log('Mongoose Error: ', err);
});

// once logged in to the db through mongoose, log a success message
db.once('open', function() {
  console.log('Mongoose connection successful.');
});




// Routes
// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  console.log("hit the route");

  // First, we grab the body of the html with request
  request("https://www.reddit.com/",function(error,response,body) {
    console.log("got stuff back from reddit: ");

    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(body);
    console.log("test", $("h2").html());

    // Now, we grab every h2 within an article tag, and do the following:
    $("h2.xfe0h7-0").each(function(i, element) {
      console.log("this is ", $(this).text());
      console.log("parent: ", $(this).parent().attr("href"));

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).text();
      result.link = $(this).parent().attr("href");

      // Create a new Article using the `result` object built from scraping
      models.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          return res.json(err);
        });
        
    });


    

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  models.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our models...
  models.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  models.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return models.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
