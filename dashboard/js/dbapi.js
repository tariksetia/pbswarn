var DBuuid =
  "NWS-IDP-PROD-3835806-3276838,w-nws.webmaster@noaa.gov,2019-09-25T14:19:00-07:00/0"


var warn
var db

// On Load
document.addEventListener("DOMContentLoaded", function() {
  initDB()
})

async function initDB() {
    db = new Dexie("AlertsDatabase")
    db.version(1).stores({ alerts: "++id,uuid,sent,expires,replaced" })
    db.open();
    // the rest are tests
    var item = DBalerts[0];  // from db-loader.js
    console.log(await clearAll())
    console.log(await putItem(item))
    console.log(await getAll())
    //console.log(await getOne(DBuuid)) // problem with this
    console.log(await getItemsCount())
}

async function getAll() {
    foo = await db.alerts.toArray()
    return foo
}

async function clearAll() {
    await db.alerts.clear()
    return "table cleared"
}



async function getDuring(start, end) {

}


async function getItemsCount() {
    var foo = await db.alerts.count()
    return foo
}

function putItem(item) {
  db.transaction("rw", db.alerts, function() {
    db.alerts.add({
      uuid: item.uuid,
      sent: item.sent,
      expires: item.expires,
      replaced: item.replaced,
      item: item
    });
  }).catch(function(error) {
    console.log(error)
  });
  return "item added"
}


/*
 * This redmains a problem child, but it may not be necessary 
 *
async function getOne(uuid) {
    await db.alerts
        .where("uuid")
        .equals(uuid)
        //.toCollection()
        .first(function(item) {
           return(item)
        }
    );
}
*/