const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function stringGenerator(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
  
function numberGenerator() {
    var val = Math.floor(1000 + Math.random() * 9000);
    return val;
}

function sqlQuery(sql, args) {
    return new Promise(function (resolve, reject) {
        db.query(sql, args, function (err, result) {
        if (err)
            return reject(err);
        resolve(result);
        });
    });
}

function hashAndStore(sql, data, resMsg, res) {
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(data.pass, salt, function (err, hash) {
            if (err) {
                res.json({
                    ResponseMsg: err,
                    ResponseFlag: 'F'
                });
            } else {
                data.pass = hash;
                let query = sqlQuery(sql, [data]);
                query.then(function (result) {
                    res.json({
                        result: result,
                        ResponseMsg: resMsg,
                        ResponseFlag: 'S'
                    });
                }).catch((err) => {
                    res.json({
                        ResponseMsg: err,
                        ResponseFlag: 'F'
                    });
                });
            }
        });
    });
}

function hash(data){
    return new Promise(function (resolve, reject) {
        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(data, salt, function (err, hash) {
                if (err) {
                    return reject(err);
                } else {
                    data = hash;
                    return resolve(data);
                }
            });
        }); 
    });
}

function signature(obj, Secret, expiresin){
    let token = jwt.sign(obj, Secret, {expiresIn: expiresin});
    return token;
}
//Format of Token
//Authorization: Token <access_token>

function splitHeader(req, res, next) {
    //get the auth header
    const tokenHeader = req.headers['authorization'];
    //check if token is undefined.
    if (typeof tokenHeader !== 'undefined') {
      //split at the space
      const split = tokenHeader.split(' ');
      //get token from array
      const token = split[1];
      //set the token
      req.token = token;
      //next middleware
      next();
    } else {
      //Forbidden
      res.status(403).json({
        ResponseMsg: 'Forbidden',
        ResponseFlag: 'F'
      });
    }
}

//verifyToken is a middleware function
function verifyToken(req){
    return new Promise(function (resolve, reject) {
        jwt.verify(req.token, process.env.LOGIN_SECRET, function (err, authData) {
            if (err) {
              return reject(err);
            } else {
              return resolve(authData);
            }
        });
    });
}

function loggedIn(info){
    return new Promise(function (resolve, reject){
        let sql = 'SELECT is_active FROM user_session WHERE access_token = ?';
        let data = [info.access_token];
        let query = sqlQuery(sql, data);
        query.then((result) => {
            if(result[0].is_active == 1){
                return resolve(true);
            }
            else {
                return reject(false);
            }
        }).catch((err) => {
            return reject(false);
        });
    });
}

module.exports = {
    stringGenerator,
    numberGenerator,
    sqlQuery,
    hash,
    signature,
    splitHeader,
    verifyToken,
    loggedIn
}