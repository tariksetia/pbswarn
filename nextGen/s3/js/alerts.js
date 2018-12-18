/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.20 12/13/2018
 *
 *************************************************************/

/////////////////////////////////////////////////////
// Data Feed from server
/////////////////////////////////////////////////////

var active = false

const poll = () => {
    try {
    $.ajax({
      url: "https://94e38d27ol.execute-api.us-west-2.amazonaws.com/map",
      data: "",
      success: success,
      error: success,
      dataType: "text/JSON",
      cache: false
    })
    } catch(e) {
        console.log("server poll failed: " + e)
    }
}

// handle arrival of new JSON data from server
const success = data => {
    try {
        j = JSON.parse(data.responseText)
    } catch {
        console.log("JSON parse failed")
        $('#hb').html("Parse Failed")
        return
    }
    // update the heartbeat display
    $('#hb').html("Link up " + j.heartbeat.replace(" ", " / "))
    // and make array of alerts global
    alerts = j.alerts
    // tell List and Scanner to update themselves from global 'alerts' object
    updateTable()
    updateScanner()
    // if changing to no current alerts, reset map to default view
    if (active && alerts.length == 0) {
        resetView()
        active = false
    }
    if (alerts.length > 0) active = true
    // if not viewing or scanning, clear plots and replot
    if (!scanning && !viewing) redrawMap()
}

// when page and scripts are loaded, set up the map, start polling for alerts
$(window).on('load', function() {
    initMap()
    if ($(window).width() < 1000) {
        hideScroll()
        hideList()
    } else {
        showList()
        showScroll()
    }
    setInterval(poll, 15000)
    poll()
})

// when map regains screen focus, poll the alerts data immediately
$(window).bind('focus', function() {
    poll()
})

// true if a particular alert is unexpired
const isCurrent = item => {  // true if not expired
    expString = item.Expires
    exp = new Date(expString)
    zExp = new Date(exp.toISOString()).toISOString()
    now = new Date(new Date().toUTCString().substr(0, 25))
    if (now > zExp) {
        return false
    } else {
        return true
    }
}
