const bcrypt = require('bcryptjs');
const authValidator = require('../validators/authValidation');
const utility = require('./utilityService');

function loginUser(data, res){
    if (data.mobile) {
        let mobile = data.mobile;
        let valid = authValidator.loginValidate(data);
        valid.then(function (value) {
          let sql = 'SELECT * FROM users WHERE mobile = ?';
          let query = utility.sqlQuery(sql, [mobile]);
          query.then(function (results) {
            if (results.length <= 0) {
              res.json({
                ResponseMsg: 'User doesn\'t exists',
                ResponseFlag: 'F'
              });
            } else {
              //match password
              bcrypt.compare(value.pass, results[0].pass, function (err, isMatch) {
                if (err) {
                  res.json({
                    ResponseMsg: err,
                    ResponseFlag: 'F'
                  });
                  return;
                }
                if (isMatch) {
                  if (results[0].is_blocked) {
                    res.json({
                      ResponseMsg: 'You have been blocked.',
                      ResponseFlag: 'F'
                    });
                  } else if (results[0].is_deleted) {
                    res.json({
                        ResponseMsg: 'Your account has been deleted.',
                        ResponseFlag: 'F'
                      }); 
                  } else {
                    let sql = 'INSERT INTO user_session SET ?';
                    let resMsg = 'Logged In Successfully';
                    signAndStore(value, results, sql, resMsg, res);
                  }
                }else {
                  res.json({
                    ResponseMsg: 'Password is Wrong',
                    ResponseFlag: 'F'
                  });
                }
              });
            }
          }).catch((err) => {
                res.json({
                    ResponseMsg: err,
                    ResponseFlag: 'F'
                });
          });
        }).catch((err) => {
            res.json({
                ResponseMsg: err,
                ResponseFlag: 'F'
            });
        });
    }
    else if (data.fb_social_id && data.fb_access_token) {
        var options = {
            method: 'GET',
            uri: `https://graph.facebook.com/v2.8/${data.fb_social_id}`,
            qs: {
            access_token: data.fb_access_token,
            fields: 'email'
            }
        };
        request(options)
            .then(fbRes => {
                let sql = 'SELECT * FROM users WHERE email = ?';
                let query = utility.sqlQuery(sql, [fbRes.email]);
                query.then(function (results) {
                    if (!results.length > 0) {
                        res.json({
                        ResponseMsg: 'User doesn\'t exists',
                        ResponseFlag: 'F'
                        });
                    } else {
                        if (results[0].is_blocked) {
                        res.json({
                            ResponseMsg: 'You have been blocked.',
                            ResponseFlag: 'F'
                        });
                        } 
                        if (results[0].is_deleted) {
                        res.json({
                            ResponseMsg: 'Your account has been deleted.',
                            ResponseFlag: 'F'
                        });
                        } else {
                        let sql = 'INSERT INTO user_session SET ?';
                        let resMsg = 'Logged In Successfully';
                        signAndStore(data, results, sql, resMsg, res);
                        }
                    }
                }).catch((err) => {
                    res.json({
                        ResponseMsg: err,
                        ResponseFlag: 'F'
                    });
                });
            });
    }
}

function signAndStore(info, results, sql, resMsg, res) {
    let today = new Date();
    var user1 = {
        mobile: results[0].mobile,
        email: results[0].email,
        user_id: results[0].user_id,
    }
    let obj = {
        user: user1
    }
    let logInSecret = process.env.LOGIN_SECRET;
    let expiresIn = '2592000s';
    let token = utility.signature(obj, logInSecret, expiresIn);
    let days = 30;
    let expiryDate = new Date(new Date().getTime() + (days * 24 * 60 * 60 * 1000));
    let sess1 = {
        id_user: results[0].user_id,
        device_type: info.device_type,
        device_token: info.device_token,
        access_token: token,
        is_active: '1',
        expiry: expiryDate,
        sess_creation: today,
        sess_updation: today,
    };
    let data1 = [sess1];
    let query = utility.sqlQuery(sql, data1);
    query.then((value) => {
        logger.log({
            level : 'info',
            message : 'Logged In',
            userId : results[0].user_id,
            timestamp : today
        });
        res.json({
            ResponseMsg: resMsg,
            ResponseFlag: 'S',
            UserId: results[0].user_id,
            token: token
        });
    }).catch((err) => {
        logger.log({
            level: 'error',
            message: err
        });
        res.json({
            ResponseMsg: err,
            ResponseFlag: 'F'
        });
    });
}

function changeUserPassword(valid, res){
    valid.then(function(value){
        hashPassword = utility.hash(value.pass);
        hashPassword.then((resul) => {
            let newPassword = {
                pass : resul
            };
            let sql = 'UPDATE users SET ? WHERE mobile = ?';
            let data = [newPassword, value.mobile];
            let query = utility.sqlQuery(sql, data);
            query.then(function(){
                res.json({
                    ResponseMsg: 'Password Updated',
                    ResponseFlag: 'S'
                });
            }).catch((err) => {
                res.json({
                    ResponseMsg     : err,
                    ResponseFlag    : 'F'
                });
            });
        }).catch((err) => {
            res.json({
                ResponseMsg     : err,
                ResponseFlag    : 'F'
            });
        });
    }).catch(function(err) {
        // send a 422 error response if validation fails
        res.status(422).json({
            status                      : err,
            ResponseMsg                 : 'Invalid request data',
            ResponseFlag                : 'F'
        });
    });
}

function logoutUser(info, res){
    info.then((value) => {
        let today = new Date();
        let sess = {
        is_active: '0',
        sess_updation: today,
        };
        let sql1 = 'UPDATE user_session SET ? WHERE access_token = ?';
        let data1 = [sess, value.access_token];
        let query1 = utility.sqlQuery(sql1, data1);
        query1.then(function (result) {
            res.json({
            ResponseMsg: 'Logged Out',
            ResponseFlag: 'S'
            });
        }).catch((err) => {
            res.json({
                ResponseMsg: err,
                ResponseFlag: 'F'
            });
            return;
        });
    }).catch(function(err) {
        // send a 422 error response if validation fails
        res.status(422).json({
            status                      : err,
            ResponseMsg                 : 'Invalid request data',
            ResponseFlag                : 'F'
        });
    });
}

module.exports = {
    loginUser,
    changeUserPassword,
    logoutUser
}