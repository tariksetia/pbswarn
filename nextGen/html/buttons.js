/**************************************************************
 *
 *  Copyright (c) 2018 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.19 12/8/2018
 *
 *************************************************************/

/////////////////////////////////////////////////////
// Control behaviors
//////////////////////////////////////////////////////

// "Default View" button
$('#reset_view').click(resetView)
reset_view.onmouseover = function(){
    reset_view.style.fontWeight = 'bold'
}
reset_view.onmouseout = function(){
    reset_view.style.fontWeight = 'normal'
}

// "Set Default" button
$('#set_default').click(setDefaultViewToCurrent)
set_default.onmouseover = function(){
    set_default.style.fontWeight = 'bold'
}
set_default.onmouseout = function(){
    set_default.style.fontWeight = 'normal'
}


// "Scanner" / "Scanner Off" button
scrollBtn.onmouseover = function(){
    scrollBtn.style.fontWeight = 'bold'; 
}
scrollBtn.onmouseout = function(){
    scrollBtn.style.fontWeight = 'normal';
}
$('#scrollBtn').click(function(){
    if (consoleBG.style.display == "block") {
        hideScroll()
    } else {
        consoleBG.style.display="block"
        showScroll()
        typeNextAlert()
    }
})


// "List" / "Hide List" button
tableBtn.onmouseover = function(){
    tableBtn.style.fontWeight = 'bold'; 
}
tableBtn.onmouseout = function(){
    tableBtn.style.fontWeight = 'normal';
}
$('#tableBtn').click(function(){
    if (tableBG.style.display == "block") {
        hideList()
    } else {
        showList()
    }
});

// "About This Map" button and display
$('#aboutBtn').click(function(){
    if (about_panel.style.display == "none" || about_panel.style.display == "") {
        about_panel.style.display = "block"
        $('#aboutBtn').html('Hide Map Info')
    } else {
        about_panel.style.display = "none"
        $('#aboutBtn').html('About This Map')
    }
});
aboutBtn.onmouseover = function(){
  aboutBtn.style.fontWeight = 'bold'; 
}
aboutBtn.onmouseout = function(){
  aboutBtn.style.fontWeight = 'normal';
}
