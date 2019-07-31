// 7/28/2019

var masterDiv
var masterSlider
var updateTimer
var clockTimer

// when everything is loaded, set up the display
$(document).ready(function () {
    if ('scrollRestoration' in history) {
        // Back off, browser, I got this...
        history.scrollRestoration = 'manual';
      }

    masterDiv = $("#masterDiv")
    masterSlider = $("#masterSlider")
    // when the display regains focus, update immediately
    window.addEventListener("focus", function() {
        updateList()
    })
    // add Reboot button div
    $("<div id='reboot'>reboot</div>")
    // hide the Info Viewer 
    $("#infoViewer").hide()
    $("#infoDisplay").empty()
    // hide the Raw CAP Viewer 
    $("#rawViewer").hide()
    $("#rawDisplay").empty()
    // paint the list and schedule on interval
    updateList()
    updateTimer = setInterval(updateList, 3000) // warn.js/getItemList
})


// get latest items from server and display per filters
async function updateList() {
    var listString = ""
    items = await getItems(5) // webapi.js/getItems
    // for each item
    for (let i=0; i<items.length; i++) {
        it = JSON.parse(items[i])
        // skip if expired items are hidden
        if (isExpired(it)) {
            if (! $("#ExpiredCB").prop('checked')) continue
        }
        // skip if category is rejected
        if (categoryBlocked(it)) continue
        // if not filtered out, add item div 
        listString = listString+(itemToDiv(it))
        //masterDiv.append(itemToDiv(it))
    }
    //console.log(listString)
    //listString =  ""
    masterDiv.empty()
    masterDiv.html(listString)
}

async function showDisplay(uuid) {
    var display = await getDisplay(uuid)
    disp = await displayToHTML(display)
    $("#infoViewer").html("<div class='button' style='position:relative;top:10px;left:10px;width:29px;'><a href='javascript:hideDisplay()'>close</a></div>" + disp)
    $("#infoViewer").show() 
}

function hideDisplay() {
    $("#infoViewer").hide() 
}

// display the raw CAP XML for an alert
async function showRaw(uuid) {
    var xml = await getRaw(uuid)
    xml = vkbeautify.xml(xml, 5)
    xml = xml.replace(/\&#xA;/g, '\n')
    xml = xml.replace(/\&#39;/g, "'")
    xml = xml.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    $("#rawDisplay").html("<div class='button' style='position:relative;top:10px;left:10px;width:29px;'><a href='javascript:hideRaw()'>close</a></div><pre>" + xml + "</pre>")
    $("#rawViewer").show()
}

function hideRaw() {
    $("#rawDisplay").hide() 
}

/************************
    Formatters
************************/

// format an alert as HTML for a display cell
function itemToDiv(item) {
    var newDivHTML
    var sent = DateTime.fromISO(item.Sent)
    var sent = toDisplayZone(sent).toFormat("HH':'mm':'ss - LL'/'dd'/'yyyy ZZZZ")
    // if alert is expired, mark the div as class expired
    if (isExpired(item)) {
        newDivHTML = "<div class='alertDiv expired' ><table><tr>"
    } else {
        newDivHTML = "<div class='alertDiv'><table><tr>"
    }
    newDivHTML = newDivHTML +
        "<td class='sent'>" + sent + "</td>" +
        "<td class='identifier'>" + item.Identifier+ "</td>" +
        "<td class='sender'>" + item.Sender + "</td>" +
        "<td class='status'>" + item.Status + " " + item.Scope + " " + item.MsgType + "</td>" +
        "</tr></table>" +
        "<table><tr>" +
        "<td class='urgency " + item.Urgency + "'>" + item.Urgency + "</td>" +
        "<td class='severity " + item.Severity + "'>" + item.Severity + "</td>" +
        "<td class='certainty " + item.Certainty + "'>" + item.Certainty + "</td>" +
        "<td class='slug'><a href='javascript:showDisplay(\"" + item.UUID + "\")'>" + item.Slug + "</a></td>" +
        "<td class='senderName'>" + item.SenderName + "</td>" +
        "</tr></table></div>"
    return newDivHTML
}

// build selected display data into display html
async function displayToHTML(display) {
    var infoTab = "<table id='infoTable'>"
    infoTab = infoTab + `<tr><td></td><td>`
    infoTab = infoTab + `<table><tr>
    <td class='urgency ${display.Urgency}'>${display.Urgency} </td>
    <td class='severity ${display.Severity}'>${display.Severity}</td>
    <td class='certainty ${display.Certainty}'>${display.Certainty}</td>
    </tr></table>`
    infoTab = infoTab + `</td></tr>`
    if (display.Headline !="") {
        infoTab = infoTab + `<tr><td class='label'>HEADLINE</td><td>${display.Headline}</td></tr>`
    }
    if (display.WEA !="") {
        infoTab = infoTab + `<tr><td class='label'>WEA&nbsp;TEXT</td><td>${display.WEA}</td></tr>`
    }
    if (display.Lang != "") {
        infoTab = infoTab + `<tr><td class='label'>LANG</td><td>${display.Lang}</td></tr>`
    } 
    if (display.Response != "") {
        infoTab = infoTab + `<tr><td class='label'>RESPONSE</td><td>${display.Response} </td></tr>`
    }
    infoTab = infoTab + `
    <tr><td class='label'>EVENT</td><td>${display.Event}</td></tr>
    <tr><td class='label'>SENDER</td><td>${display.SenderName}</td></tr>
    <tr><td class='label'>CATEGORY</td><td>${display.Categories}</td></tr>
    <tr><td class='label'>EXPIRES</td><td>${display.Expires}</td></tr>`
    if (display.Description != "") {
        infoTab = infoTab + 
        `<tr><td class='label'>DESCRIPTION</td><td>${display.Description.replace(/\n/g, "<br>")} </td></tr>`
    }
    if (display.Description != "") {
        infoTab = infoTab + 
            `<tr><td class='label'>INSTRUCTION</td><td>${display.Instruction.replace(/\n/g, "<br>")}</td></tr>`
    }
    if (display.Contact != "") {
        infoTab = infoTab + `<tr><td class='label'>CONTACT</td><td>${display.Contact} </td></tr>`
    }
    if (display.Web != "") {
        infoTab = infoTab + `<tr><td class='label'>WEB</td><td>${display.Web}</td></tr>`
    }
    infoTab = infoTab + `<tr><td class='label'>AREA</td><td>${display.AreaDesc}</td></tr>`
    // add link to raw
    infoTab = infoTab + `<tr><td></td><td><br><span id='rawCapButton' class='button'><a href="javascript:showRaw('` + display.UUID + `')">View CAP XML</a></span></td></tr>`
    infoTab = infoTab + "</table>"
    return infoTab
}


/************************
    Item filters
************************/

function isNew(item) {
    return false
}

function isExpired(item) {
    expires = DateTime.fromISO(item.Expires)
    if (expires < DateTime.local()) {
        return true
    } else {
        return false
    }
}

function categoryBlocked(item) {
    var stops = getStopCategories()
    var cat = item.Category
    if (stops.indexOf(cat) > -1) return true
    return false
}

// return a string of the unchecked (blocked) categories
function getStopCategories() {
    var cats = ""
    // get array of checkboxes
    var boxes = $(".filter")
    var len = boxes.length
    // for each checkbox, if NOT checked add label to cats
    for (var i=0; i<boxes.length; i++) {
        var box = $(boxes[i])
        if (!box.prop('checked')) { 
            cats = cats + box[0]['name'] + " "
        }
    }
    return cats
}

/************************
    Event Handlers
************************/

// Click on the Expired filter checkbox triggers screen refresh
$("#ExpiredCB").on('change', function () {
    updateList()
    $("#ExpiredCB").blur()
})
  
// Click on one of the filter category checkboxes
$(".filter").on('change', function (e) {
    updateList()
    e.target.blur()
})

// Click on the X in the Info Viewer
$("#infoViewCloser").on('click', function () {
    console.log("close info viewer")
    $("#infoViewer").hide()
    $("#infoDisplay").empty()
})

// Click outside the viewers
$("#masterDiv").on('click', function () {
    $("#infoViewer").hide()
    $("#infoDisplay").empty()
    $("#rawViewer").hide()
    $("#rawDisplay").empty()
})

// Click on the X in the Raw Viewer
$("#rawViewer").on('click', function () {
    $("#rawViewer").hide()
    $("#rawDisplay").empty()
})

// Click on the Reload button
$("#reload").on('click', function() {
    location.reload()
})

/************************
    Utilities
************************/

function setLocalTimeZone(name) {
    DateTime.local().setZone(name)
}
  
function getLocalTimeZone() {
    return DateTime.local().zoneName
}

const textWrap = (text, maxLineLength) => {
    var words = text.replace(/[\r\n]+/g, ' ').split(' ')
    var lineLength = 0
    var output = ''
    for (var word of words) {
      if (lineLength + word.length >= maxLineLength) {
        output += `\n${word} `
        lineLength = word.length + 1
      } else {
        output += `${word} `
        lineLength += word.length + 1
      }
    }
    return output
  }