/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 2.01 2/14/2019
 *
 *************************************************************/

//////////////////////////////////////////////////////
// Tabular (aka List) Viewer
//////////////////////////////////////////////////////

const hideList = () => {
    tableBG.style.display = "none"
    tableDisp.style.display = "none"
    $('#tableBtn').html('List')
    listing = false
    viewing = false
}

const showList = () => {
    if (typeof(alerts) != "undefined") {
        if (alerts.length > 0) {
            tableBG.style.display = "block"
            $('#tableBtn').html('Hide List')
            listing = true
        } else {
            tableBG.style.display = "none"
        }
    }
}

const itemVisible = () => {
    if (tableDisp.style.display = "block") {
        return true
    } else {
        return false
    }
}

// once we have data, set up the table
var dataTable;

const updateTable = () => {

    var table = document.getElementById("listTable")
    // get reference to table body element and empty it
    var tbody = document.getElementById('table_body')
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    // for each alert, add a row to the table
    if (!alerts) { return; }
    alerts.forEach(row => {
        if (row.Headline !=null && row.Headline.length > 0) {
            slug = row.Headline
        } else {
            slug = row.Cmam
        }
        if (typeof(slug) != 'undefined') {
            if (slug.length > 80) { slug = slug.substring(0,77) + "..." }
        }
        snt = row.Sent.replace("T", " at ");
        response = row.ResponseType;
        if (response == "") { response = "Alert"}
        severity = row.Severity
        if (severity == "") { severity="Unknown"}
        color = getColor(row)
        var cell = `<tr>
<td >
<div id="table_cell" class="${severity }">
    <div>
        <span class="response">${response}</span>
        <span class="headline">${slug} </span>
    </div>
    <div class="origin">From ${row.Source} on ${snt}</div>
</div>
</td>
</tr>`
        // add row to the table with click handler
        tbody.insertAdjacentHTML("beforeend", cell) 
        var thisRow = tbody.lastElementChild
        thisRow.addEventListener('click', function(event) {
            hideScroll()
            focusOn(row)
            viewAlert(row)
        })

    });

}

// get the severity-based color value for an alert
const getColor = item => {
    sev = item.Severity
    if (sev.includes("Extreme")) {
        return extreme
    } else if (sev.includes("Severe")) {
        return severe
    } else if (sev.includes("Moderate")) {
        return moderate
    } else if (sev.includes("Minor")) {
        return minor
    } else {
        return unknown
    }
}

const viewAlert = item => {
    // hide the Scroller
    hideScroll()
    clearMap()
    focusOn(item)
    plot(item)
    // and show the selected alert in the display space
    tableDisp.style.display = "block"
    $("#table_display").html(make_text(item))
    $("#table_display").css("background-color", getColor(item)+"99")
    viewing = true
}

const tableTextHide = () => {
    tableDisp.style.display = "none"
}
