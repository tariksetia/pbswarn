$(document).ready(function () {
  getAlerts()
  setInterval(update, 3000)
})

var alertObj
var alertsObj
var extAlerts = []
var DateTime = luxon.DateTime

$("#ExpiredCB").on('change', function () {
  clearDisplay()
  updateDisplay()
  $("#ExpiredCB").trigger('blur')
})

function setLocalTimeZone(name) {
  DateTime.local().setZone(name)
}

function getLocalTimeZone() {
  return DateTime.local().zoneName
}

function clearDisplay() {
  $("#masterDiv").empty()
}

async function update() {
  await getAlerts()
}

// parce server data into global alertsObj, which is an array of alertObjs
async function getAlerts() {
  extAlerts = []
  $.ajax({
    url: "/getAlerts"
  }).then(function (data) {
    alertsObj = JSON.parse(data)
    addInfos()
  })
}

// to each alertObj add an [] of infoObjs
async function addInfos() {
  for (var key in alertsObj) {
    a = alertsObj[key].alertID
    getAlertReference(a)
    await annotateAlert(a)
  }
}

async function annotateAlert(id) {
  id = id.alertID // not sure why this is necessary
  var myAlert = getAlertReference(id)
  var url = "/getInfos/" + id
  $.ajax({
    url: url
  }).then(function (data) {
    //console.dir(id)
    infosObj = JSON.parse(data)
    if (infosObj.length > 0) {
      var alrt = getAlertReference(id)
      // add infos to this object
      alrt.infos = []
      alrt.infos.push(infosObj)
      alrt.expired = alertIsExpired(alrt)
      //console.log(alrt)
      // and compile into global extAlerts []
      extAlerts.push(alrt)
      updateDisplay()
    }
  })
}

function sortExtAlertsBySentTime() {
  return extAlerts.sort(function (a, b) {
    var x = DateTime.fromISO(a["sent"]); var y = DateTime.fromISO(b["sent"]);
    return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  })
}

// push a sorted array of alerts into the display
function updateDisplay() {
  //console.log("updateDisplay")
  var cellPointer = 0
  sortExtAlertsBySentTime()
  for (var key in extAlerts) {
    if (!$("#ExpiredCB").prop('checked')) {   // filter out expireds
      if (!extAlerts[key].expired) {
        replaceCell(extAlerts[key], cellPointer)
        cellPointer++
      }
    } else {                                  // display all
      replaceCell(extAlerts[key], cellPointer)
      cellPointer++
    }
  }
  // if we have more divs in masterDiv than needed, remove them
  if ($("#masterDiv")[0].len > cellPointer) {
    extAlerts = extAlerts.slice(0, cellPointer)
  }

}

function replaceCell(alert, cellPointer) {
  var sent = alert["sent"]
  var newDivHTML
  sent = DateTime.fromISO(sent).toFormat("HH':'mm':'ss - LL'/'dd'/'yyyy ZZZZ")
  if (alert.expired || alert.replacedBy != "") {
    newDivHTML = "<div class='alertDiv expired' id='alert" + alert["alertID"] + "'><table><tr>"
  } else {
    newDivHTML = "<div class='alertDiv' id='alert" + alert["alertID"] + "'><table><tr>"
  }
  newDivHTML = newDivHTML +
    "<td class='sent'>" + sent + "</td>" +
    "<td class='identifier'>" + alert["identifier"] + "</td>" +
    "<td class='sender'>" + alert["sender"] + "</td>" +
    "<td class='status'>" + alert["status"] + " " + alert["scope"] + " " + alert["message_type"] + "</td>" +
    "</tr></table></div>"
  $newDiv = $(newDivHTML)
  for (var key in alert.infos) {
    var n = alert.infos[key][0]
    var $infoDiv = $("<div class='infoDiv' id='info" + n["infoID"] + "'><table><tr>" +
      "<td class='urgency " + n["urgency"] + "'>" + n["urgency"] + "</td>" +
      "<td class='severity " + n["severity"] + "'>" + n["severity"] + "</td>" +
      "<td class='certainty " + n["certainty"] + "'>" + n["certainty"] + "</td>" +
      "<td class='slug'><a href='javascript:showInfo(" + n["infoID"] + ")'>" + n["slug"] + "</a></td>" +
      "<td class='senderName'>" + n["senderName"] + "</td>" +
      "</tr></table></div>")
    $newDiv.append($infoDiv)
  }
  // if we need another divs in masterDiv, make it
  if (!$("#masterDiv")[0].children[cellPointer]) {
    $("#masterDiv").append($("<div></div>"))
  }
  var $cellDiv = $("#masterDiv")[0].children[cellPointer]
  $cellDiv.replaceWith($newDiv[0])
}

function getAlertReference(id) {
  for (var key in alertsObj) {
    a = alertsObj[key]
    if (a.alertID == id) {
      return a
    }
  }
}

function alertIsExpired(alert) {
  var now = DateTime.fromISO()
  for (var key in alert["infos"]) {
    var info = alert.infos[key]
    var expires = DateTime.fromISO(info[0]["expires"])
    return expires.ts < now.ts
  }
  return true
}

function showInfo(infoID) {
  alert("Clicked on info " + infoID)
}

