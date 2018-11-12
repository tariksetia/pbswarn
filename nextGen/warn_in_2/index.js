const moment = require('moment')
const xml2js = require('xml2js')

var hb

// on POST call to map URL
exports.handler = (event, context, callback) => {
    
    context.callbackWaitsForEmptyEventLoop = false;
    var now
    
    var mysql = require('mysql')
    var pool = mysql.createPool({
        host     : 'warn.cluster-czmkuxdhszlq.us-west-2.rds.amazonaws.com',
        port     : 3306,
        database : 'warn',
        user     : 'warn',
        password : 'warnwarn'
    })
    
    // First, create the updated heartbeat value
    now = moment().format('YYYY-MM-DD hh:mm:ssZ')
    
    // now parse the CAP XML
    var ns = null, uid = null, alert = null, alertExpires = ""
    var alertXml = event.xml
    var parseString = xml2js.parseString
    parseString(event.xml, function (err, result) {
        if (err) console.log("XML Parse Error",err)
        alert = result.alert
        try {
            ns = alert.$.xmlns
            uid = alert.identifier+","+alert.sender+","+alert.sent
        } catch (e) { ns = null; uid=""; }
    });
    // extract latest expires among all Infos
    var infos = alert.info
    for (var o of infos) {
        if (o.expires > alertExpires) {
            alertExpires = o.expires
        }
    }
    
    // asynchronously update the heartbeat value on DB
    var sql = "UPDATE warn.heartbeat SET latest=? WHERE Id=1"
    sql = mysql.format(sql, now)
    pool.query(sql,function(error,results) {
        if (error) console.log("HB Update Query Setup Error",error)
        // now read back the heartbeat latest value
        sql = "select * from warn.heartbeat"
        pool.query(sql, function(error,results) {
            if (error) console.log("HB Readback Error",error)
            hb = results[0].latest
            callback(error, {"statusCode":"200", "body":moment(hb).format() + " " + uid})
        })
    })
                            
    // and async post the new alert to DB (assuming it's CAP) 
    if (ns == "urn:oasis:names:tc:emergency:cap:1.2") {
        sql = "INSERT INTO warn.alerts (uid, xml, expires, received) VALUES (?,?,?,?)"
        sql = mysql.format(sql, [uid, alertXml, alertExpires, now])
               
        try {
            pool.query(sql,function(error,rows) {
                if (error) console.log("DUPLICATE", uid)
                else console.log("ADDED", uid)
            })
        } catch (e) {console.log("query error", e)}
    }
                        
}
