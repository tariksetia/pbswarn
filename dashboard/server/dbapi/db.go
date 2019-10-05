package dbapi

import (
	"fmt"
	"time"
	"strconv"
	"strings"
	"database/sql"
	"encoding/json"

	_ "github.com/go-sql-driver/mysql"
	cap "pbs.org/warn/cap"
)

type Resource struct {}

type Geocode struct {
	valueName	string
	value		string
}

type EventCode struct {
	valueName	string
	value		string
}

type Parameter struct {
	valueName	string
	value		string
}

type Item struct {
	uuid         string
	identifier   string
	itemID       string
	info         string
	sent         string
	expires      string
	replaced     string
	sender       string
	senderName   string
	status       string
	scope        string
	msgType      string
	lang         string
	category     string
	event        string
	eventCodes   []EventCode
	urgency      string
	severity     string
	certainty    string
	headline     string
	CMAMText     string
	CMAMLongText string
	responseType string
	parameters   []Parameter
	description  string
	instruction  string
	contact      string
	web          string
	references   string
	resources    []Resource
	replacedBy   []string
	areaDesc     []string
	polygons     []string
	circles      []string
	geocodes     []Geocode
}

var alert cap.Alert
var db *sql.DB
var err error

const dsn = "warn:warn@/warn"

func init() {
	// change this to support Mariadb
	if db, err = sql.Open("mysql", dsn); err != nil {
		fmt.Println("(db.init) sql.Open error", err.Error())
	}
}

// AddAlert - from a raw CAP alert, stores raw and JSON-formatted version in DB
func AddAlert(raw string) string {

	// verify as CAP, else send heartbeat
	if ( strings.Index(raw, "urn:oasis:names:tc:emergency:cap:1.2") < 0) {
		return "Heartbeat"
	}
	// save raw XML to table CAP
	capResult := AddCAP(raw)
	var alert cap.Alert
	alert = cap.ParseCAP([]byte(raw))
	uuid := alert.Identifier + "," + alert.Sender + "," + alert.Sent

	if (alert.MessageType == "Cancel") || (alert.MessageType == "Update") {
		// get the references, for each, look up all Items, set their expired and replacedBy fields

	}
	var infoCount = 0
	// for each XML Info
	for _, info := range alert.Infos {
		//fmt.Println(info)
		// map Info to Item
		it := new(Item)
		it.uuid = uuid
		it.itemID = strconv.Itoa(infoCount)
		it.identifier = alert.Identifier
		it.sender = alert.Sender
		it.sent = alert.Sent
		it.status = alert.Status
		it.scope = alert.Scope
		it.msgType = alert.MessageType
		it.references = alert.References
		it.lang = info.Language
		it.category = info.Category
		it.event = info.Event
		it.responseType = info.ResponseType
		it.urgency = info.Urgency
		it.severity = info.Severity
		it.certainty = info.Certainty
		// Event Codes
		for _, ecode := range info.EventCodes {
			i := new(EventCode)
			i.valueName = ecode.ValueName
			i.value = ecode.Value
			it.eventCodes = append(it.eventCodes, *i)
		}
		it.senderName = info.SenderName
		it.headline = info.Headline
		it.description = info.Description
		it.instruction = info.Instruction
		it.web = info.Web
		it.contact = info.Contact
		// Parameters
		for _, param := range info.Parameters {
			p := new(Parameter)
			p.valueName = param.ValueName
			p.value = param.Value
			it.parameters = append(it.parameters, *p)
		}
		var geocodes []Geocode
		var polygons []string
		var circles []string
		var areaDescs []string
		// Areas
		for _, area := range info.Areas {
			areaDescs = append(areaDescs, " | " + area.Description)
			for _, poly := range area.Polygons {
				polygons = append(polygons, poly)
			}
			for _, circle := range area.Circles {
				circles = append(circles, circle)
			}
			for _, geocode := range area.Geocodes {
				gc := new(Geocode)
				gc.valueName = geocode.ValueName
				gc.value = geocode.Value
				geocodes = append(geocodes, *gc)
			}
		}

		// save Item to DB with index of Sent values as millis
		sentMillis := getMillis(it.sent)
		expiredMillis := getMillis(it.expires)
		newItem, _ := json.Marshal(it)
		AddItem(uuid, strconv.Itoa(infoCount), sentMillis, expiredMillis, string(newItem))
		//fmt.Println(it)

		// also send Item to MQTT


		// and increment the Item ID number
		infoCount++

	}
	response := capResult + ": " + uuid
	return response
}

func AddItem(uuid string, itemCntr string, sentMillis string, expiresMillis string, item string) {
	// store to DB
	statement, err := db.Prepare("insert into Items (uuid, itemCntr, sentMillis, expiresMillis, item) values (?,?,?,?,?)")
	if err != nil {
		fmt.Println("(db.AddCAP) Prepare error:", err)
	}
	defer statement.Close()
	_, err = statement.Exec(uuid, itemCntr, sentMillis, expiresMillis, item)
	if err != nil {
		fmt.Println("(db.AddCAP) Insert error:", err)
	}
}

func AddCAP(raw string) string {
	// parse raw XML
	var alert cap.Alert
	alert = cap.ParseCAP([]byte(raw))
	// construct indices
	uuid := alert.Identifier + "," + alert.Sender + "," + alert.Sent
	sentMillis := getMillis(alert.Sent)
	expiredMillis := getLastExpireMillis(alert)
	// store to DB
	statement, err := db.Prepare("insert into CAP (uuid, sentMillis, expiredMillis, xml) values (?,?,?,?)")
	if err != nil {
		fmt.Println("(db.AddCAP) Prepare statement error:", err)
	}
	defer statement.Close()
	_, err = statement.Exec(uuid, sentMillis, expiredMillis, raw)
	if err != nil {
		fmt.Println("(db.AddCAP) Dup:", uuid)
		return "DUP"
	} else {
		fmt.Println("(db.AddCAP) Add:", uuid)
		return "ADD"
	}
}

func parseISO(iso string) time.Time {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		fmt.Println("(db.parseISO) error parsing time from:", iso)
	}
	return t
}

func getLastExpireMillis(alrt cap.Alert) string {
	// for each info, get expiration, return latest
	var latest = ""
	infos := alrt.Infos
	for _, info := range infos {
		expires := info.Expires
		thisExpires := getMillis(expires)
		if thisExpires > latest {
			latest = thisExpires
		}
	}
	return latest
}

func getMillis(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		fmt.Println("(db.AddCAP) error parsing sent from", iso)
		return ""
	}
	return strconv.FormatInt(t.UnixNano()/int64(time.Millisecond), 10)
}

func GetItemsSince(millis string) string {
	fmt.Println("(db.GetItemsSince) " + millis)


	return ""
}

func GetCAP(uuid string) string {
	fmt.Println("(db.GetCAP) " + uuid)


	return ""
}

func getFipsPolys(fips string) []string {


	
	return []string{}
}
