const mysql = require('mysql')
const moment = require('moment')
const xml2js = require('xml2js')

var conn = mysql.createConnection({
  host     : 'warn.cluster-czmkuxdhszlq.us-west-2.rds.amazonaws.com',
  user     : 'warn',
  password : 'warnwarn',
  port     : 3306
});

conn.connect(function(err) {
  if (err) {
    console.error('Database connection failed: ' + err.stack)
    return
  }
  console.log('Connected to database.')
});

exports.handler = async (event) => {
    console.log(event.xml)
    const min = 1
    const max = 6 
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min
    var now = moment().format()
    const message = 'Your dice throw got you: ' + randomNumber + ', issued at ' + now
    return message
}

conn.end()
