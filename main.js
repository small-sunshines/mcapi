"use strict";

const config = require('./config.json'),
    log4js = require('log4js'), logger = log4js.getLogger(),
    express = require('express'), app = express(),
    fs = require('fs'), http = require('http'),
    path = require('path'), bluebird = require('bluebird'),
    redis = require('redis'), onFinished = require('on-finished'),
    bodyParser = require('body-parser');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const db = redis.createClient({
    host: config.redis.host, port: config.redis.port,
    password: config.redis.pass, db: config.redis.database
});

if(config.dev == false) {
    logger.setLevel('INFO');
    process.env.NODE_ENV = 'production';
} else if(config.dev == true) {
    logger.setLevel('DEBUG');
    process.env.NODE_ENV = 'development';
} else {
    logger.setLevel('ALL');
    process.env.NODE_ENV = 'development';
}

//main setting
app.disable('x-powered-by');
app.set('trust proxy', config.trustproxy);
logger.info('trust proxy: '+config.trustproxy);

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//health moniter
app.all('/health', (req, res) => {
    res.status(200).send().end();
});

//logger setup
app.use((req, res, next) => {
    onFinished(res, (err, res) => {
        logger.info(req.protocol+' '+req.method+' '+res.statusCode+' '+req.ip.replace('::ffff:', '')+' '+req.originalUrl);
    });
    next();
});

//main page
app.all('/', (req, res, next) => {
    res.jsonp({
        response: 'Welcome to mcapi.mori.space'
    }).end();
});

//mcapi load
const minecraft = require(__dirname+'/src/minecraft.js')(app, logger, db);


app.use((req, res, next) => {
    res.status(400).jsonp({error: true, type: "invalid uri"}).end();
});
//error handler
app.use((err, req, res, next) => {
    if(err) {
        logger.error(err);
        res.status(500).jsonp({error: 'Something went wrong. Please contact the administrator.'}).end();
    }
});

db.on('error', (err) => {
    logger.error(err);
});

const HTTPServer = http.createServer(app);
HTTPServer.listen(config.http_port, () => {
    logger.info('HTTP listening!');
    logger.info('address: '+HTTPServer.address().address);
    logger.info('port: '+HTTPServer.address().port);
});