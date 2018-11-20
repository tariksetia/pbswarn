/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.1 11/19/2018
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
    
    // for each alert
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
            console.log("parseAlert can't get namespace")
        }
    } else {
        console.log("parseAlert, no JSON alert object")
    }
    // if it's a CAP message, create a JSON object for each Info
    if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
        // grab Alert-level values
        var o = {}
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
            var a = Object.assign({}, o)
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
            // grab SAME code parameters in case they're needed
            var parameter = info.parameter
            var fips = []
            for (var i in parameter) {
                var p = parameter[i]
                if (p.valueName == "SAME") {
                    fips.push(p.value)
                }
            }
            a.polygons = []
            a.circles = []
            var areaDescs = []
            // for each area, accumulate the area description and add polygons and circles
            for (var i in info.area) {
                var ar = info.area[i]
                areaDescs.push(ar.areaDesc)
                for (var i in ar.polygon) {
                    a.polygons.push(ar.polygon[i])
                }
                for (var i in ar.circle) {
                    a.circles.push(ar.circle[i])
                }
            }
            a.areaDesc = areaDescs.join(" / ")
            // if there are no polygons, look up polys for each FIPS/SAME code
            if (a.polygons.length == 0) {
                try {
                    var polys = getPolygons(fips)  // gets back an array of polys
                    a.polygons.push(polys)
                } catch (e) {
                    console.log("parseAlert getPolygons Error:", e)
                }
            }
            console.log(a)
            jAlerts.push(a)
        }
        return jAlerts
    }
}



const getPolygons = async (fips) => {
    var polys = []
    var sql = "SELECT polygon FROM warn.fips WHERE samecode=?"
    // fips is an array of SAME codes
    for (var i in fips) {
        try {
            // each fips code corresponds to an array of polygons
            var [rows,fields] = await pool.query(sql, fips[i])  /// Promise.all[] useful here?  Need to complete all before returning. ///
            for (var j in rows) {
                polys.push(rows[j].polygon)
            }
        } catch(e) {
            console.log("getPolygons pool.query Error:", e)
        }
    }
    return polys
}



const x2json = async (xml) => {
    var json
    xml2js.parseString(xml, function (err, result) {
        if (err) console.log("xml2js Error",err)
        json = result.alert
        //console.log("x2json:", alert)
    })
    return json
}
