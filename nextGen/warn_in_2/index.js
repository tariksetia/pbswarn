/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.20 11/18/2018
 *
 *************************************************************/

"use strict"

const moment = require('moment')
const xml2js = require('xml2js')
const mysql = require('mysql2/promise')
const atob = require('atob')

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
    context.callbackWaitsForEmptyEventLoop = false  // asynchronize the handler callback
    var now = moment().format(dbTimeFormat)
    await updateHeartbeat(now)
    var message = atob(event.body64)  // 'body64' config'd in API GW Resources POST template
    // if it's a labeled heartbeat message, short-cut out
    if (message == 'heartbeat') {
        console.log(message)
        await callback(null, {statusCode:"200", body:message})
        return
    } else {
        // send message to DB (dupes will be ignored)
        var [uid, xml, alertExpires, callback] = await procAlert(context, message, callback)
        var [status, rsp] = await postAlert(now, uid, xml, alertExpires, callback)
        await callback(null, {statusCode:status, body:rsp})
    }
}

// update warn.heartbeat.latest in DB
async function updateHeartbeat(now) {
    var sql = "UPDATE warn.heartbeat SET latest=? WHERE Id=1"
    try {
        await pool.execute(sql, [now])
    } catch(e) {
        console.log("updateHeartbeat pool.execute Error:", e)
    }
}

// process XML, get ready to post to DB
async function procAlert(context, xml, callback) {
    var uid, alertExpires, ns
    xml2js.parseString(xml, function (err, result) {
        if (err) console.log("XML2JS Error",err)
        // extract XML namespace
        ns = ""
        if (typeof result.alert.$.xmlns != 'undefined') {
            ns = result.alert.$.xmlns // the XML default namespace
        }
        // if it's a CAP message, post the new alert to DB
        if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
            var alert = result.alert
            uid = alert.identifier + "," + alert.sender + "," + alert.sent // per CAP spec
            // extract the latest expires time across all Infos
            alertExpires = ""
            if (typeof alert != 'undefined' && typeof alert.info != 'undefined') {
                for (var info of alert.info) {
                    if (info.expires > alertExpires) {
                        alertExpires = info.expires
                    }
                }
            }
        }
    }) 
    return [uid, xml, alertExpires, callback]
}

// post XML and keys to DB
async function postAlert(now, uid, xml, expires, callback) {
    var sql = "INSERT INTO warn.alerts (uid, xml, expires, received) VALUES (?,?,?,?)"
    var status, rsp = ""
    expires = moment(expires[0]).format(dbTimeFormat)
    try {
        await pool.execute(sql, [uid, xml, expires, now])
        var rsp = moment(now).format() + " ADDED " + uid
        status = "200"
        console.log(status, rsp)
        callback(null, {statusCode:"200", body:rsp})
    } catch(e) {
        if (e.message.includes("Duplicate entry")) {
            var rsp = moment(now).format() + " DUPLICATE " + uid
            console.log(status, rsp)
        } else {
            var rsp = moment(now).format() + " ERROR " + uid + " " + uid
            console.log(status, rsp)
        }
    }
    return [status, rsp]
}
