/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.5 5/12/2019
 *
 *************************************************************/

package dbapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	_ "github.com/mattn/go-sqlite3" // driver for sql
)

// DbAlert ...
type DbAlert struct {
	ID          string `json:"alertID"`
	Identifier  string `xml:"identifier" json:"identifier"`
	Sender      string `xml:"sender" json:"sender"`
	Sent        string `xml:"sent" json:"sent"`
	Status      string `xml:"status" json:"status"`
	MessageType string `xml:"msgType" json:"message_type"`
	Source      string `xml:"source" json:"source"`
	Scope       string `xml:"scope" json:"scope"`
	Restriction string `xml:"restriction" json:"restriction"`
	Addresses   string `xml:"addresses" json:"addresses"`
	Code        string `xml:"code" json:"codes"`
	Note        string `xml:"note" json:"note"`
	Refs        string `xml:"references" json:"references"`
	Incidents   string `xml:"incidents" json:"incidents"`
	ReplacedBy  string `json:"replacedBy"`
}

// DbInfo ...
type DbInfo struct {
	ID           string `json:"infoID"`
	AlertID      string `json:"alertID"`
	Language     string `json:"language"`
	Category     string `json:"categories"`
	Event        string `json:"event"`
	ResponseType string `json:"responseType"`
	Urgency      string `json:"urgency"`
	Severity     string `json:"severity"`
	Certainty    string `json:"certainty"`
	Expires      string `json:"expires"`
	SenderName   string `json:"senderName"`
	Slug         string `json:"slug"`
	Effective    string `json:"effective"`
	Onset        string `json:"onset"`
	Audience     string `json:"audience"`
	Headline     string `json:"headline"`
	CMAM         string `json:"cmam"`
	Description  string `xml:"description" json:"description"`
	Instruction  string `xml:"instruction" json:"instruction"`
	Contact      string `xml:"contact" json:"contact"`
	Web          string `xml:"web" json:"web"`
}

// DbParameter ...
type DbParameter struct {
	ID        string `json:"paramID"`
	InfoID    string `json:"infoID"`
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

// DbEventCode ...
type DbEventCode struct {
	ID        string `json:"eventCodeID"`
	InfoID    string `json:"infoID"`
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

// DbResource ...
type DbResource struct {
	ID          string `json:"resourceID"`
	InfoID      string `json:"infoID"`
	Description string `json:"description"`
	MimeType    string `json:"mime_type"`
	Size        string `json:"size"`
	URI         string `json:"uri"`
	Digest      string `json:"digest"`
	DerefURI    string `json:"deref_uri"`
}

// DbArea ...
type DbArea struct {
	ID       string `json:"areaID"`
	InfoID   string `json:"infoID"`
	AreaDesc string `json:"areaDesc"`
	Altitude string `json:"altitude"`
	Ceiling  string `json:"ceiling"`
}

// DbPolygon ...
type DbPolygon struct {
	ID      string `json:"polygonID"`
	AreaID  string `json:"areaID"`
	Polygon string `json:"polygon"`
}

// DbCircle ...
type DbCircle struct {
	ID     string `json:"circleID"`
	AreaID string `json:"areaID"`
	Circle string `json:"circle"`
}

// DbGeocode ...
type DbGeocode struct {
	ID        string `json:"geocodeID"`
	AreaID    string `json:"areaID"`
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

// DbCAP ...
type DbCAP struct {
	ID      string `json:"capID"`
	AlertID string `json:"alertID"`
	CAP     string `json:"cap"`
}

var db *sql.DB
var rows *sql.Rows
var err error

// GetUptime .. returns latest network activity time from DB
func GetUptime() string {
	var id string
	var lastActivity string
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from uptime where id='1'")
	check(err)
	row := statement.QueryRow()
	switch err := row.Scan(&id, &lastActivity); err {
	case sql.ErrNoRows:
		fmt.Println("No rows were returned!")
	case nil:

	default:
		panic(err)
	}
	return "{\"lastActivity\":\"" + lastActivity + "Z\"}"
}

// GetAlerts ... get alerts in batches of 12 from specified offset
func GetAlerts() string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from alerts order by id desc limit 100")
	check(err)
	rows, err := statement.Query()
	check(err)
	var alerts []DbAlert
	for rows.Next() {
		var alert DbAlert
		// grab nullable fields from DB
		var rest sql.NullString
		var addr sql.NullString
		var inc sql.NullString
		var replacedBy string
		err = rows.Scan(&alert.ID, &alert.Identifier, &alert.Sender, &alert.Sent, &alert.Status, &alert.MessageType, &alert.Source, &alert.Scope, &rest, &addr, &alert.Code, &alert.Note, &alert.Refs, &inc, &replacedBy)
		check(err)
		// insert nullable fields into Struct
		alert.Restriction = rest.String
		alert.Addresses = addr.String
		alert.Incidents = inc.String
		alerts = append(alerts, alert)
	}
	astring, err := json.MarshalIndent(alerts, "", "   ")
	check(err)
	return string(astring)
}

// GetInfos ... get infos for a specified alert
func GetInfos(alert string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from infos where alertId = ?")
	check(err)
	rows, err := statement.Query(alert)
	check(err)
	var infos []DbInfo
	for rows.Next() {
		var info DbInfo
		err = rows.Scan(&info.ID, &info.AlertID, &info.Language, &info.Category, &info.Event, &info.ResponseType, &info.Urgency, &info.Severity, &info.Certainty, &info.Expires, &info.SenderName, &info.Slug, &info.Effective, &info.Onset, &info.Audience, &info.Headline, &info.CMAM, &info.Description, &info.Instruction, &info.Contact, &info.Web)
		check(err)
		infos = append(infos, info)
	}
	istring, err := json.MarshalIndent(infos, "", "   ")
	check(err)
	return string(istring)
}

// GetAllInfos ... get infos for a specified alert and thereafter
func GetAllInfos(earliest string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from infos where alertID >= " + earliest)
	check(err)
	rows, err := statement.Query()
	check(err)
	var infos []DbInfo
	for rows.Next() {
		var info DbInfo
		err = rows.Scan(&info.ID, &info.AlertID, &info.Language, &info.Category, &info.Event, &info.ResponseType, &info.Urgency, &info.Severity, &info.Certainty, &info.Expires, &info.SenderName, &info.Slug, &info.Effective, &info.Onset, &info.Audience, &info.Headline, &info.CMAM, &info.Description, &info.Instruction, &info.Contact, &info.Web)
		check(err)
		infos = append(infos, info)
	}
	istring, err := json.MarshalIndent(infos, "", "   ")
	check(err)
	return string(istring)
}

//GetInfo ... get a single info by its local ID number
func GetInfo(info string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from infos where id = ?")
	check(err)
	rows, err := statement.Query(info)
	check(err)
	var infos []DbInfo
	for rows.Next() {
		var info DbInfo
		err = rows.Scan(&info.ID, &info.AlertID, &info.Language, &info.Category, &info.Event, &info.ResponseType, &info.Urgency, &info.Severity, &info.Certainty, &info.Expires, &info.SenderName, &info.Slug, &info.Effective, &info.Onset, &info.Audience, &info.Headline, &info.CMAM, &info.Description, &info.Instruction, &info.Contact, &info.Web)
		check(err)
		infos = append(infos, info)
	}
	istring, err := json.MarshalIndent(infos, "", "   ")
	check(err)
	return string(istring)
}

// GetParameters ... get parameters for a specified info
func GetParameters(info string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from parameters where infoId = ?")
	check(err)
	rows, err := statement.Query(info)
	check(err)
	var params []DbParameter
	for rows.Next() {
		var param DbParameter
		err = rows.Scan(&param.ID, &param.InfoID, &param.ValueName, &param.Value)
		check(err)
		params = append(params, param)
	}
	pstring, err := json.MarshalIndent(params, "", "   ")
	check(err)
	return string(pstring)
}

// GetEventCodes ... get eventCodes for specified info
func GetEventCodes(info string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from eventCodes where infoId = ?")
	check(err)
	rows, err := statement.Query(info)
	check(err)
	var eCodes []DbEventCode
	for rows.Next() {
		var eCode DbEventCode
		err = rows.Scan(&eCode.ID, &eCode.InfoID, &eCode.ValueName, &eCode.Value)
		check(err)
		eCodes = append(eCodes, eCode)
	}
	estring, err := json.MarshalIndent(eCodes, "", "   ")
	check(err)
	return string(estring)
}

// GetResources ... get resources for specified info
func GetResources(info string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from resources where infoId = ?")
	check(err)
	rows, err := statement.Query(info)
	check(err)
	var ress []DbResource
	for rows.Next() {
		var res DbResource
		err = rows.Scan(&res.ID, &res.InfoID, &res.Description, &res.MimeType, &res.Size, &res.URI, &res.Digest, &res.DerefURI)
		check(err)
		ress = append(ress, res)
	}
	rstring, err := json.MarshalIndent(ress, "", "   ")
	check(err)
	return string(rstring)
}

// GetAreas ... get areas for specified info
func GetAreas(info string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from areas where infoId = ?")
	check(err)
	rows, err := statement.Query(info)
	check(err)
	var areas []DbArea
	for rows.Next() {
		var area DbArea
		err = rows.Scan(&area.ID, &area.InfoID, &area.AreaDesc, &area.Altitude, &area.Ceiling)
		check(err)
		areas = append(areas, area)
	}
	rstring, err := json.MarshalIndent(areas, "", "   ")
	check(err)
	return string(rstring)
}

// GetPolygons ... get polygons for specified area
func GetPolygons(area string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from polygons where areaId = ?")
	check(err)
	rows, err := statement.Query(area)
	check(err)
	var polys []DbPolygon
	for rows.Next() {
		var poly DbPolygon
		err = rows.Scan(&poly.ID, &poly.AreaID, &poly.Polygon)
		check(err)
		polys = append(polys, poly)
	}
	pstring, err := json.MarshalIndent(polys, "", "   ")
	check(err)
	return string(pstring)
}

// GetCircles ... get circles for specified area
func GetCircles(area string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from circles where areaId = ?")
	check(err)
	rows, err := statement.Query(area)
	check(err)
	var circles []DbCircle
	for rows.Next() {
		var circle DbCircle
		err = rows.Scan(&circle.ID, &circle.AreaID, &circle.Circle)
		check(err)
		circles = append(circles, circle)
	}
	cstring, err := json.MarshalIndent(circles, "", "   ")
	check(err)
	return string(cstring)
}

// GetGeocodes ... get geocodes for specified area
func GetGeocodes(area string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from geocodes where areaId = ?")
	check(err)
	rows, err := statement.Query(area)
	check(err)
	var geocodes []DbGeocode
	for rows.Next() {
		var geocode DbGeocode
		err = rows.Scan(&geocode.ID, &geocode.AreaID, &geocode.ValueName, &geocode.Value)
		check(err)
		geocodes = append(geocodes, geocode)
	}
	gstring, err := json.MarshalIndent(geocodes, "", "   ")
	check(err)
	return string(gstring)
}

// GetCAP ... get CAP for specified alert
func GetCAP(alert string) string {
	db, err = sql.Open("sqlite3", "/home/pi/warn.db")
	check(err)
	defer db.Close()
	statement, err := db.Prepare("select * from CAP where alertId = ?")
	check(err)
	rows, err := statement.Query(alert)
	check(err)
	var caps []DbCAP
	for rows.Next() {
		var cap DbCAP
		err = rows.Scan(&cap.ID, &cap.AlertID, &cap.CAP)
		check(err)
		caps = append(caps, cap)
	}
	cstring, err := json.MarshalIndent(caps, "", "   ")
	check(err)
	// undo UTF64 escaping of "<" and ">" done by json.Marshal
	cs := strings.Replace(string(cstring), "\\u003e", ">", -1)
	cs = strings.Replace(cs, "\\u003c", "<", -1)
	return string(cs)
}

func check(err error) {
	if err != nil {
		log.Println(err)
	}
}
