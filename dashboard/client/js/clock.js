const DateTime = luxon.DateTime

var clock = document.getElementById("clockdigits")
var update = document.getElementById("updatedigits")

clock.innerText = getClockTime()
setInterval(showClockTime, 250)

updated()

function isoToMillis(iso) {
    x = DateTime.fromISO(iso)
    return x.toMillis()
}

function getClockTime() {
    now = DateTime.local()
    clockstamp = now.toFormat('HH:mm:ss ZZZZ')
    return clockstamp
}

function showClockTime() {
    clock.innerText = getClockTime()
}

function updated() {
    update.innerText = "last update: " + DateTime.local().toFormat('HH:mm:ss - dd LLL yyyy')
}
