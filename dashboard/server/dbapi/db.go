package dbapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	cap "pbs.org/warn/cap"
)

type Resource struct{}

type Geocode struct {
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

type EventCode struct {
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

type Parameter struct {
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

type Item struct {
	Uuid         string      `json:"uuid"`
	Identifier   string      `json:"identifier"`
	ItemID       string      `json:"itemId"`
	Sent         string      `json:"sent"`
	Expires      string      `json:"expires"`
	Replaced     string      `json:"replaced"`
	Sender       string      `json:"sender"`
	SenderName   string      `json:"senderName"`
	Status       string      `json:"status"`
	Scope        string      `json:"scope"`
	MsgType      string      `json:"msgType"`
	Lang         string      `json:"lang"`
	Category     string      `json:"category"`
	Event        string      `json:"event"`
	EventCodes   []EventCode `json:"eventCodes"`
	Urgency      string      `json:"urgency"`
	Severity     string      `json:"severity"`
	Certainty    string      `json:"certainty"`
	Headline     string      `json:"headline"`
	CMAMtext     string      `json:"CMAMtext"`
	CMAMlongtext string      `json:"CMAMlongtext"`
	ResponseType string      `json:"responseType"`
	Parameters   []Parameter `json:"parameters"`
	Description  string      `json:"description"`
	Instruction  string      `json:"instruction"`
	Contact      string      `json:"contact"`
	Web          string      `json:"web"`
	References   string      `json:"references"`
	Resources    []Resource  `json:"resources"`
	ReplacedBy   []string    `json:"replacedBy"`
	AreaDescs    []string    `json:"areaDescs"`
	Polygons     []string    `json:"polygons"`
	Circles      []string    `json:"circles"`
	Geocodes     []Geocode   `json:"geocodes"`
}

var alert cap.Alert
var db *sql.DB
var err error

const dsn = "warn:warn@/warn"

func init() {
	if db, err = sql.Open("mysql", dsn); err != nil {
		fmt.Println("(db.init) sql.Open error", err.Error())
	}
}

// AddAlert - from a raw CAP alert, stores raw and JSON-formatted version in DB.  Updates and cancels are applied to Items.
//    Items with geocodes only are augmented with polygsons representing FIPS boundaries.  MQTT update to the receivers
//    should also occur here.
func AddAlert(raw string) string {

	// verify as CAP, else send heartbeat
	if strings.Index(raw, "urn:oasis:names:tc:emergency:cap:1.2") < 0 {
		// send heartbeat over MQTT

		return "Heartbeat"
	}
	// save raw XML to table CAP
	capResult := AddCAP(raw)
	var alert cap.Alert
	alert = cap.ParseCAP([]byte(raw))
	uuid := alert.Sender + "," + alert.Identifier + "," + alert.Sent
	sentMillis := getMillis(alert.Sent)
	if (alert.MessageType == "Cancel") || (alert.MessageType == "Update") {
		// look up all Items with references uuid,
		updateItems(alert.References, sentMillis, uuid)
	}
	if capResult == "ADD" {
		var infoCount = 0
		// for each XML Info
		for _, info := range alert.Infos {
			//fmt.Println(info)
			// map Info to Item
			it := new(Item)
			it.Uuid = uuid
			it.ItemID = strconv.Itoa(infoCount)
			it.Identifier = alert.Identifier
			it.Sender = alert.Sender
			it.Sent = alert.Sent
			it.Status = alert.Status
			it.Scope = alert.Scope
			it.MsgType = alert.MessageType
			it.References = alert.References
			it.Lang = info.Language
			it.Category = info.Category
			it.Event = info.Event
			it.ResponseType = info.ResponseType
			it.Urgency = info.Urgency
			it.Severity = info.Severity
			it.Certainty = info.Certainty
			it.Expires = info.Expires
			// Event Codes
			for _, ecode := range info.EventCodes {
				i := new(EventCode)
				i.ValueName = ecode.ValueName
				i.Value = ecode.Value
				it.EventCodes = append(it.EventCodes, *i)
			}
			it.SenderName = info.SenderName
			it.Headline = info.Headline
			it.Description = info.Description
			it.Instruction = info.Instruction
			it.Web = info.Web
			it.Contact = info.Contact
			// Parameters
			for _, param := range info.Parameters {
				p := new(Parameter)
				p.ValueName = param.ValueName
				p.Value = param.Value
				it.Parameters = append(it.Parameters, *p)
				if p.ValueName == "CMAMtext" {
					it.CMAMtext = p.Value
				}
				if p.ValueName == "CMAMlongtext" {
					it.CMAMlongtext = p.Value
				}
			}
			// Areas
			for _, area := range info.Areas {
				it.AreaDescs = append(it.AreaDescs, area.Description)
				for _, poly := range area.Polygons {
					it.Polygons = append(it.Polygons, poly)
				}
				for _, circle := range area.Circles {
					it.Circles = append(it.Circles, circle)
				}
				for _, geocode := range area.Geocodes {
					gc := new(Geocode)
					gc.ValueName = geocode.ValueName
					gc.Value = geocode.Value
					it.Geocodes = append(it.Geocodes, *gc)
				}
				// augment polygons from FIPS where no geometries provided
				if len(it.Polygons) == 0 && len(it.Circles) == 0 {
					for _, geo := range area.Geocodes {
						if geo.ValueName == "SAME" {
							newPolys := getFipsPolys(geo.Value)
							for _, p := range newPolys {
								p,_ = strconv.Unquote(p)
								it.Polygons = append(it.Polygons, p)
							}
						}
					}
				}
			}
			// store to Items db
			news, _ := json.MarshalIndent(it, "", "    ")
			// save Item to DB with index of Sent values as millis
			expiresMillis := getMillis(it.Expires)
			AddItem(uuid, strconv.Itoa(infoCount), sentMillis, expiresMillis, string(news))
			// also send Item to MQTT



			// and increment the Item ID number
			infoCount++
		}
	}
	response := capResult + " " + uuid
	return response
}


// AddItem inserts an Item record into the Items database
func AddItem(uuid string, itemCntr string, sentMillis string, expiresMillis string, item string) {
	// store to DB
	statement, err := db.Prepare("insert into Items (uuid, itemId, sentMillis, expiresMillis, item) values (?,?,?,?,?)")
	if err != nil {
		fmt.Println("(db.AddCAP) Prepare error:", err)
	}
	defer statement.Close()
	_, err = statement.Exec(uuid, itemCntr, sentMillis, expiresMillis, item)
	if err != nil {
		fmt.Println("(db.AddItem) Insert error:", err)
	}
}

// AddCAP adds a received CAP alert to the CAP db.  
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

func getMillis(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		fmt.Println("(db.AddCAP) error parsing", iso)
		return ""
	}
	return strconv.FormatInt(t.UnixNano()/int64(time.Millisecond), 10)
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

// GetItemsSince returns a JSON document containing all items with sent times after the supplied millis
func GetItemsSince(millis string) []byte {
	// for each returned item, parse JSON and append to results
	statement, err := db.Prepare("select item from Items where sentMillis>(?)")
	if err != nil {
		fmt.Println("(db.GetItemsSince) Prepare statement error:", err)
	}
	defer statement.Close()
	rows, err := statement.Query(millis)
	if err != nil {
		fmt.Println("(db.GetItemsSince) DB error:", err)
	}
	newerItems := []Item{}
	for rows.Next() {
		var item string
		var it = new(Item)
		rows.Scan(&item)
		json.Unmarshal([]byte(item), &it)
		newerItems = append(newerItems, *it)
	}
	result, _ := json.MarshalIndent(newerItems, "", "    ")
	return []byte(result)
}

func updateItems(uuid string, expiresMillis string, replacedBy string) {
	// update all with uuid, updating expiresMillis and replacedBy
	statement, err := db.Prepare("update warn.items set expiresMillis=?, replacedby=? where uuid=?") 
	if err != nil {
		fmt.Println("(db.updateItems) Prepare statement error:", err)
	}
	defer statement.Close()
	_, err = statement.Exec(uuid, expiresMillis, replacedBy)
	if err != nil {
		fmt.Println("(db.updateItems) DB error:", err)
	}
}



// GetCAP retrieves a single raw CAP alert by its CAP UUID
func GetCAP(uuid string) string {
	//fmt.Println("(db.GetCAP)", uuid)
	stmt := "select xml from CAP where uuid=" + "\""+uuid+"\""
	statement, err := db.Prepare(stmt)
	if err != nil {
		fmt.Println("(db.GetCAP) Prepare statement error:", err) 
	}
	defer statement.Close()
	row := statement.QueryRow()
	var xml string
	row.Scan(&xml)
	return xml
}



func getFipsPolys(same string) []string {
	statement, err := db.Prepare("select polygon from fips.fips where samecode=(?)")
	if err != nil {
		fmt.Println("(db.getFipsPolys) Prepare statement error:", err)
	}
	defer statement.Close()
	rows, err := statement.Query(same)
	if err != nil {
		fmt.Println("(db.getFipsPolys) DB error:", err)
	}
	addedPolys := []string{}
	for rows.Next() {
		var polygon string
		rows.Scan(&polygon)
		addedPolys = append(addedPolys, polygon)
	}
	return addedPolys
}
