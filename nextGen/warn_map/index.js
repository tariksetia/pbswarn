/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.5 11/28/2018
 *
 *************************************************************/

"use strict"

const moment = require('moment')
const xml2js = require('xml2js')
const mysql = require('mysql2/promise')

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

// on GET request
exports.handler = async (event, context, callback) => {
    
    context.callbackWaitsForEmptyEventLoop = false
    var mapObj = { heartbeat: "", alerts: [] }
    mapObj.heartbeat = await getHeartbeat()
    // get [] of current alerts from DB
    var XMLalerts = await getAlerts()
    // transform each alert
    for (var i in XMLalerts) {
        var xml = XMLalerts[i]
        mapObj.alerts.push(await parseAlert(xml))
    }
    // return map data object as JSON
    callback( null, mapObj)

}

const getHeartbeat = async () => {
    var heartbeat = null
    var sql = "SELECT latest FROM warn.heartbeat WHERE Id=1"
    try {
        var [rows,fields] = await pool.query(sql)
        heartbeat = moment(rows[0].latest).format(dbTimeFormat)  // format cleanup
    } catch(e) {
        console.log("getHeartbeat pool.query Error:", e)
    }
    return heartbeat
}

// return CAP XML alerts that haven't expired and haven't been replaced
const getAlerts = async () => {
    var alerts = []
    var now = moment().format(dbTimeFormat)
    var sql = "SELECT * FROM warn.alerts WHERE expires >  ? AND replacedBy IS NULL ORDER BY received DESC"
    
    try {
        var [rows,fields] = await pool.query(sql, now)
        for (var i in rows) {
            alerts.push(rows[i].xml)
        }
    } catch(e) {
        console.log("getAlerts pool.query Error:", e)
    }
    return alerts
}

const parseAlert = async (xml) => {
    var jAlerts = []
    var ns = ""
    try {
        var alert = await x2json(xml)
    } catch (e) {
        console.log("parseAlert x2json Error:", e)
    }
    if (typeof alert != 'undefined') {
        if (typeof alert.$.xmlns != 'undefined') {
            ns = alert.$.xmlns // the XML default namespace
        } else {
            console.log("parseAlert Error: namespace is null")
        }
    } else {
        console.log("parseAlert Error: returned JSON object is empty")
    }
    // if it's a CAP message, create a JSON object for each Info
    if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
       jAlerts = getJsonAlerts(alert)
    }
    return jAlerts
}

const getJsonAlerts = async (alert) => {
    // grab Alert-level values
    var o = {} // holder for Alert-level values
    o.ID = alert.identifier[0]
    o.Sender = alert.sender[0]
    o.Sent = alert.sent[0]
    o.Status = alert.status[0]
    o.MsgType = alert.msgType[0]
    if (typeof alert.source != 'undefined') {
        o.Source = alert.source[0]
    }
    if (typeof alert.scope != 'undefined') {
        o.Scope = alert.scope[0]
    }
    if (typeof alert.code != 'undefined') {
        o.Code = alert.code[0]
    }
    // for each info, create an alert object
    var infos = alert.info
    for (var i in infos) {
        var a = Object.assign({}, o)  // JSON of Info detail with Alert info included
        var info = infos[i]
        if (typeof info.language != 'undefined') {
            a.Language = info.language[0]
        }
        if (typeof info.category != 'undefined') {
            a.Category = info.category[0]
        }
        if (typeof info.event != 'undefined') {
            a.Event = info.event[0]
        }
        if (typeof info.responseType != 'undefined') {
            a.ResponseType = info.responseType[0]
        }
        a.Urgency = info.urgency[0]
        a.Severity = info.severity[0]
        a.Certainty = info.certainty[0]
        //a.Levels = a.Urgency + "/" + a.Severity + "/" + a.Certainty
        if (typeof info.eventCode != 'undefined') {
            a.EventCode = info.eventCode[0]
        }
        if (typeof info.effective != 'undefined') {
            a.Effective = info.effective[0]
        }
        a.Expires = info.expires[0]
        if (typeof info.senderName != 'undefined') {
            a.Source = info.senderName[0]
        }
        if (typeof info.headline != 'undefined') {
            a.Headline = info.headline[0]
        }
        if (typeof info.description != 'undefined') {
            a.Description = info.description[0]
        } else {
            a.Description = ""
        }
        if (typeof info.instruction != 'undefined') {
            a.Instruction = info.instruction[0]
        } else {
            a.Instruction = ""
        }
        if (typeof info.web != 'undefined') {
            a.Web = info.web[0]
        }
        // scan Parameters for CMAMtext
        if (typeof info.parameter != 'undefined') {
            var parameter = info.parameter
            for (var i in parameter) {
                var p = parameter[i]
                if (p.valueName == "CMAMtext") {
                    a.Cmam = p.value[0]
                }
            }
        }
        a.Geocodes = []
        a.Polygons = []
        a.Circles = []
        var areaDescs = []
        // for each area, accumulate the area description, polygons, circles, and geocodes
        if (typeof info.area != 'undefined') {
            for (var i in info.area) {
                var ar = info.area[i]
                areaDescs.push(ar.areaDesc)
                for (var i in ar.polygon) {
                    a.Polygons.push(ar.polygon[i])
                }
                for (var i in ar.circle) {
                    a.Circles.push(ar.circle[i])
                }
                for (var i in ar.geocode) {
                    var gc = ar.geocode[i]
                    if (gc.valueName == "SAME") {
                        a.Geocodes.push(gc.value[0])
                    }
                }
            }
        }
        a.AreaDesc = areaDescs.join(" / ")
        // if there are no polygons from the XML, look up polys for each FIPS/SAME code
        if (typeof ar.polygon == 'undefined' || ar.polygon.length == 0) {
            try {
                var polys = await getPolygons(a.Geocodes)  // gets back an array of polys
                for (var i in polys) {
                    a.Polygons.push(polys[i])
                }
            } catch (e) {
                console.log("parseAlert getPolygons Error:", e)
            }
        } else {
            a.Polygons = ar.polygon
        }
    }
    return a
}

// safe individual value transfer between objects
const assign = (source, target) => {
    if (typeof source != 'undefined') {
        target = source
    }
}

const getPolygons = async (fips) => {
    var polys = []
    // fips is an array of SAME codes
    for (var i in fips) {
        var pp = await queryPolys(fips[i])
        for (var j in pp) {
            polys.push(pp[j])
        }
    }
    return polys
}

const queryPolys = async(same) => {
    var sql = "SELECT polygon FROM warn.fips WHERE samecode=?"
    var polys = []
    try {
        var [rows,fields] = await pool.query(sql, same)
        for (var j in rows) {
            var p = rows[j].polygon
            polys.push(p.replace(/\"/g, "")) // clean off literal quotes from DB
        }
    } catch(e) {
        console.log("queryPolys Error:", e)
    }
    return polys
}

const x2json = async (xml) => {
    var json
    xml2js.parseString(xml, function (err, result) {
        if (err) console.log("xml2js Error",err)
        json = result.alert
    })
    return json
}
