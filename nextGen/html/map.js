/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.19 12/8/2018
 *
 *************************************************************/

// application globals
var alerts
var map

var scanning = true
var listing = true
var viewing = false

var consoleBG = document.getElementById('console_bg');
var consoleWindow = document.getElementById('console_window');
var consoleText = document.getElementById('console_text');
var tableBG = document.getElementById('table_window')
var tableDisp = document.getElementById('table_display')

const extreme = "#ff9999"
const severe = "#f2e765"
const moderate = "#88ffff"
const minor = "#99ff99"
const unknown = "#ffffff"

var plot 

String.prototype.replaceAll = function(search, replacement) {
    return String.prototype.replace(new RegExp(search, 'g'), replacement);
};

var markerGroup
var polyGroup

// set up the map
const initMap = () => {
    var centerLat, centerLon, defaultZoom
    map = L.map('map',zoomDelta=0.1).setView([39.833, -98.583], 4.2)
    if (localStorage.defaultBounds) resetView()
    var center
    // load colored pins for severity indication
    var extremeIcon = L.icon({
        iconUrl: 'img/extremeIcon.png',
        iconSize: [18,18],
        iconAnchor: [9,18],
        popupAnchor: [18,9]
    });
    var severeIcon = L.icon({
        iconUrl: 'img/severeIcon.png',
        iconSize: [18,18],
        iconAnchor: [9,18],
        popupAnchor: [18,9]
    });
    var moderateIcon = L.icon({
        iconUrl: 'img/moderateIcon.png',
        iconSize: [18,18],
        iconAnchor: [9,18],
        popupAnchor: [18,9]
    });
    var minorIcon = L.icon({
        iconUrl: 'img/minorIcon.png',
        iconSize: [18,18],
        iconAnchor: [9,18],
        popupAnchor: [18,9]
    });
    var unknownIcon = L.icon({
        iconUrl: 'img/unknownIcon.png',
        iconSize: [18,18],
        iconAnchor: [9,18],
        popupAnchor: [18,9]
    });

    // add the base map from OSM tile server
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: 'Map &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors | Wireless Emergency Alerts from PBS WARN @ KVIE, Sacramento\n'
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map)
    polyGroup = L.layerGroup().addTo(map)

    // plot an alert on the map
    plot = alert => {
        var popup = make_text(alert)
        tiptext = alert.Cmam
        if (tiptext == '') {
            tiptext = alert.Headline
        }
        polygons = alert["Polygons"]
        center = getCenterOf(alert)
        color = getColor(alert);
        if (polygons.length > 0) {  // if there's no polygon by now, skip plotting
            for (var i = 0; i<polygons.length; i++) {
                reformat_polygon(polygons[i], color, alert)
            }
            var label = alert["ResponseType"]
            if (label == "") { abel = "Alert"  }
            if (alert.Status == "Test") { label = "TEST" }
            if (alert.Status == "Exercise") { label = "EXERCISE" }
            // style icon and label per alert severity
            sev = alert.Severity
            iClass = "alertIconUnknown"
            icon = "unknownIcon"
            if (sev.includes("Extreme")) { iClass = "alertIconExtreme"; icon = extremeIcon }
            if (sev.includes("Severe")) { iClass = "alertIconSevere"; icon = severeIcon}
            if (sev.includes("Moderate")) {iClass = "alertIconModerate"; icon = moderateIcon}
            if (sev.includes("Minor")) {iClass = "alertIconMinor"; icon = minorIcon}
            var myIcon = L.divIcon({className: iClass, iconSize: null, html: label})
            var label = L.marker( center, {icon: myIcon}).addTo(map).addTo(markerGroup)
            marker = L.marker(center, {icon: icon}).addTo(map).addTo(markerGroup)
            marker.addEventListener("click", function(event) {
                viewAlert(alert)
                focusOn(alert)
            })
            label.addEventListener("click", function(event) {
                viewAlert(alert)
                focusOn(alert)
            })
            marker.bindTooltip(tiptext);
        }
    }
}

// get center point of supplied alert
const getCenterOf = item => {
    var bounds = L.make_bounds(item.Polygons[0])
    for (var i=1;i<item.Polygons.length; i++) {
        bounds.extend( L.make_bounds(item.Polygons[i]) )
    }
   return L.LatLng([bounds.centerLat, bounds.centerLon])
}

// translate CAP polygon to Leaflet polygon object
const reformat_polygon = (polygon, color, alert) => {
    new_polygon = []
    var lat, lon
    if (typeof(polygon) == "string") { // if polygon is a new-style string
        points = polygon.split(" ")
        for (var i=0;i<points.length;i++) {
            var point = points[i]
            splitp = point.split(",")
            lat = splitp[0]
            lon = splitp[1]
            point = [parseFloat(lat),parseFloat(lon)]
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
                            color: color,
                            fillOpacity: 0.4,
                            opacity: 0.8,
                        }).addTo(map).addTo(polyGroup);
    thisPoly.on("click", function(event) { viewAlert(alert); })
    center = thisPoly.getCenter()  // coordinates for icon
    return thisPoly
}

// create a Leaflet LatLngBounds object from a CAP-format (lat,lon lat,lon...) polygon string
const getBounds = polygon => {
    var new_poly = []
    points = polygon.split(" ")
    for(var i = 0; i<points.length; i++)  {
        point = points[i]
        here = L.latLng(point.split(","))
        new_poly.push(here)
    }
    return L.polygon(new_poly).getBounds()
}

// get aggregate bounds of all polys in an item
const itemBounds = item => {
    var bounds = getBounds(item.Polygons[0])
    for (var i=1;i<item.Polygons.length; i++) {
        bounds.extend( getBounds(item.Polygons[i]) )
    }
    return bounds
}

// get aggregate bounds of all items in alerts
const allBounds = alerts => {
    if (typeof(alerts) != 'undefined') {
        var abounds = itemBounds(alerts[0]);
        if (alerts.length > 1) {
            for (var i=1;i<alerts.length; i++) {
                abounds.extend(itemBounds(alerts[i]))
            }
        }
        return abounds
    } else {
        return null
    }
}

// zoom the map to feature the selected JSON alert
const focusOn = item => {
    if (typeof(item) != "undefined") {
        bounds = itemBounds(item)
        // if scanner or list text visible, shift the map to a better position on the screen
        if (scanning) {
            map.fitBounds(shiftBounds(bounds))
        } else {
            map.fitBounds(bounds.pad(0.3))
        }
    }
}

const shiftBounds = bounds => {
    // calculate new center point
    var centerLon = bounds.getWest()
    var originalWidth = Math.abs(bounds.getWest() - bounds.getEast())
    var originalHeight = Math.abs(bounds.getNorth() - bounds.getSouth())
    var centerLat = (bounds.getSouth() + bounds.getNorth()) / 2
    // calculate new SW corner
    var swLon = centerLon + (originalWidth * 1.1)
    var swLat = centerLat - (originalHeight * 0.55)
    // calculate new NE corner
    var neLon = centerLon - (originalWidth * 1.1)
    var neLat = centerLat + (originalHeight * 0.5)
    return L.latLngBounds(L.latLng(swLat, swLon), L.latLng(neLat, neLon))
}

// clear the map
const clearMap = () => {
    markerGroup.clearLayers()
    polyGroup.clearLayers()
}

const updateMap = () => {
    if (!scanning && !viewing) redrawMap()
}

const redrawMap = () => {
    clearMap()
    for (var i in alerts) {
        plot(alerts[i])
    }
}

// retrieve any saved viewport parameters from LocalStorage
const resetView = evt => {
    try {
        mbdict = JSON.parse(localStorage.defaultBounds)
        var swLatLng = L.latLng([mbdict["_southWest"]["lat"],mbdict["_southWest"]["lng"]])
        var neLatLng = L.latLng([mbdict["_northEast"]["lat"],mbdict["_northEast"]["lng"]])
        mbounds = L.latLngBounds(swLatLng, neLatLng)
        map.fitBounds(mbounds)
    } catch {}
}

// save current viewport parameters to LocalStorage
const setDefaultViewToCurrent = () => {
    $.confirm({
        title: '',
        backgroundDismiss: true,
        content: 'Save current map view as default?',
        boxWidth: '15%',
        useBootstrap: false,
        buttons: {
            Yes: function () {
                localStorage.defaultBounds = JSON.stringify(map.getBounds())
            },
            No: function () { },
        }
    });
}
