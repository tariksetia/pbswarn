/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.19 12/8/2018
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
var tableLoaded = false;
var dataTable;

const updateTable = () => {
    if (!tableLoaded) {  // if startup, init dataTable
        if ($(window).width() > 999) {
            showList()
        }
        tableLoaded = true;
        dataTable = $('#table').DataTable( {
            data: alerts,
            paging: false,
            info:false,
            fixedHeader: {
                header: false,
                footer: true
            },
            searching: false,
            order: [],
            columns: [
                { render: function (data, type, row) {
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
                        cell = `
<div class="${severity }">
    <div>
        <span class="response">${response}</span>
        <span class="headline">${slug} </span>
    </div>
    <div class="origin">From ${row.Source} on ${snt}</div>
</div>
`
                        return cell
                    }
                }
            ]
        });
        // set a click handler on this table row
        $('#table').on('click', 'tr', function () {
            var item = dataTable.row( this ).data()
            // zoom the map to (aggregate) bounds of the alert's polys
            if (typeof(typed) != "undefined") {
                focusOn(item)
                //polygons = item.Polygons
                viewAlert(item)
            }
        } );
    } else {  // existing dataTable, reload latest data
        dataTable.clear()
        dataTable.rows.add(alerts)
        dataTable.draw()
    }
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
