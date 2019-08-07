// 8/6/2019

var ch = document.getElementById("ch")
var freq = document.getElementById("freq")
var sig = document.getElementById("sig")

// onchange in ch selector, web call to tuneRx() on server (response is trackRx() output)... and reset tune
ch.onchange = function(){
    var setFreq = ch.options[ch.selectedIndex].value    
    tuneRX(setFreq)
    persist.setItem("freq", setFreq )
    ch.blur()
}

// function to call tuneRX() on service
async function tuneRX(freq) {
    const result = await $.ajax({
        url: "/tuneRX/"+freq
    }).then(RXstatus)
}

async function RXstatus(data) {
    const status = await $.ajax({
        url: "/RXstatus"
    })
    dataArray = status.split(" ")
    frq = dataArray[0].split(":")[1].replace("000000", "")
    ss = dataArray[2].split("=")[1]
    freq.value = " " + frq
    sig.value = " " + ss
}

$( document ).ready(async function() {
    refreshRX()
    clockTimer = setInterval(refreshRX, 3000)
})

async function refreshRX() {
    var data = await $.ajax({
        url: "/RXstatus"
    })
    dataArray = data.split(" ")
    frq = dataArray[0].split(":")[1].replace("000000", "")
    ss = dataArray[2].split("=")[1]
    ch.value = frq
    $("#freq").html("&nbsp;&nbsp;&nbsp;" + frq)
    $("#sig").html("&nbsp;&nbsp;" + ss) 
}
