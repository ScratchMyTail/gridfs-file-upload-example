var express = require('express');
var router = express.Router();
var Busboy = require('busboy'); 
var mongo = require('mongodb'); 
var grid = require('gridfs-stream');

var db = new mongo.Db('test', new mongo.Server('127.0.0.1', 27017));
 var gfs; 

db.open(function(err, db) { 
    if (err) throw err; 
    gfs = grid(db, mongo); 
});


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.post('/', function(req, res, next) {
    var busboy = new Busboy({ headers : req.headers });
    var fileId = new mongo.ObjectId();

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) { 
        console.log('got file', filename, mimetype, encoding); 
        var writeStream = gfs.createWriteStream({ 
            _id: fileId, 
            filename: filename, 
            mode: 'w', 
            content_type: mimetype, 
        }); 
        file.pipe(writeStream); 
    }).on('finish', function() { 
        // show a link to the uploaded file 
        res.writeHead(200, {'content-type': 'text/html'}); 
        res.end('<a href="/showfile/' + fileId.toString() + '">download file</a>'); 
    });  
    req.pipe(busboy); 
});

router.get('/file/:id', function(req, res, next){ 
    gfs.findOne({ _id: req.params.id }, function (err, file) { 
        if (err) return res.status(400).send(err);
         if (!file) return res.status(404).send('');

        res.set('Content-Type', file.contentType); 
        res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
        var readstream = gfs.createReadStream({_id: file._id});
        readstream.on("error", function(err) { 
            console.log("Got error while processing stream " + err.message);
            res.end();
        });  
        readstream.pipe(res); 
    });
 });


router.get('/showfile/:id', function(req, res, next){
   res.render('show', {id: req.params.id});
});

module.exports = router;
