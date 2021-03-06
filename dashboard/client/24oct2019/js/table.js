var listDiv = document.getElementById("listDiv");
var expiredBtn = document.getElementById("expiredBtn")
var catBtns = document.getElementsByClassName("filterBox")
var blockCatString = ""

async function refreshTable() {

    // prepare table as HTML
    var newHtml = ""
    await db.alerts.orderBy('sent').reverse().each( item => {
        slug = item.headline
        if (slug == "") slug = item.CMAMtext
        var uuid = item.uuid
        var urgency = `<b><span class="${item.urgency}">${item.urgency}</span></b>`
        var severity = `<b><span class="${item.severity}">${item.severity}</span></b>`
        var certainty = `<b><span class="${item.certainty}">${item.certainty}</span></b>`
        var newItem = ""
        // if expired items aren't to be displayed, skip them
        if (isExpired(item) && ! expiredBtn.checked) { 
            return 
        }
        // if items from a blocked category aren't to be displayed, skip them
        if (blockCatString.includes(item.category)) {
            return
        }
        // if item is expired or otherwise overtaken, set table class of 'expired'
        if ( isExpired(item) || item.replacedBy != null || item.replacedBy == "") {
            newItem = `<div id='${uuid} ${item.itemId}' class="itemDiv" )'><table id='table${uuid} ${item.itemId}' class='listTable expired' onclick='javascript:display("${item.uuid} ${item.itemId}")'>`
          } else {
            newItem = `<div id='${uuid}' class="itemDiv" '><table id='table${uuid} ${item.itemId}' class='listTable' onclick='javascript:display("${item.uuid} ${item.itemId}")'>`
        }

        newItem = newItem + `
<tr>
    <td width='120px'>${formatMillis(item.sent)}</td>
    <td width='175px'>${item.identifier}</td>
    <td width='150px'>${item.sender}</td>
    <td width='120px'>${item.status}&nbsp${item.scope}&nbsp${item.msgType}&nbsp;-&nbsp;${item.category}</td>
</tr>
<tr>
<td>${urgency}<br>${severity}<br>${certainty}</td>`

        if (item.msgType === "Cancel") {
            newItem = newItem + `<td colspan = "2" > <div class="slug" >CANCEL: ${slug}</div></td >`
        } else if (item.msgType === "Update:"){
            newItem = newItem + `<td colspan = "2" > <div class="slug" >UPDATE: {slug}</div></td >`
        } else {
            newItem = newItem + `<td colspan = "2" > <div class="slug" >${slug}</div></td >`
        }
        newItem = newItem + `<td>${item.senderName}</td>
</tr>`.trim()

        newHtml = newHtml + newItem 
    })
    listDiv.innerHTML = newHtml + "</table></div>"
    //console.log(newHtml)
}

function formatMillis(millis) {
    let m = parseInt(millis)
    let s = DateTime.fromMillis(m)
    let dt = s.toFormat('HH:mm:ss LL/dd/yyyy ZZZZ')
    return dt
}

function isExpired(item) {
    now = DateTime.local()
    then = item.expires
    return now > then
}

// retrieve item from db based on extended uuid (from a list item link)
async function display(uuidx) {
    uuid = uuidx.split(" ")[0]
    itemId = uuidx.split(" ")[1]
    console.log("Displaying", uuid, itemId)
    it = await getItem(uuidx)
    if (it === null) {
        resetMap()
    } else {
        // push to View
        //viewRaw(it)  // from view.js
        viewItem(it)  // from view.js
        if (isExpired(it)) {
            plotExpired(it) // from map.js
        } else {
            plotAll()  // from map.js
        }
        focusItem(it)  // from map.js
        lightItem(uuidx)
    }
}



// highlight the selected item in list
function lightItem(uuidx) {
    let uuid = uuidx.split(" ")[0]
    let itemId = uuidx.split(" ")[1]
    // turn off all buttons
    blankItems()
    // now light the current one
    it = document.getElementById("table"+uuidx);
    if ( it != null ) {
        it.style.backgroundColor = "rgba(127,127,127,0.4)"
    }
}

function blankItems() {
    let itemTables = document.getElementsByClassName("listTable")
    for (let itemTable of itemTables) {
        itemTable.style.backgroundColor = "transparent";
    }
}



/*  FROM HERE DOWN MAY WANT TO GO TO A NEW PANEL.JS */

// click handler for exipired view filter
expiredBtn.onclick = function () {
    expiredBtn.blur()
    refreshTable()
}

// initially set up onclick behaviors for catalog filter checkboxes
for (let box of catBtns) {
    box.onclick = function(e) {
        e.target.blur()
        blockCatString = scanCatFilters() 
        refreshTable()
    }
}

// retrieve the current category filter stop list
function scanCatFilters() {
    let stops = ""
    for (let box of catBtns) {
        //console.log(box)
        if (!box.checked) {
            stops = stops + " " + box.name
        }
    }
    return stops
}

scanCatFilters() 

// listener for the "Reset Map" button
document.getElementById("resetBtn").onclick = function () {
    console.log("resetBtn")
    resetMap() // map.js
    blankItems() 
}   


// listener for the "Latest" button
document.getElementById("latestBtn").onclick = async function () {
    console.log("latest");
    let last = await db.alerts.orderBy('sent').last()
    display(last.uuid + " " + last.itemId)
}   