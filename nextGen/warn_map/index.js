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
    
    // get heartbeat from DB, add to object
    var sql = "SELECT latest FROM warn.heartbeat WHERE Id=1"
    var result
    try {
        var [rows,fields] = await pool.query(sql)
    } catch(e) {
        console.log("updateHeartbeat pool.execute Error:", e)
        return
    }
    mapObj.heartbeat = rows[0].latest
    
    // get current alerts from DB
    
    // for each alert
    
        // for each info
        
            // xform to json
        
            // add to the map object
            
    // return object as JSON
    callback( null, JSON.stringify(mapObj))

}


const getHeartbeat = () => {
    
}

const getAlerts = () => {
    
}

const getPolygons = (same ) => {
    
}
