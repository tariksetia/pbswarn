// 8/6/2019

var DateTime = luxon.DateTime
var displayZone

clockTimer = setInterval(showTime, 200)
uptimeTimer = setInterval(showUptime, 1000)

// at startup default to system timezone
tz = DateTime.local().zoneName
timeZone.value = tz

// after changing the timezone setting, deselect the selector
timeZone.onchange = function(){
  persist.setItem('timeZone', timeZone.options[timeZone.selectedIndex].value)
  timeZone.blur()
}

function showTime() {
  tz = timeZone.options[timeZone.selectedIndex].value  
  var now = DateTime.local()
  var clk = toDisplayZone(now).toFormat("HH':'mm':'ss ZZZZ")
  $("#clock").text(clk)
}

async function showUptime() {
  var uptimeStr = await getUptime()
  uptimeStr = uptimeStr.replace(" ", "T")
  var uptime = DateTime.fromISO(uptimeStr)
  displayZone = timeZone.options[timeZone.selectedIndex].value  
  var up = toDisplayZone(uptime).toFormat("HH:mm:ss LL/dd/yyyy ZZZZ")
  $("#uptimer").html("Last " + up + "&nbsp;")
  // how long ago was update?
  var now = DateTime.local()
  var age = uptime.diff(now, 'seconds').seconds * -1
  // if uptime was more than five minutes ago, color red
  if (age > 300) {
    $("#uptimer").css("background-color", "red") 
    $("#uptimer").css("color", "black") 
  // if more than ninty seconds ago, color goldenrod
  } else if (age > 90) {
    $("#uptimer").css("background-color", "yellow") 
    $("#uptimer").css("color", "black") 
  // else color text color
  } else {
    $("#uptimer").css("background-color", "#ffffff00")
    $("#uptimer").css("color", "#ffffff99")
  }
}

function toDisplayZone(datetime) {
  return datetime.setZone(displayZone)
}
