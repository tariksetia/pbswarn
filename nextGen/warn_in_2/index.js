/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.18 11/14/2018
 *
 *************************************************************/

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
    
    var message = atob(event.body64)  // 'body64' config'd in API GW Resources POST template
    
    //  update the heartbeat value on DB
    var now = moment().format('YYYY-MM-DD HH:mm:ssZ')
    var sql = "UPDATE warn.heartbeat SET latest=? WHERE Id=1"
    pool.execute(sql,[now], function(error,results) {
        if (error) console.log("HB Update Error",error)
        
        /*// read back heartbeat from DB
        pool.query("select * from warn.heartbeat", function(error,results) {
            if (error) console.log("HB Readback Error",error)
            var hb = results[0].latest
            callback(error, {"statusCode":"200", "body":moment(hb).format() + " " + uid})
        })*/
        
    })
    
    // if it's a heartbeat message, short-circuit the rest
    if (message == 'heartbeat') {
        callback(null, {"statusCode":"200", "body":moment(now).format()})
        return
    }
    
    // now parse the submitted CAP XML to JSON
    xml2js.parseString(message, function (err, result) {
        if (err) console.log("XML2JS Error",err)
        
        // save some values
        var alert = result.alert  // the alert structure as JSON
        var ns = ""
        if (typeof alert.$.xmlns != 'undefined') {
            ns = alert.$.xmlns // the XML default namespace
        }
        var uid = alert.identifier + "," + alert.sender + "," + alert.sent // per CAP spec
        
        // extract the latest expires time among all Infos (assuming a CAP message)
        var alertExpires = ""
        if (typeof alert.info != 'undefined') {
            for (var info of alert.info) {
                if (info.expires > alertExpires) {
                    alertExpires = info.expires
                } 
            }
        } 
        
        // if it's a CAP message, post the new alert to DB
        if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
            sql = "INSERT INTO warn.alerts (uid, xml, expires, received) VALUES (?,?,?,?)"
            pool.execute(sql,[uid, message, alertExpires, now], function(error,rows) {
                if (error) console.log("DUPLICATE", uid, error) // the DB will error any duplicate UID
                else console.log("ADDED", uid)
            })
        }
        
        // if it's something else, e.g., CMAM, ignore it for now
        
        // and reply to the HTTP call
        callback(null, {"statusCode":"200", "body":moment(now).format() + " " + uid})
        
    });
            
}
    
