var alerts;

//////////////////////////////////////////////////////
// Printer Viewer
//////////////////////////////////////////////////////

var tt_running = false;
var typed;
var hold = 3000;
var messageArray;
var messagePointer = 0;

var consoleBG = document.getElementById('console_bg');
var consoleWindow = document.getElementById('console_window');
var consoleText = document.getElementById('console_text');
var tableBG = document.getElementById('table_bg');
var tableDisp = document.getElementById('table_display');

// button click to show/hide the console
$('#texts').click(function(){
  if (consoleBG.style.display == "block") {
      consoleBG.style.display = "none";
      $('#texts').html('Printer');
      haltTT();
  } else {
      consoleBG.style.display = "block";
      tableDisp.style.display = "none";
      $('#texts').html('Hide Printer');
      loadTT();
      
  }
});

// collect and format the current alerts
function loadTT() {
    // construct array of display strings
    var alertList = [];
    var i=0, item;
    if (! alerts) { 
        setInterval(loadTT, 1000);
        return;
    }
    while(item = alerts[i++]) {
        var exp = moment(item['Expires'], "YYYY-MM-DD HH:mm:ss").utc();
        var now = moment().utc();
        // only include if not expired
        if (now < exp) {
            var txt = make_text(item);
            alertList.push(txt);
        }
    }
    tt_running = true;
    messageArray = alertList;
    runTT();
}

// format the alert contents for the console display
function make_text(item) {
    
    var sent = item["Sent"];
    
    /*
    //look up table for timezone labels (from UTC offset minutes)
    var zoneFor = {
        "-600":"HST",
        "-540":"AKST",
        "-480":"PST/AST",
        "-420":"MST/PDT",
        "-360":"CST/MDT",
        "-300":"EST/CDT",
        "-240":"AST"
    };
    */
    
    sent = sent.replace("T"," at ");
    
    // Now build the html
    var text = "";   
    text = text + '<small>';
    text = text + item["Source"] + "<br>";
    text = text + '</small>';
    text = text + '<font size="-2">';
    text = text + sent + '<br>';
    text = text + '</font>';
    
    if (item["Headline"]!=null) {
        text = text + '<h3>' + item["Headline"] + '</h3>';
    } else {
        text = text + '<h3>' + item["Cmam"] + '</h3>';
    }
    if (item["Status"] == "Test") {
        text + "TEST MESSAGE: " + text;
    }
    if (item["Status"] == "Exercise") {
        text + "EXERCISE MESSAGE: " + text;
    }
    text = text + '<small>';
    text = text + '<p>' + item["Levels"] + " - " + item["ResponseType"] + "</p>";
    text = text + '<p>' + "WEA Text: <i>\"" + item["Cmam"] + "\"</i>" + "</p>";
    text = text + '</small>';
    
    text = text + "<p>" + item['Description'] + '</p>';
    text = text + "<p>" + item['Instruction'] + '</p>';
    text = text + "<p>Area: " + item['AreaDesc'] + '</p>';
    text = text + '<small>';
    text = text + "<p>Expires: " + item['Expires'].replace("T"," ") + '</p>';
    text = text + '</small>';
    text = text + '<font size="-2">';
    text = text + "<p>Ref: " + item['ID'] + '</p>';
    text = text + '</font>';
    if (item["Status"] == "Test") {
        text = text + "TEST MESSAGE";
    }
    if (item["Status"] == "Exercise") {
        text = text + "EXERCISE MESSAGE";
    }    
    return text;
}

// type the next message in sliding div id="console_text"
function runTT() {
    var message = messageArray[messagePointer];
    if (typeof(typed) != "undefined") {
        typed.destroy();
    }
    consoleText.textContent = "";
    if (message != null) {
        $("#msgId").html("Alert " + (messagePointer + 1) + " of " + messageArray.length);
        typed = new Typed(consoleText, {
            strings: [message],
            typeSpeed: 10,
            showCursor: false,
            fadeOut: true,
            fadeOutDelay:hold,
            startDelay: 250,
            loop: false,
            onComplete: function(self) {
                setTimeout(function(){
                    typed.destroy();
                    $("#console_text").css('top',0);
                    messagePointer++
                    // if at end of alerts, update from received alerts, start again
                    if (messagePointer == messageArray.length) {
                        loadTT();
                        messagePointer = 0;
                    } 
                    // and type the next one
                    runTT();
                },
                2000);
            }
        });
    } else {
        $("#msgId").html("No Alerts");
    }
}

var youInterval = setInterval(scrollUp, 200);

// interval-driven function to scroll up text as needed
function scrollUp() {
    var windowHeight = parseInt($("#console_window").height());
    var textHeight = parseInt($("#console_text").height());
    var offset = parseInt(windowHeight - textHeight);
    if (offset < 0) {
        $("#console_text").css('top',offset);
    } else {
        $("#console_text").css('top',0);
    }
}

// on console close, stop the typewriter
function haltTT() {
    tt_running = false;
    if (typeof(typed) != "undefined") {
        typed.destroy();
    }
    $("#console_text").css('top',0);
}

//////////////////////////////////////////////////////
// Tabular Viewer
//////////////////////////////////////////////////////

// button click to toggle the table viewer
$('#table').click(function(){
  if (tableBG.style.display == "block") {
      tableBG.style.display = "none";
      $('#table').html('Table');
  } else {
      tableBG.style.display = "block";
      $('#table').html('Hide Table');
  }
});


var ttable = new Tabulator("#table_window", {
    layout:"fitColumns", //fit columns to width of table (optional),
    rowFormatter: function(row) {
        var element = row.getElement();
        var data = row.getData();
        var rowTable, cell;
        var width = "400px";
        //clear current row data
        while(element.firstChild) element.removeChild(element.firstChild);
        rowTable = document.createElement("table")
        rowTable.style.width = (width - 18) + "px";
        rowTabletr = document.createElement("tr"); 
        
        
        ////////////////////
        // protect this from change to datatables
        var slug = data.Headline;
        if (slug == "") { slug =  data.Cmam;}
        var snt = data.Sent.replace("T", " at ")
        cell = "<td><div><strong>" + slug + "</strong></div>" + 
            "<div><small>" + data.Source + "&mdash;" + snt + "</small></div></td>";
        ////////////////////
        
        
        rowTabletr.innerHTML = cell;
        rowTable.appendChild(rowTabletr);
        element.append(rowTable);
    },
 	rowClick:function(e, row){ // display an alert when its row is clicked
        tableDisp.style.display = "block";
        consoleBG.style.display = "none";
        $('#texts').html('Printer');
        tableDisp.innerHTML = make_text(row.getData());
        $("#table_display").scrollTop(0);
 	},             
});

//load sample data into the table
function loadTable(alerts) {
    ttable.setData(alerts);
    ttable.redraw(true);
}

//////////////////////////////////////////////////////
// Realtime Map
//////////////////////////////////////////////////////

// set up the map
var centerLat, centerLon, defaultZoom;
var map = L.map('map',zoomDelta=0.1).setView([39.833, -98.583], 4.2);
if (localStorage.defaultBounds) {
    resetView();
}
var center;
var yellow_icon = L.icon({
    iconUrl: 'img/wea_icon.png',
    iconSize: [18,18],
    iconAnchor: [9,18],
    popupAnchor: [18,9]
});
var bounds = {};
var marker_to_polygon = {};

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: 'Map &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors | Wireless Emergency Alerts from PBS WARN @ KVIE, Sacramento\n'
}).addTo(map);

var markerGroup = L.layerGroup().addTo(map);
var polyGroup = L.layerGroup().addTo(map);


// try to retrieve  saved view parameters from LocalStorage
function resetView(evt) {
    try {
        mbdict = JSON.parse(localStorage.defaultBounds);
        var swLatLng = L.latLng([mbdict["_southWest"]["lat"],mbdict["_southWest"]["lng"]]);
        var neLatLng = L.latLng([mbdict["_northEast"]["lat"],mbdict["_northEast"]["lng"]]);
        mbounds = L.latLngBounds(swLatLng, neLatLng);
        map.fitBounds(mbounds);
    } catch {}
}

function setDefaultViewToCurrent(evt) {
    if (confirm("Set Default to Current View?")) {
        localStorage.defaultBounds = JSON.stringify(map.getBounds());
    }
}

// create a Leaflet LatLngBounds object from a CAP-format (lat,lon lat,lon) string
function make_bounds(polygon) {
    var new_poly = [];
    points = polygon.split(" ");
    for(var i = 0; i<points.length; i++)  {
        point = points[i];
        here = L.latLng(point.split(","));
        new_poly.push(here)
    }
    return L.polygon(new_poly).getBounds()
}

function plot(item) {
    var popup = make_text(item);
    tiptext = item["Cmam"];
    if (tiptext == '') {
        tiptext = item['Headline']
    }
    polygons = item["Polygons"];
    if (polygons.length > 0) {  // if there's no polygon by now, skip plotting
        for (var i = 0; i<polygons.length; i++) {
            plot_polygon(polygons[i], popup);
        }
        var label = item["ResponseType"];
        if (label == "") {
            label = "Alert";
        }
        if (item["Status"] == "Test") {
            label = "TEST"   
        }
        if (item["Status"] == "Exercise") {
            label = "EXERCISE"   
        }
        var myIcon = L.divIcon({className: 'my-div-icon', iconSize: null, html: label});
        var marker2 = L.marker( center, {icon: myIcon, className:"my-label"}).addTo(map).addTo(markerGroup);
        
        marker = L.marker(center, {icon: yellow_icon}).addTo(map).addTo(markerGroup); 
        var thisPoly = make_bounds(polygons[0]);
        marker_to_polygon[marker._leaflet_id] = thisPoly;
        marker.addEventListener("click", function(event) {
            var bnds = marker_to_polygon[event.target._leaflet_id];
            map.fitBounds(L.latLngBounds(bnds));
        })
        marker_to_polygon[marker2._leaflet_id] = thisPoly;
        marker2.addEventListener("click", function(event) {
            var bnds = marker_to_polygon[event.target._leaflet_id];
            map.fitBounds(L.latLngBounds(bnds));
        })
        marker.bindTooltip(tiptext);
    }
}

function center_of_polygons(polygons) {
    var totLat=0.0, totLon=0.0, count = 0;
    polygon = polygons[0];
    if (polygon.length > 2) {polygons = polygon}
    for (var i = 0; i<polygons.length; i++) {
        point = polygons[i];
        totLat = totLat + parseFloat(point[1]);
        totLon = totLon + parseFloat(point[0]);
        count++;
    }   
    cLat = cLat + (Math.random() - 0.5) * 0.01;
    cLon = cLon + (Math.random() - 0.5) * 0.01;
    return L.LatLng([cLat+LatRnd, cLon+LonRnd]);
}


function plot_polygon(polygon, popup) {
    new_polygon = []
    var lat, lon
    if (typeof(polygon) == "string") { // if polygon is a new-style string
        points = polygon.split(" ");
        for (var i=0;i<points.length;i++) {
            var point = points[i]
            splitp = point.split(",");
            lat = splitp[0];
            lon = splitp[1];
            point = [parseFloat(lat),parseFloat(lon)];
            new_polygon.push(point )
        };
    } else {
        points = polygon;
        for (var j = 0; j<points.length; j++) {
            lat = points[j][0]
            lon = points[j][1]
            new_polygon.push(L.latLng(lat, lon ))
        }
    }
    thisPoly = L.polygon(new_polygon, {
                            color:'#ffd700',
                            fillOpacity: 0.3
                        }).addTo(map).bindPopup(popup).addTo(polyGroup);
    try{
        center = thisPoly.getCenter();
    } catch(e) {
        center = center_of_polygons(thisPoly);
    }
    return thisPoly;
}

function bounds_of_polygons(polygons) {
    var polygon = polygons[0]
    thisPoly = L.polygon(polygon);
    return thisPoly.getBounds();
}

function clearMap() {
    markerGroup.clearLayers();
    polyGroup.clearLayers();
}

// Get the current alerts in JSON from server
function poll() {
    try {
    $.ajax({
      url: "http://warn.pbs.org/alerts.json",
      data: "",
      success: success,
      error: success,
      error: success,
      dataType: "text/XML"
    });
    } catch(e) {
        console.log("server poll failed: " + e);
    }
}

function success(data) {
    clearMap();
    try {
        j = JSON.parse(data.responseText);
    } catch {
        return;
    }
    $('#hb').html("Link up " + moment(j.heartbeat).format("YYYY-MM-DD HH:mm:ss") + " UTC");
    alerts = j.alerts;
    loadTable(alerts);
    var i=0, item;
    while(item = alerts[i++]) {
        var exp = moment(item['Expires'], "YYYY-MM-DD HH:mm:ss").utc();
        var now = moment().utc();
        // only plot if not expired
        if (now < exp) {
            plot(item)
        }
    }
}

$(window).bind('focus', function() {
    poll();
});


$(document).ready(function () {
    poll();
    setInterval(poll, 10000);
});

