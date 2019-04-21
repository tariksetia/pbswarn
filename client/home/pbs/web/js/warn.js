// 4/20/2019


$(document).ready(function () {
  window.addEventListener("focus", function() {
      updateDisplay(alertsObj)
  })
  hideInfoView()
  showTime()
  clockTimer = setInterval(showTime, 200)
  uptm = setInterval(showUptime, 7000)
  update()
  timer = setInterval(update, 3000)
})


async function update() {
  //console.log('[' + new Date().toUTCString() + '] ', "update")
  alertsObj = await getAlerts()
  alertsObj = await attachInfos(alertsObj)
  updateDisplay(alertsObj)
}

function showInfoView() {
  $("#infoViewer").show()
}

function hideInfoView() {
  $("#infoViewer").hide()
  $("#infoDisplay").empty()
}

// sort alerts and push into the display
function updateDisplay(alertsObj) {
  //console.log('[' + new Date().toUTCString() + '] ', "updateDisplay")
  var sorted = sortAlertsBySentTime()
  var cellPointer = 0
  for (var key in sorted) {
    var alert = sorted[key]
    // if the Expired checkbox is not checked, skip expired alerts
    if (!$("#ExpiredCB").prop('checked')) { 
      if (isExpired(alert)) {
        continue
      }
    }
    // determine if all infos pass filters
    var filterPass = false
    for (var key in alert["infos"]) {
      var info = alert.infos[key]
      if (getStopCats().indexOf(info.categories) == -1) {
        filterPass = true
      }
    }
    if (filterPass) {
      replaceCell(alert, cellPointer)
      cellPointer++
    }
    // if we have more divs in masterDiv than needed, remove them
    if ($("#masterDiv")[0].len > cellPointer) {
      $("#masterDiv")[0] = $("#masterDiv")[0].slice(0, cellPointer)
    }
  }
}


function replaceCell(alert, cellPointer) {
  topCats = getStopCats()
  // skip any alert that's been updated or cancelled
  if (alert.replacedBy != "") {
    return
  }
  var sent = DateTime.fromISO(alert.sent).toFormat("HH':'mm':'ss - LL'/'dd'/'yyyy ZZZZ")
  var newDivHTML
  // if alert is expired, mark the div as class expired
  if (isExpired(alert)) {
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
    // determine if info passes filters
    var n = alert.infos[key]
    if (getStopCats().indexOf(n.categories) > -1) {
      continue
    }
    var $infoDiv = $("<div class='infoDiv' id='info" + n["infoID"] + "'><table><tr>" +
      "<td class='urgency " + n["urgency"] + "'>" + n["urgency"] + "</td>" +
      "<td class='severity " + n["severity"] + "'>" + n["severity"] + "</td>" +
      "<td class='certainty " + n["certainty"] + "'>" + n["certainty"] + "</td>" +
      "<td class='slug'><a href='javascript:showInfo(" + n["infoID"] + ")'>" + n["slug"] + "</a></td>" +
      "<td class='senderName'>" + n["senderName"] + "</td>" +
      "</tr></table></div>")
    $newDiv.append($infoDiv)
  }
  //console.dir($newDiv)
  // if we need another divs in masterDiv, make it
  if (!$("#masterDiv")[0].children[cellPointer]) {
    $("#masterDiv").append($("<div></div>"))
  }
  var $cellDiv = $("#masterDiv")[0].children[cellPointer]
  $cellDiv.replaceWith($newDiv[0])
}
