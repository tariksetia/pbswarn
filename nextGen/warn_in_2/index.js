/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.19 11/17/2018
 *
 *************************************************************/

"use strict"

const moment = require('moment')
const xml2js = require('xml2js')
const mysql = require('mysql2/promise')
const atob = require('atob')

var now
var callbackGlobal

var dbTimeFormat = "YYYY-MM-DD HH:mm:ssZ"

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
    
var pool = mysql.createPool(db_config)

// on POST call
exports.handler = async (event, context, callback) => {
    callbackGlobal = callback
    //console.log(callbackGlobal)
    context.callbackWaitsForEmptyEventLoop = false  // asynchronize the handler callback
    //  update the heartbeat value on DB
    now = moment().format(dbTimeFormat)
    var message = atob(event.body64)  // 'body64' config'd in API GW Resources POST template
    await updateHeartbeat()
    // if it's a labeled heartbeat message, short-cut out
    if (message == 'heartbeat') {
        respond("200", "heartbeat")
        return
    } else {
        // else process the POSTed XML
        await procAlert(context, message)
        return
    }
}

async function updateHeartbeat() {
    var sql = "UPDATE warn.heartbeat SET latest=? WHERE Id=1"
    try {
        await pool.execute(sql, [now])//, function(error, results) {
    } catch(e) {
        console.log("updateHeartbeat pool.execute Error:", e)
    }
    //await sleep(85)
}

async function procAlert(context, message) {
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
            var uid = alert.identifier + "," + alert.sender + "," + alert.sent // per CAP spec
            // extract the latest expires time across all Infos
            var alertExpires = ""
            if (typeof alert != 'undefined' && typeof alert.info != 'undefined') {
                for (var info of alert.info) {
                    if (info.expires > alertExpires) {
                        alertExpires = info.expires
                    }
                }
            }
            postAlert(uid, message, alertExpires)
        }
    })  
}

async function postAlert(uid, message, expires) {
    var sql = "INSERT INTO warn.alerts (uid, xml, expires, received) VALUES (?,?,?,?)"
    expires = moment(expires[0]).format(dbTimeFormat)
    try {
        await pool.execute(sql, [uid, message, expires, now])
        console.log("ADDED", uid)
        respond("200", "ADDED " + uid)
        return
    } catch(e) {
        if (e.message.includes("Duplicate entry")) {
            console.log("DUPLICATE", uid)
            respond("200", "DUPLICATE " + uid)
        } else {
            console.log("ERROR", uid, e)
            respond("500", "ERROR  " + uid + " " + e)
        }
        return
    }
}

async function respond(status, uid) {
    callbackGlobal(null, {"statusCode":status, "body":moment(now).format() + " " + uid})
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
