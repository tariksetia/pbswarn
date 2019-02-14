/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 2.03 2/14/2019
 *
 *************************************************************/

//////////////////////////////////////////////////////
// Alert Scanner
//////////////////////////////////////////////////////

var tt_running = false
var typed
const hold = 3000
var messageArray
var messagePointer = 0

const hideScroll = () => {
    consoleBG.style.display = "none"
    $('#scrollBtn').html('Scanner')
    haltTT()
    scanning = false
}

const showScroll = () => {
    consoleBG.style.display = "block"
    tableDisp.style.display = "none"
    $('#scrollBtn').html('Scanner Off')
    scanning = true
    viewing = false
}

const updateScanner = () => { // called when new data arrives
    // if we're not already typing and if scanner is active, type next alert
    if ( typeof(typed) == "undefined" && scanning) {
        messagePointer = 0
        showNextAlert()
    }
}

// type the alerts in rotation in sliding div id="console_text"
const showNextAlert = () => {
    if (alerts.length > 0) {
        if (messagePointer >= alerts.length) messagePointer = 0
        alert = alerts[messagePointer]
        showScroll()
        clearMap()
        plot(alert)
        focusOn(alert)
        typeAlert(alert)
        messagePointer++
    } else {
        // if no alerts, hide the scroll background, reset the button and the view
        $("#msgId").html("No alerts")
        consoleBG.style.backgroundColor="transparent"
        msgId.style.backgroundColor = "#fff"
        msgId.style.display="block"
        resetView()
        redrawMap()
        messagePointer = 0
        //restart()
    }
}

// force skipping to the next alert
const forceNext = () => {
    typed.destroy()
    console.log("force")
    showNextAlert()
}

// type out an individual alert, call showNextAlert() again when complete
const typeAlert = alert => { 
    if (typeof(typed) != "undefined") {  // kill any still-running typer
        typed.destroy()
    }
    consoleBG.style.backgroundColor = "#ffffffdd"
    consoleText.textContent = ""
    $("#msgId").html("Alert " + (messagePointer + 1) + " of " + alerts.length)
    clr = getColor(alert) + "aa"
    $("#msgId").css("background-color", clr)
    // in case the Typer doesn't complete normally
    var maxTime = Math.floor(make_text(alert).length / 45) * 1000
    typed = new Typed(consoleText, {
        strings: [make_text(alert)],
        typeSpeed: 10,
        showCursor: false,
        fadeOut: false,
        fadeOutDelay:hold,
        startDelay: 250,
        loop: false,
        onComplete: function(self) {
            // destroy the Typer, reset the text panel position, trigger next
            setTimeout(function(){
                typed.destroy();
                $("#console_text").css('top',0)
                showNextAlert()
            },
            2500)   
        }
    })
}

// escape killer characters in free-text fields
const escape = str => {
    return str.replace("&", "and")
}

// format the alert contents as HTML for the console or table display
const make_text = alert => {
    var sent = alert.Sent
    sent = sent.replace("T"," at ")
    // Prevent killer ampersands in free-text fields
    alert.Source = escape(alert.Source)
    alert.Headline = escape(alert.Headline)
    alert.Cmam = escape(alert.Cmam)
    alert.Description = escape(alert.Description)
    alert.Instruction = escape(alert.Instruction)
    alert.AreaDesc = escape(alert.AreaDesc)
    var text = ""
    var warning = ""
    if (alert.Status == "Test") { warning = "*** TEST MESSAGE ***" }
    if (alert.Status == "Exercise") { warning = "*** EXERCISE MESSAGE ***" }
    if (typeof(alert.Cmam)  == "undefined") {
        alert.Cmam = ""
    }
    if (alert.Headline !=null && alert.Headline.length > 0) {
        heading = alert.Headline
    } else {
        heading = alert.Cmam
    }
    // Now build the html
    if (warning != "") { text = "<p>${warning}</p>"}
    text += `
<small><b>${alert.Source}</b></small><br>
<small>${sent}</small>
<p><font size="+1">${heading}</font></p>
<small>
<p> ${alert.Urgency} / ${alert.Severity} / ${alert.Certainty}&nbsp;&mdash;&nbsp;${alert.ResponseType}</p>
<p>WEA Text:&nbsp;<i>${alert.Cmam}</i></p>
</small>
<p>${alert.Description}</p>
<p>${alert.Instruction}</p>
<p>Area: ${alert.AreaDesc}</p>
<small><p>Expires: ${alert.Expires.replace('T',' ')}</p></small>
<small><p>Ref: ${alert.ID} </p></small>
            `
    if (warning != "") { text += "<p>${warning}</p>"}
    return text;
}

// slide text up as needed to keep bottom line visible
const scrollUp = () => {
    var windowHeight = parseInt($("#console_window").height())
    var textHeight = parseInt($("#console_text").height())
    var offset = parseInt(windowHeight - textHeight)
    if (offset < 0) {
        $("#console_text").css('top', offset)
    } else {
        $("#console_text").css('top',0)
    }
}
var youInterval = setInterval(scrollUp, 200)

// on console close, stop the typewriter
const haltTT = () => {
    tt_running = false;
    if (typeof(typed) != "undefined") {
        typed.destroy()
    }
    $("#console_text").css('top',0)
}

const scanVisible = () => {
    if (consoleBG.style.display = "block") {
        return true
    } else {
        return false
    }
}
