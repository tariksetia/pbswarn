// 5/12/2019

var alertObj
var alertsObj = []
var infosObj = []
var extAlerts = []

var updateTimer
var uptimeTimer 
var clockTimer
var stopCats
var DateTime = luxon.DateTime

// on document ready, start the time, uptime and update timers
$(document).ready(function () {
  window.addEventListener("focus", function() {
      updateDisplay(alertsObj)
  })
  // hide the Info Viewer 
  $("#infoViewer").hide()
  $("#infoDisplay").empty()
  $("#rawViewer").hide()
  $("#rawDisplay").empty()
  // now start the timer intervals
  clockTimer = setInterval(showTime, 200)
  uptimeTimer  = setInterval(showUptime, 7000)
  updateTimer = setInterval(update, 5000)
  update()
})

// get current alerts, sort, annotate each with corresponding infos, and update the display
async function update() {
  alertsObj = await getAlerts()
  alertsObj = await attachInfos(alertsObj)
  alertsObj = await filterAlerts(alertsObj)
  updateDisplay()
}

// filter out expireds if user chooses, and block infos in user de-selected categories
function filterAlerts(alertsObj) {
  var filteredObj = []
  // read expired checkbox
  var showExpired = $("#ExpiredCB").prop('checked')
  // get category-block vector
  var stops = getStopCategories()
  for (var key in alertsObj) {
    var ok = true
    var alert = alertsObj[key]
    // skip any alert that's been updated or cancelled
    if (alert.replacedBy != "") {
      ok = false
    }
    // if box not checked, skip expired alerts
    if (!showExpired && isExpired(alert)) {
      ok = false
    }
    // if all infos have a blocked category, filter out that alert
    var allInfosBlocked = true
    for (var key in alert["infos"]) {
      var info = alert.infos[key]
      if (stops.indexOf(info.categories) == -1) {
        allInfosBlocked = false
      }
    }
    if (allInfosBlocked) {
      ok = false
    }
    if (ok) {
      filteredObj.push(alert)
    }
  }
  return filteredObj
}

// push alerts into the display
function updateDisplay() {
  //console.log("updateDisplay")
  var cellPointer = 0
  $display = $("#masterDiv")
  $display.empty()
  for (var key in alertsObj) {
    var alert = alertsObj[key]
    replaceCell(alert, cellPointer)
    cellPointer++
  }
  // and blank from end of list to end of display
  while (cellPointer < $("#masterDiv")[0].len) {
    blankCell(cellPointer)
    cellPointer++
  }
}

// swap content into a selected cell (div) in the display
function replaceCell(alert, cellPointer) {
  //console.log("replaceCell", alert.alertID, cellPointer)
  $display = $("#masterDiv")
  newDiv = alertToCellHTML(alert)
  $display.append($(newDiv))
  //console.log("cell appended", $display.length)
}

// blank out an unused cell
function blankCell(cellPointer) {
  // get a reference to pointed-at cell
  var $cellDiv = $$display.children[cellPointer]
  $cellDiv.replaceWith($("<div></div>"))
}
