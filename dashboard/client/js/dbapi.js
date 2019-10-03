// var DBalerts comes from db-loader.js for now

var warn
var db

// On Load
document.addEventListener("DOMContentLoaded", function() {
  initDB()
})

async function initDB() {
    db = new Dexie("AlertsDatabase")
    db.version(1).stores({ alerts: "++id,sent,expires,replaced" })
    db.open();
    // the rest are tests
    console.log(await clearAll())
    console.log(await addItems(DBalerts))
    console.log(await getAll())
    console.log(await getItemsCount())
    getClockTime()
}

async function getAll() {
    all = await db.alerts.toArray()
    return all
}

async function clearAll() {
    await db.alerts.clear()
    return "table cleared"
}

async function getItemsCount() {
    var foo = await db.alerts.count()
    return foo
}

function addItem(item) {
    sentMillis = DateTime.fromISO(item.sent).toMillis()
    expiresMillis = DateTime.fromISO(item.expires).toMillis()
    replacedMillis = DateTime.fromISO(item.replaced).toMillis()
    db.alerts.add({
      sent: sentMillis,
      expires: expiresMillis,
      replaced: replacedMillis,
      item: item
    });
  return "item added"
}

function addItems(items) {
  db.alerts.bulkAdd(items)
  /*db.transaction("rw", db.alerts, function() {       // transaction wrapper for in case loads start failing
    db.alerts.bulkAdd(items)
  }).catch(function(error) {
      console.log(error)
  });*/
  return "array loaded"
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