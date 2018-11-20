/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.1 11/20/2018
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
    var sql = "SELECT * FROM warn.alerts"  // the SQL here needs completion <<<
    try {
        var [rows,fields] = await pool.query(sql)
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
        console.log("parseAlert Error: returned JSON object empty")
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
    o.identifier = alert.identifier
    o.sender = alert.sender
    o.sent = alert.sent
    o.status = alert.status
    o.msgType = alert.msgType
    o.source = alert.source
    o.scope = alert.scope
    o.code = alert.code
    // for each info, create an alert object
    var infos = alert.info
    for (var i in infos) {
        var a = Object.assign({}, o)  // JSON of Info detail with Alert info included
        var info = infos[i]
        a.language = info.language
        a.category = info.category
        a.event = info.event
        a.responseType = info.responseType
        a.urgency = info.urgency
        a.severity = info.severity
        a.certainty = info.certainty
        a.eventCode = info.eventCode
        a.effective = info.effective
        a.expires = info.expires
        a.senderName = info.senderName
        a.headline = info.headline
        a.description = info.description
        a.instruction = info.instruction
        a.web = info.web
        // scan Parameters for CMAMtext
        var parameter = info.parameter
        for (var i in parameter) {
            var p = parameter[i]
            if (p.valueName == "CMAMtext") {
                a.CMAMtext = p.value
            }
        }
        a.geocodes = []
        a.polygons = []
        a.circles = []
        var areaDescs = []
        // for each area, accumulate the area description, polygons, circles, and geocodes
        for (var i in info.area) {
            var ar = info.area[i]
            areaDescs.push(ar.areaDesc)
            for (var i in ar.polygon) {
                a.polygons.push(ar.polygon[i])
            }
            for (var i in ar.circle) {
                a.circles.push(ar.circle[i])
            }
            for (var i in ar.geocode) {
                var gc = ar.geocode[i]
                if (gc.valueName == "SAME") {
                    a.geocodes.push(gc.value)
                }
            }
        }
        a.areaDesc = areaDescs.join(" / ")
        // if there are no polygons from the XML, look up polys for each FIPS/SAME code
        if (typeof info.area.polygon == 'undefined' || info.area.polygon == {}) {
            try {
                var polys = await getPolygons(a.geocodes)  // gets back an array of polys
                for (var i in polys) {
                    a.polygons.push(polys[i])
                }
            } catch (e) {
                console.log("parseAlert getPolygons Error:", e)
            }
        } else {
            a.polygons = info.area.polygon
        }
    }
    return a
}

const getPolygons = async (fips) => {
    var polys = []
    // fips is an array of SAME codes
    var fips_chunks = chunkArrayInGroups(fips, 5)
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

const chunkArrayInGroups = (arr, size) => {
    var myArray = []
    for(var i = 0; i < arr.length; i += size) {
        myArray.push(arr.slice(i, i+size))
    }
    return myArray;
}
