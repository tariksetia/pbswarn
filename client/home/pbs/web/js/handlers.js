// 5/12/2019

// Click on the Expired filter checkbox
$("#ExpiredCB").on('change', function () {
    clearInterval(updateTimer) // stop existing update timer
    update()
    updateTimer = setInterval(update, 6000) // launch new update timer
})
  
// Click on one of the filter category checkboxes
$(".filter").on('change', function (e) {
    clearInterval(updateTimer) // stop existing update timer
    update()
    updateTimer = setInterval(update, 3000) // launch new update timer
})

// Click on the X in the Info Viewer
$("#infoViewCloser").on('click', function () {
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
$("#rawViewCloser").on('click', function () {
    $("#rawViewer").hide()
    $("#rawDisplay").empty()
})
