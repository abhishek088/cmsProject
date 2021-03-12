//import dependencies like express package
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const { check, validationResult } = require('express-validator');
const { stringify } = require('querystring');

// initialize title, logo and copyright manually in site collection,
// and edit site info on this data.
const siteId = "5fcc4d379bb4d851bc42f7ab";

//set up the DB connection
//database, localhost, name of the database
mongoose.connect('mongodb://localhost:27017/CMSProject', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

//set up global variables
var myApp = express();
myApp.use(bodyParser.urlencoded({ extended: false }));

//set up the path to views ifolder
myApp.set('views', path.join(__dirname, 'views'));

//set up the path to public folder
myApp.use(express.static(__dirname + '/public'));

//define the view engine
myApp.set('view engine', 'ejs');

myApp.use(fileUpload());

//set up session 
myApp.use(session({
    secret: 'asdhhasdhasdh8238123189723d8sda7g79dg',
    resave: false,
    saveUninitialized: true
}));

//----------------------------------------------- 
//set up model for login
const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});
//set up model for page content
const Page = mongoose.model('Page', {
    pageTitle: String,
    pageImageName: String,
    pageContent: String,
    editDate: Date
});
//set up model for website content
const Site = mongoose.model('Site', {
    siteTitle: String,
    copyright: String,
    logoName: String
});

//----------------------------------------------- visitor mode
//home page
myApp.get('/', function(req, res) {
    if (req.session.userLoggedIn) { // check if user logged in, this validation is set in every get method in edit mode
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.find({}).exec(function(err, pages) {
                res.render('home-admin', {
                    pages: pages,
                    logoName: site.logoName,
                    siteTitle: site.siteTitle,
                    copyright: site.copyright
                });
            });
        });
    }
    else{
        Site.findOne({ _id: siteId }, function(err, site) { // fetch site data: Title, logo and copyright. siteId is a _id key in site collection.
            Page.find({}, function(err, pages) { // fetch all pages data for generating nav-visitor menu
                res.render('home', { // these two nested callback functions exist in every get method in visitor mode
                    logoName: site.logoName, // render site information
                    siteTitle: site.siteTitle,
                    copyright: site.copyright,
                    pages: pages // render nav-vistor menu
                });
            });
        });
    }
});

//about page
myApp.get('/about', function(req, res) {
    if (req.session.userLoggedIn) { // check if user logged in, this validation is set in every get method in edit mode
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.find({}).exec(function(err, pages) {
                res.render('about-admin', {
                    pages: pages,
                    logoName: site.logoName,
                    siteTitle: site.siteTitle,
                    copyright: site.copyright
                });
            });
        });
    }
    else{
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.find({}, function(err, pages) {
                res.render('about', {
                    logoName: site.logoName,
                    siteTitle: site.siteTitle,
                    copyright: site.copyright,
                    pages: pages
                });
            });
        });
    }   
});

//sign up page
myApp.get('/signup', function(req, res) {
    Site.findOne({ _id: siteId }, function(err, site) {
        Page.find({}, function(err, pages) {
            res.render('signup', {
                logoName: site.logoName,
                siteTitle: site.siteTitle,
                copyright: site.copyright,
                pages: pages
            });
        });
    });
});

//confirm password validation
function checkConfirmPassword(value, { req }) {
    var password = req.body.password;
    if (value != password) {
        throw new Error('The passwords do not match');
    } else {
        return true;
    }
}

//signup page post
myApp.post('/signup', [
    check('username', 'User name cannot be empty').notEmpty(), // input validation
    check('password').isLength({ min: 4, max: 15 }),
    check('confirmPassword').custom(checkConfirmPassword)
], function(req, res) {
    const errors = validationResult(req);

    var username = req.body.username; // fetch data from form
    var password = req.body.password;
    var confirmPassword = req.body.confirmPassword;

    var pageDate = {
        username: username,
        password: password
    }
    Site.findOne({ _id: siteId }, function(err, site) {
        Page.find({}, function(err, pages) {
            if (!errors.isEmpty()) { // check errors
                res.render('signup', { // render page again if errors exsit
                    errors: errors.array(),
                    username: username,
                    password: password,
                    confirmPassword: confirmPassword,
                    logoName: site.logoName,
                    siteTitle: site.siteTitle,
                    copyright: site.copyright,
                    pages: pages
                });
            } else {
                var newAdmin = new Admin(pageDate); // create an instance and save data into database
                newAdmin.save();
                res.redirect('/login'); // redirect to login page
            }
        });
    });
});

//login page
myApp.get('/login', function(req, res) {
    Site.findOne({ _id: siteId }, function(err, site) {
        Page.find({}, function(err, pages) {
            res.render('login', {
                logoName: site.logoName,
                siteTitle: site.siteTitle,
                copyright: site.copyright,
                pages: pages
            });
        });
    });
});

myApp.post('/login', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;

    Admin.findOne({ username: username, password: password }).exec(function(err, admin) { // find admin and fetch user info

        console.log('Error: ' + err);
        console.log('Admin: ' + admin);

        if (admin) {
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            res.redirect('/allpages'); // redirect to allpages(edit mode) if login successfully
        } 
        else {
            // res.render('login', { error: 'Incorrect username or password.' });
            Site.findOne({ _id: siteId }, function(err, site) {
                Page.find({}, function(err, pages) {
                    res.render('login', {
                        logoName: site.logoName,
                        siteTitle: site.siteTitle,
                        copyright: site.copyright,
                        pages: pages,
                        error: 'Incorrect username or password.'
                    });
                });
            });
        }
    });
});

//logout page
myApp.get('/logout', function(req, res) {
    req.session.username = ''; // clear log in info
    req.session.userLoggedIn = false; // set user login as false
    Site.findOne({ _id: siteId }, function(err, site) {
        Page.find({}, function(err, pages) {
            res.render('login', {
                logoName: site.logoName,
                siteTitle: site.siteTitle,
                copyright: site.copyright,
                pages: pages,
                error: 'You have logged out successfully'
            });
        });
    });
});

//get-page page
myApp.get('/page/:id', function(req, res) { // render new page created by admin
    if (req.session.userLoggedIn) { // check if user logged in, this validation is set in every get method in edit mode
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.find({}).exec(function(err, pages) {
                res.render('page-admin', {
                    logoName: site.logoName,
                    siteTitle: site.siteTitle,
                    copyright: site.copyright,
                    pageTitle: page.pageTitle,
                    pageImageName: page.pageImageName,
                    pageContent: page.pageContent,
                    pages: pages
                });
            });
        });
    }
    else{
        var id = req.params.id;
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.find({}, function(err, pages) {
                Page.findOne({ _id: id }, function(err, page) { // find page by _id via nav-visitor menu
                    res.render('page', {
                        logoName: site.logoName,
                        siteTitle: site.siteTitle,
                        copyright: site.copyright,
                        pageTitle: page.pageTitle,
                        pageImageName: page.pageImageName,
                        pageContent: page.pageContent,
                        pages: pages
                    });
                });
            });
        });
    }
});

//----------------------------------------------- edit mode
//allpages page
myApp.get('/allpages', function(req, res) { // visted by edit tab in visitor mode or all pages tab in edit mode
    if (req.session.userLoggedIn) { // check if user logged in, this validation is set in every get method in edit mode
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.find({}).exec(function(err, pages) {
                res.render('allpages', {
                    pages: pages,
                    logoName: site.logoName,
                    siteTitle: site.siteTitle,
                    copyright: site.copyright,
                })
            });
        });
    } else {
        res.redirect('/login'); // if not login, redirect to login page
    }
});

//add-page page
myApp.get('/add-page', function(req, res) {
    if (req.session.userLoggedIn) {
        Site.findOne({ _id: siteId }, function(err, site) {
            res.render('add-page', {
                logoName: site.logoName,
                siteTitle: site.siteTitle,
                copyright: site.copyright
            });
        });
    } else {
        res.redirect('/login');
    }
});

//add page post
myApp.post('/add-page', [
    check('pageTitle').notEmpty(), // input validation
    check('pageContent').notEmpty()
], function(req, res) {

    var pageTitle = req.body.pageTitle; // fetch data from form
    var pageContent = req.body.pageContent;
    var pageImageName = req.files.pageImage.name;
    var pageImage = req.files.pageImage;
    var editDate = Date.now();

    var pageImagePath = 'public/page_images/' + pageImageName; // create local storage path
    pageImage.mv(pageImagePath, function(err) { // move image to local folder
        console.log(err);
    });

    var pageData = {
        pageTitle: pageTitle,
        pageImageName: pageImageName,
        pageContent: pageContent,
        editDate: editDate
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('add-page', { errors: errors.array() });
    } else {
        var newPage = new Page(pageData); // save data
        newPage.save();
        res.redirect('allpages');
    }
});

//edit-page page
myApp.get('/edit-page/:id', function(req, res) {
    if (req.session.userLoggedIn) {
        var id = req.params.id; // fetch id from route via allpages edit link
        console.log('edit page id: ', id);
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.findOne({ _id: id }).exec(function(err, page) {
                console.log('Error: ' + err);
                console.log('Page: ' + page);
                if (page) { // render page with data if that page exists in database
                    res.render('edit-page', {
                        page: page,
                        logoName: site.logoName,
                        siteTitle: site.siteTitle,
                        copyright: site.copyright
                    });
                } else {
                    res.send('No page found');
                }
            });
        });
    } else {
        res.redirect('login');
    }
});

myApp.post('/edit-page/:id', [
    check('pageTitle').notEmpty(),
    check('pageContent').notEmpty()
], function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var id = req.params.id;
        Page.findOne({ _id: id }).exec(function(err, page) { // find page with errors while editing
            console.log('Error: ' + err);
            console.log('Page: ' + page);
            if (page) {
                res.render('edit-page', { page: page });
            } else {
                res.send('No page found');
            }
        });
    } else {
        var pageTitle = req.body.pageTitle;
        var pageContent = req.body.pageContent;
        var pageImageName = req.files.pageImage.name;
        var pageImage = req.files.pageImage;
        var editDate = Date.now();
        /* var date = new Date();
        var editDate = date.toDateString(); */

        var pageImagePath = 'public/page_images/' + pageImageName;
        pageImage.mv(pageImagePath, function(err) {
            console.log(err);
        });

        var id = req.params.id;
        Page.findOne({ _id: id }).exec(function(err, page) {
            page.pageTitle = pageTitle;
            page.pageImageName = pageImageName;
            page.pageContent = pageContent;
            page.Date = editDate;
            page.save();
        });
        res.redirect('/allpages');
    }
});

//delte-page page
myApp.get('/delete/:id', function(req, res) {
    if (req.session.userLoggedIn) {
        var id = req.params.id;
        console.log(id);
        Site.findOne({ _id: siteId }, function(err, site) {
            Page.findOneAndDelete({ _id: id }).exec(function(err, page) { // fetch id from route via allpages delete link, find and delete data
                console.log('Error: ' + err);
                console.log('Page: ' + page);
                if (page) {
                    res.redirect('/allpages');
                } else {
                    res.render('delete', {
                        logoName: site.logoName,
                        siteTitle: site.siteTitle,
                        copyright: site.copyright,
                        message: 'Sorry, could not delete!'
                    });
                }
            });
        });
    } else {
        res.redirect('/login');
    }
});

//edit-site page
myApp.get('/edit-site', function(req, res) {
    if (req.session.userLoggedIn) {
        Site.findOne({ _id: siteId }).exec(function(err, site) { // edit title, logo and copyright on the existing record
            res.render('edit-site', {
                logoName: site.logoName,
                siteTitle: site.siteTitle,
                copyright: site.copyright,
                site: site
            });
        });
    } else {
        res.redirect('/login');
    }
});

myApp.post('/edit-site', [
    check('siteTitle').notEmpty(),
    check('copyright').notEmpty()
], function(req, res) {
    var siteTitle = req.body.siteTitle;
    var copyright = req.body.copyright;
    var logo = req.files.logo;
    var logoName = req.files.logo.name;

    var logoPath = 'public/logo/' + logoName;
    logo.mv(logoPath, function(err) {
        console.log('Logo moving error: ' + err);
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('edit site errors: ', errors.array());
        res.render('edit-site');
    } else {
        Site.findOne({ _id: siteId }, function(err, site) {
            site.siteTitle = siteTitle;
            site.copyright = copyright;
            site.logoName = logoName;
            site.save();
        });
        res.render('edit', {
            logoName: logoName,
            siteTitle: siteTitle,
            copyright: copyright,
            message: 'Update site successfully'
        });
    }
});

//start the server and listen to a port
myApp.listen(8080);

//confirming the code is working
console.log('server is working..');