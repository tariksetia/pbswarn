/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.18 11/16/2018
 *
 *************************************************************/

"use strict"

const moment = require('moment')
const xml2js = require('xml2js')
const mysql = require('mysql2')
const atob = require('atob')

var pool
var callbackGlobal

var db_config = {
        connectionLimit     : 200,
        host                : 'warn.cluster-czmkuxdhszlq.us-west-2.rds.amazonaws.com',
        port                : 3306,
        user                : 'warn',
        password            : 'warnwarn',
        waitForConnections  : true,
        connectTimeout      : 20000,
        queueLimit          : 0
    }

// on POST call to map URL
exports.handler = async (event, context, callback) => {
    callbackGlobal = callback
    context.callbackWaitsForEmptyEventLoop = false  // asynchronize the handler callback
    //  update the heartbeat value on DB
    var now = moment().format('YYYY-MM-DD HH:mm:ssZ')
    var message = atob(event.body64)  // 'body64' config'd in API GW Resources POST template
    await updateHeartbeat(now)
    // if it's a labeled heartbeat message, short cut out
    if (message == 'heartbeat') {
        respond(context, "200", moment(now).format(), "")
        return
    }
    // else process the POSTed XML
    await procAlert(context, message, now)
    return
}

async function updateHeartbeat(now) {
    var sql = "UPDATE warn.heartbeat SET latest=? WHERE Id=1"
    var conn = mysql.createConnection(db_config)
    conn.execute(sql, [now], function(error, results) {
        if (error) console.log("HB Execute Error", error)
        conn.destroy()
    })
    // ensure time to complete
    await sleep(500)
}

async function procAlert(context, message, now) {
    
    xml2js.parseString(message, function (err, result) {
        if (err) console.log("XML2JS Error",err)
        // extract XML namespace
        var ns = ""
        if (typeof result.alert.$.xmlns != 'undefined') {
            ns = result.alert.$.xmlns // the XML default namespace
        }
        // if it's a CAP message, post the new alert to DB
        if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
            var alert = result.alert
            // extract a few key fields
            var uid = alert.identifier + "," + alert.sender + "," + alert.sent // per CAP spec
            // extract the latest expires time across all Infos
            var alertExpires = ""
            if (typeof alert != 'undefined') {
                if (typeof alert.info != 'undefined') {
                    for (var info of alert.info) {
                        if (info.expires > alertExpires) {
                            alertExpires = info.expires
                        }
                    }
                }
            }
            postAlert(uid, message, alertExpires, now)
        }
    })  

}

async function postAlert(uid, message, expires, now) {
    var sql = "INSERT INTO warn.alerts (uid, xml, expires, received) VALUES (?,?,?,?)"
    var conn = mysql.createConnection(db_config)
    conn.execute(sql, [uid, message, expires, now], function(error, results) {
        conn.destroy()
        if (error) {
            if (error.message.includes("Duplicate entry")) {
                console.log("DUPLICATE", uid) // the DB will error any duplicate UID
                respond("200", moment(now).format(), " " + "DUPLICATE " + uid)
            } else {
                console.log("ERROR", uid, error) // other things can go wrong
                respond("500", moment(now).format(), " " + uid + " " + error)
            }
        } else {
            console.log("ADDED", uid)
            respond("200", moment(now).format(), " " + uid)
        }
    })
    // ensure time to complete
    await sleep(500)
}

async function respond(status, now, uid) {
    callbackGlobal(null, {"statusCode":status, "body":moment(now).format() + " " + uid})
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
