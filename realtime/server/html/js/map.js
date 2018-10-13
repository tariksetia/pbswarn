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
var tableBG = document.getElementById('table_window');
var tableDisp = document.getElementById('table_display');

// button click to show/hide the console
$('#scrollBtn').click(function(){
  if (consoleBG.style.display == "block") {
      consoleBG.style.display = "none";
      $('#scrollBtn').html('Scroll');
      haltTT();
  } else {
      consoleBG.style.display = "block";
      tableDisp.style.display = "none";
      $('#scrollBtn').html('Hide Scroll');
      runTT(); 
  }
});

// format the alert contents for the console display
function make_text(item) {
    var sent = item["Sent"];
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
        text = text + '<h4>' + item["Headline"] + '</h4>';
    } else {
        text = text + '<h4>' + item["Cmam"] + '</h4>';
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

function isCurrent(item) {
    expString = item.Expires;
    exp = new Date(expString);
    zExp = new Date(exp.toISOString()).toISOString();
    now = new Date(new Date().toUTCString().substr(0, 25));
    if (now > zExp) {
        return false;
    } else {
        return true;
    }
}

// type the next message in sliding div id="console_text"
function runTT() {
    if (alerts.length > 0) {
        messagePointer++;
        if (messagePointer == alerts.length) {
             messagePointer = 0;
        }
        typeAlert(messagePointer);
    } else {
        console.log(alerts);
        $("#msgId").html("No Alerts");
    }
}

function typeAlert(messagePointer) {  // launches runTT again when complete
    if (typeof(typed) != "undefined") {
        typed.destroy();
    }
    consoleText.textContent = "";
    $("#msgId").html("Alert " + (messagePointer + 1) + " of " + alerts.length);
    typed = new Typed(consoleText, {
        strings: [make_text(alerts[messagePointer])],
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
                runTT();
            },
            2000);
        }
    });
}

// interval-driven function to scroll up text as needed
var youInterval = setInterval(scrollUp, 200);
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
$('#tableBtn').click(function(){
    if (tableBG.style.display == "block") {
        tableBG.style.display = "none";
        tableDisp.style.display = "none";
        $('#tableBtn').html('List');
    } else {
        tableBG.style.display = "block";
        $('#tableBtn').html('Hide List');
    }
});

// once we have data, set up the table
var tableLoaded = false;
var dataTable;
function updateTable() {
    fakeAlerts = [
        {Headline:"Headline", Source: "Source", Sent:"Sent", Expires:"2019-12-31T23:59:00-00:00", Polygons:[]},
        {Headline:"Headline2", Source: "Source2", Sent:"Sent2", Expires:"2019-12-31T23:59:00-00:00", Polygons:[]},
        {Headline:"Headline3", Source: "Source3", Sent:"Sent3", Expires:"2019-12-31T23:59:00-00:00", Polygons:[]}
    ];
    //alerts = fakeAlerts; // test mode, comment out for normal operation
    
    if (!tableLoaded) {  // if startup, init dataTable
        tableLoaded = true;
        dataTable = $('#table').DataTable( {
            data: alerts,
            paging: false,
            info:false,
            fixedHeader: {
                header: false,
                footer: true
            },
            searching: false,
            order: [],
            columns: [
                {render: function (data, type, row) {
                            slug = row.Headline;
                            if (slug == "") { slug =  row.Cmam; }
                            if (slug.length > 80) {
                                slug = slug.substring(0,77) + "...";   
                            }
                            snt = row.Sent.replace("T", " at ");
                            cell = "<div><div><strong>" + slug + "</strong></div>" + 
                                    "<div><small>From " + row.Source + " on " + snt + 
                                    "</small></div></div>";
                            $(row).addClass("alertItem");
                            return cell
                        }
                }
            ]
        } );
        $('#table').on('click', 'tr', function () {
            var data = dataTable.row( this ).data();
            display( data);
        } );
    } else {  // existing dataTable, reload latest data
        dataTable.clear();
        dataTable.rows.add(alerts);
        dataTable.draw();
    }
}

function display(item) {
    // hide the Printer
    consoleBG.style.display = "none";
    $('#scrollBtn').html('Scroll');
    haltTT();
    // and show the selected alert
    tableDisp.style.display = "block";
    $("#table_display").html(make_text(item));
}

function tableTextHide() {
    tableDisp.style.display = "none";
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
    
//////////////////////////////////////////////////////
// Data Feed
//////////////////////////////////////////////////////
    
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
    
    // tell dataTable to update
    updateTable(); 

    var i=0, item;
    while(item = alerts[i++]) {
        if (isCurrent(item)) {  
            plot(item);
        } else {
            console.log("Skipping expired ", item.ID);
            console.log(item);
        } 
    }
}

$(window).bind('focus', function() {
    poll();
});

$(document).ready(function () {
    setInterval(poll, 10000);
    poll();
});

