const moment = require('moment')
const xml2js = require('xml2js')
const mysql = require('mysql2')

// on POST call to map URL
exports.handler = (event, context, callback) => {
    
    context.callbackWaitsForEmptyEventLoop = false;
    var now, hb
    var pool = mysql.createPool({
        connectionLimit : 100,
        host     : 'warn.cluster-czmkuxdhszlq.us-west-2.rds.amazonaws.com',
        port     : 3306,
        database : 'warn',
        user     : 'warn',
        password : 'warnwarn',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    })
    
    // New last-heartbeat timestamp
    now = moment().format('YYYY-MM-DD hh:mm:ssZ')
    
    // now parse the CAP XML
    var ns = null, uid = null, alert = null, alertExpires = ""
    var alertXml = event.xml // set aside raw XML to post to db
    xml2js.parseString(event.xml, function (err, result) {
        if (err) console.log("XML Parse Error",err)
        alert = result.alert
        try {
            ns = alert.$.xmlns
            uid = alert.identifier+","+alert.sender+","+alert.sent
        } catch (e) { ns = null; uid=""; }
    });
    
    // extract latest expires time across all Infos
    var infos = alert.info
    for (var o of infos) {
        if (o.expires > alertExpires) {
            alertExpires = o.expires
        }
    }
    
    // if it's CAP post the new alert to DB
    if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
        sql = "INSERT INTO warn.alerts (uid, xml, expires, received) VALUES (?,?,?,?)"
        sql = mysql.format(sql, [uid, alertXml, alertExpires, now])
        try {
            pool.query(sql,function(error,rows) {
                if (error) console.log("DUPLICATE", uid) // the DB will error any dupes by UID
                else console.log("ADDED", uid)
            })
        } catch (e) {console.log("query error", e)}
    }
    
    //  meanwhile, update the heartbeat value on DB
    var sql = "UPDATE warn.heartbeat SET latest=? WHERE Id=1"
    sql = mysql.format(sql, now)
    pool.query(sql,function(error,results) {
        if (error) console.log("HB Update Error",error)
        
        // and then read back
        pool.query("select * from warn.heartbeat", function(error,results) {
            if (error) console.log("HB Readback Error",error)
            hb = results[0].latest
            callback(error, {"statusCode":"200", "body":moment(hb).format() + " " + uid})
        })
    })
    
}
