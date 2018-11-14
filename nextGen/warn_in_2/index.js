"use strict"

const moment = require('moment')
const xml2js = require('xml2js')
const mysql = require('mysql2')
const atob = require('atob')

var pool =  mysql.createPool({
                connectionLimit     : 100,
                host                : 'warn.cluster-czmkuxdhszlq.us-west-2.rds.amazonaws.com',
                port                : 3306,
                database            : 'warn',
                user                : 'warn',
                password            : 'warnwarn',
                waitForConnections  : true,
                connectionLimit     : 10,
                queueLimit          : 0
            })

// on POST call to map URL
exports.handler = (event, context, callback) => {
    
    context.callbackWaitsForEmptyEventLoop = false;
    var now, ns, uid, alert, alertXml, alertExpires = ""
    var message = atob(event.body64)
    console.log(message)
    
    //  update the heartbeat value on DB
    now = moment().format('YYYY-MM-DD HH:mm:ssZ')
    var sql = "UPDATE warn.heartbeat SET latest=? WHERE Id=1"
    pool.execute(sql,[now], function(error,results) {
        if (error) console.log("HB Update Error",error)
        if (typeof uid == 'undefined') uid = ""
            
        callback(error, {"statusCode":"200", "body":moment(now).format() + " " + uid})
        
        /*// and then read back
        pool.query("select * from warn.heartbeat", function(error,results) {
            if (error) console.log("HB Readback Error",error)
            var hb = results[0].latest
            callback(error, {"statusCode":"200", "body":moment(hb).format() + " " + uid})
        })*/
    })
    
    if (message != 'heartbeat') {
    
        // now parse the submitted CAP XML to JSON
        xml2js.parseString(message, function (err, result) {
            if (err) console.log("XML Parse Error",err)
            alert = result.alert  // the alert structure as JSON
            try {
                ns = alert.$.xmlns
                uid = alert.identifier + "," + alert.sender + "," + alert.sent // per CAP spec
            } catch (e) { ns = null; uid=""; }
        });
            
        // and extract latest expires time across all Infos
        if (typeof alert.info != 'undefined') {
            for (var info of alert.info) {
                if (info.expires > alertExpires) {
                    alertExpires = info.expires
                } 
            }
        } 
        
        // Now, if it's a CAP message, post the new alert to DB
        if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
            sql = "INSERT INTO warn.alerts (uid, xml, expires, received) VALUES (?,?,?,?)"
            
            try {
                pool.execute(sql,[uid, event.xml, alertExpires, now], function(error,rows) {
                    if (error) console.log("DUPLICATE", uid) // the DB will error any dupes by UID
                    else console.log("ADDED", uid)
                })
            } catch (e) {console.log("query error", e)}
        }
    }
    
}
