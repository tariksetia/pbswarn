// 8/8/2019

var masterDiv
var masterSlider
var updateTimer
var clockTimer
var persist
var polygons = []
var circles = []
var map
var mapLarge = false

// when everything is loaded, set up the display
$(document).ready(function () {
    // initialize controls per the localStorage
    persist = window.localStorage
    // expired
    if (persist.getItem('expired') != null) {
        var expired = persist.getItem('expired')
        if (expired == 'false') {
            $("#ExpiredCB").prop("checked", false) 
        } else {
            $("#ExpiredCB").prop("checked", true) 
        }
    }
    // freq
    if (persist.getItem('freq') != null) {
        tuneRX(persist.getItem('freq'))
    }
    // time zone
    if (persist.getItem('timeZone') != null) {
        $("#timeZone").val(persist.getItem('timeZone'))
    }
    // [category filter flags]
    if (persist.getItem('categories') != null) {
        var categories = persist.getItem('categories')
        // conform filter CBs to categories-block list
        var boxes = $(".filter")
        var len = boxes.length
        // for each checkbox, if NOT checked add label to cats
        for (var i=0; i<boxes.length; i++) {
            var box = $(boxes[i])
            // get category value for this checkbox
            var val = box[0]['name']
            // if that category appears in stop list, uncheck box
            if (categories.indexOf(val) > -1) {
                box.prop('checked', false)
            }
        }
    }
    if (persist.getItem('filterText') != "") {
        $("#filterText").val(persist.getItem('filterText'))
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
    // sort the items by sent time
    items.sort(sortFunction)
    // for each item
    for (let i=0; i<items.length; i++) {
        it = JSON.parse(items[i])
        // skip if expired items are hidden
        if (isExpired(it)) {
            if (! $("#ExpiredCB").prop('checked')) continue
        }
        // skip if category is rejected
        if (categoryBlocked(it)) continue
        // and apply the text filter if any
        if ($("#filterText").val() != "") {
            if (! hasText(it)) continue
        }
        // if not filtered out, add item div 
        listString = listString+(itemToDiv(it))
    }
    masterDiv.empty()
    masterDiv.html(listString)
}

async function showDisplay(uuid) {
    var display = await getDisplay(uuid)
    disp = await displayToHTML(display)

    prefix = `
    <div class='button' style='position:relative;width:29px;'><a href='javascript:hideDisplay()'>close</div>
    <div id='mapViewer'>
        <div class='button' id='toggleBtn'><a href='javascript:mapToggle()'>toggle map</a></div>
        <div id='mapDisplay'></div>
    </div>
     <div id="infoDisplay">`
    suffix = `
    <div class='button' style='position:relative;width:29px;'><a href='javascript:hideDisplay()'>close</div>
   </div>`
    $("#infoViewer").html(prefix + disp + suffix)
    $("#infoViewer").show() 
    // if we have an Internet connection, show map, else hide it
    if (haveInternet()) {
        $("#mapDisplay").show()
        //$("#mapDisplay").on('click', mapToggle)
        plot(display)
    } else {
        $("#mapDisplay").hide()
    }
    mapMin()
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
    Mapping functions
************************/
function plot(display) {
    var polys = display["Polygons"]
    var circs = display["Circles"]

    map = L.map('mapDisplay')

    map.setView([39.8283, -98.5795],2)
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYXJ0Ym90dGVyZWxsIiwiYSI6ImNqa2czNXg4cjBmMjIzcnFuMWhmcnpsMmUifQ.OqRyUVjM3oI0T7JbsUqxaQ', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
			'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(map)
    // if map unavailable from server, hide the map div
    L.TileLayer.include({
        _tileOnError: function (done, tile, e) {
            mapDisplay.hide()
            done(e, tile);
        } 
    })
    // convert cap polygons to Leaflet polygons, and add to array
    polygons = []
    if (polys.length > 0) {
        polys.forEach(function(capPoly) {
            var polygon = capToPolygon(capPoly)
            polygon.on('click', function() {
                mapToggle()
            })
            polygons.push(polygon)
        })
    }
    // convert cap circles to Leaflet circles, and add to array
    circles = []
    if (circs != null && circs.length > 0) {
        circs.forEach(function(capCircle) {
            var circle = capToCircle(capCircle)
            circle.on('click', function() {
                mapToggle()
            })
            circles.push(circle)
        })
    }
    // start accumulating bounds
    var bnds = null
    //add each Leaflet polygon to the map
    polygons.forEach(function(polygon) {
        polygon.addTo(map)
        // calculate aggregate bounds for all geometries
        if (bnds == null) {
            bnds = polygon.getBounds()
        } else {
            bnds.extend(polygon.getBounds())
        }
    })
    //add each Leaflet circle to the map
    circles.forEach(function(circle) {
        circle.addTo(map)
        // calculate aggregate bounds for all geometries
        if (bnds == null) {
            bnds = circle.getBounds()
        } else {
            bnds.extend(circle.getBounds())
        }
    })
    // now set the map view to buffered aggregate bounds
    map.fitBounds(bnds.pad(0.9))
    // and show the map
    $("#mapViewer").show() 
}

function capToCircle(capCircle) {
    var split = capCircle.split(" ")
    var cSplit = split[0].split(",")
    var center = L.latLng(cSplit[0], cSplit[1])
    var rad = split[1] * 1000
    var circle = L.circle(center, {radius: rad, color: 'red'})
    return circle
}

// convert CAP-formatted polygon string into Leaflet polygon
function capToPolygon(capPoly) {
    capPoly = capPoly.replace(/\"/g,"")
    var points = capPoly.split(" ")
    var poly = ""
    points.forEach(function(point) {
        poly = poly + "[" + point + "],"
    })
    poly = JSON.parse("[" + poly.substring(0,poly.length-1) + "]")
    return L.polygon(poly, {color:'red'})
}

function mapToggle() {
    if (mapLarge) {
        mapMin()
    } else {
        mapMax()
    }
}

function mapMax() {
    $("#mapViewer").css("width", "95%")
    $("#mapViewer").css("height", "100%")
    map.invalidateSize()
    mapLarge = true
}

function mapMin() {
    $("#mapViewer").css("width", "25%")
    $("#mapViewer").css("height", "100%")
    map.invalidateSize()
    mapLarge = false
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
        "<td class='slug'><a href='javascript:showDisplay(\"" + item.UUID + "\")'>" 
    if (isNew(item)) {
        newDivHTML = newDivHTML + "<span class='blinking'>" + item.Slug + "</span>" + "</a></td>"
    } else {
        newDivHTML = newDivHTML + "<span>" + item.Slug + "</span>" + "</a></td>"
    }
    newDivHTML = newDivHTML +"<td class='senderName'>" + item.SenderName + "</td>" +
        "</tr></table></div>"
    return newDivHTML
}

// build selected display data into display html as a table
async function displayToHTML(display) {
    var infoTab = "<table id='infoTable'>"
    infoTab = infoTab + `<tr><td></td><td>`
    infoTab = infoTab + `<table><tr>
    <td class='urgency ${display.Urgency}'>${display.Urgency} </td>
    <td class='severity ${display.Severity}'>${display.Severity}</td>
    <td class='certainty ${display.Certainty}'>${display.Certainty}</td>
    </tr></table>`
    infoTab = infoTab + `</td></tr>`
    var slug = display.Headline
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
    sentTime = DateTime.fromISO(item.Sent)
    threshold = DateTime.local().minus({minutes:1})
    if (sentTime > threshold) {
        return true
    }
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

function hasText(item) {
    var text = $("#filterText").val()
    var content = item.SenderName + " " + item.Slug
    if (content.search(text) > -1) return true
    return false
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
    persist.setItem("expired", $("#ExpiredCB").prop('checked'))
    $("#ExpiredCB").blur()
})
  
// Click on one of the filter category checkboxes
$(".filter").on('change', function (e) {
    updateList()
    persist.setItem("categories", getStopCategories())
    e.target.blur()
})

// Click on the filter text "clear" button
$("#clearFilter").on('click', function () {
    $("#filterText").val("")
    persist.setItem("filterText", $("#filterText").val() )
    updateList()
    $("#clearFilter").blur()
})

// type into filter text
$("#filterText").on('input', function () {
    persist.setItem("filterText", $("#filterText").val() )
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

// Click on the toggle map
$("#toggleBtn").on('click', function() {
    console.log("click")
    mapDisplay.style("width:600px; height:400px")
})

/************************
    Utilities
************************/

function setLocalTimeZone(name) {
    DateTime.local().setZone(name)
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


function sortFunction(a,b){  
    var dateA = new Date(JSON.parse(a).Sent).getTime()
    var dateB = new Date(JSON.parse(b).Sent).getTime()
    return dateA < dateB ? 1 : -1;  
}

function haveInternet() {
    return navigator.onLine
}
