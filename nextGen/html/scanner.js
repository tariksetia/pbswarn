/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.19 12/8/2018
 *
 *************************************************************/

//////////////////////////////////////////////////////
// Alert Scanner
//////////////////////////////////////////////////////

var tt_running = false;
var typed;
const hold = 3000;
var messageArray;
var messagePointer = 0;

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
}

const updateScanner = () => { // called when new data arrives
    // if we're not actively typing and if scanner is active, start typing alerts
    if ( typeof(typed) == "undefined") {
        messagePointer = 0
        if (scanning) typeNextAlert()
    }
}

// type the alerts in rotation in sliding div id="console_text"
const typeNextAlert = () => {
    if (typeof(alerts) != "undefined" && alerts.length > 0) {
        if (messagePointer >= alerts.length) messagePointer = 0
        alert = alerts[messagePointer]
        showScroll()
        clearMap()
        focusOn(alert)
        plot(alert)
        consoleBG.style.backgroundColor = "#ffffffdd"
        typeAlert(alert)
        messagePointer++
    } else {
        // if no alerts, hide the scroll background, reset the button and view
        $("#msgId").html("No alerts")
        consoleBG.style.backgroundColor="transparent"
        msgId.style.backgroundColor = "#fff"
        msgId.style.display="block"
        resetView()
    }
}

// type out an individual alert, call typeNextAlert() again when complete
const typeAlert = alert => { 
    if (typeof(typed) != "undefined") {  // kill any still-running typer
        typed.destroy()
    }
    consoleText.textContent = ""
    $("#msgId").html("Alert " + (messagePointer + 1) + " of " + alerts.length)
    clr = getColor(alert) + "aa"
    $("#msgId").css("background-color", clr)
    typed = new Typed(consoleText, {
        strings: [make_text(alert)],
        typeSpeed: 10,
        showCursor: false,
        fadeOut: true,
        fadeOutDelay:hold,
        startDelay: 250,
        loop: false,
        onComplete: function(self) {
            // destroy the Typer, reset the text panel position, trigger next
            setTimeout(function(){
                typed.destroy();
                $("#console_text").css('top',0)
                typeNextAlert()
            },
            2000)   
        }
    })
}

// format the alert contents as HTML for the console or table display
const make_text = alert => {
    var sent = alert.Sent
    sent = sent.replace("T"," at ")
    // Now build the html
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
    ad = alert.AreaDesc
    if (warning != "") { text = "<p>${warning}</p>"}
    text += `
<small><b>${alert.Source}</b></small><br>
<small>${sent}</small>
<p><font size="+1">${heading}</font></p>
<small>
<p> ${alert.Urgency} / ${alert.Severity} / ${alert.Certainty}&nbsp;&mdash;&nbsp;${alert.ResponseType}</p>
<p>WEA Text:&nbsp;&nbsp;<i>${alert.Cmam}</i></p>
</small>
<p>${alert.Description}</p>
<p>${alert.Instruction}</p>
<p>Area: ${ad}</p>
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
