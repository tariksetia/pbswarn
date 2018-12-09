/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.19 12/8/2018
 *
 *************************************************************/

/////////////////////////////////////////////////////
// Data Feed from server
//////////////////////////////////////////////////////

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
    $('#hb').html("Link up " + j.heartbeat)
    // and make array of alerts global
    alerts = j.alerts
    // tell dataTable and scroller to update (from global 'alerts' object)
    updateTable()
    updateScanner()
    updateMap()
}

// when page and scripts are loaded, set up the map, start polling for alerts
$(window).on('load', function() {
    initMap()
    if ($(window).width() < 1000) {
        hideScroll()
        hideList()
    } else {
        showScroll()
        showList()
    }
    setInterval(poll, 10000)
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
