package warndb

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"../cap"
	_ "github.com/mattn/go-sqlite3" // driver for sql
)

var db *sql.DB

// ToDB ...
func ToDB(alert cap.Alert, xml string) {
	var alertID int
	// test if duplicate
	statement := "select count(*) from alerts where identifier ='" + alert.Identifier + "' sender = '" + alert.Sender + "' and sent = '" + alert.Sent + "'"

	db, err := sql.Open("sqlite3", "/home/pbs/warn.db")
	if err != nil {
		log.Println("DB open err:", err)
	}
	defer db.Close()
	var cnt int
	_ = db.QueryRow(statement).Scan(&cnt)
	// if no existing match, post to database
	if cnt > 0 {
		log.Println("DUPLICATE:", alert.Identifier+","+alert.Sender+","+alert.Sent)
	} else {

		// add the Alert
		statement, err := db.Prepare("insert into alerts (identifier, sender, sent, status, msgType, source, code, note) values (?, ?, ?, ?, ?, ?, ?, ?)")
		res, err := statement.Exec(alert.Identifier, alert.Sender, alert.Sent, alert.Status, alert.MessageType, alert.Source, alert.Code, alert.Note)
		if err != nil {
			log.Println("Insert alert error:", err)
		} else {
			alertID, err := res.LastInsertId()
			if err != nil {
				log.Println(err)
			}
			fmt.Println("Added alert number", alertID)
		}
		// add the raw XML
		statement, err = db.Prepare("insert into CAP (alertId, xml) values (?,?)")
		if err != nil {
			log.Println(err)
		}
		defer statement.Close()
		_, err = statement.Exec(alertID, xml)
		if err != nil {
			log.Println("Insert CAP error:", err)
		}
		// add Infos
		var infoID int64
		for _, info := range alert.Infos {
			// extract CMAM value
			cmam := getCMAM(info)
			// derive slug value
			slug := ""
			if len(info.Headline) != 0 {
				slug = info.Headline
			}
			if len(slug) == 0 && len(getCMAM(info)) != 0 {
				slug = getCMAM(info)
			}
			if len(slug) == 0 && len(info.Event) != 0 {
				slug = info.Event
			}
			if len(slug) == 0 && len(info.ResponseType) != 0 {
				slug = info.ResponseType
			}
			if len(slug) == 0 {
				slug = "[No Headline]"
			}
			statement, err := db.Prepare("insert into infos (alertId, language, category, event, responseType, urgency, severity, certainty, expires, senderName, slug, effective, onset, audience, headline, cmam, description, instruction, contact, web) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
			if err != nil {
				log.Fatal(err)
			}
			defer statement.Close()
			res, err := statement.Exec(string(alertID), info.Language, info.Category, info.Event, info.ResponseType, info.Urgency, info.Severity, info.Certainty, info.Expires, info.SenderName, slug, info.Effective, info.Onset, info.Audience, info.Headline, cmam, info.Description, info.Instruction, info.Contact, info.Web)
			infoID, err = res.LastInsertId()
			if err != nil {
				log.Println("Insert info error", err)
			}
			fmt.Println("Added info number", infoID)

			// add Parameters
			var paramID int64
			for _, param := range info.Parameters {
				statement, err = db.Prepare("insert into parameters (infoId, valueName, value) values (?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				defer statement.Close()
				res, err := statement.Exec(string(infoID), param.ValueName, param.Value)
				paramID, err = res.LastInsertId()
				if err != nil {
					log.Println("Insert parameter error:", err)
				}
				fmt.Println("Added param number", paramID)
			}

			// add EventCodes
			var eventCodeID int64
			for _, ec := range info.EventCodes {
				statement, err = db.Prepare("insert into eventCodes (infoId, valueName, value) values (?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				res, err = statement.Exec(string(infoID), ec.ValueName, ec.Value)
				if err != nil {
					log.Fatal("Insert eventCode error:", err)
				} else {
					eventCodeID, err = res.LastInsertId()
					if err != nil {
						log.Println(err)
					}
					fmt.Println("Added eventCode number", eventCodeID)
				}
			}

			// add Resources
			var resourceID int64
			for _, resource := range info.Resources {
				statement, err = db.Prepare("insert into resources (infoId, description, mimeType, size, uri, derefUri, digest) values (?, ?, ?, ?, ?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				res, err = statement.Exec(string(infoID), resource.Description, resource.MimeType, string(resource.Size), resource.URI, resource.Digest, resource.DerefURI)
				if err != nil {
					log.Println("Insert resource error:", err)
				} else {
					resourceID, err = res.LastInsertId()
					if err != nil {
						log.Println(err)
					}
					fmt.Println("Added resource number", resourceID)
				}
			}

			// add Areas
			var areaID int64
			for _, area := range info.Areas {
				statement, err = db.Prepare("insert into areas (infoId, areaDesc, altitude, ceiling) values (?, ?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				res, err = statement.Exec(string(infoID), area.Description, area.Altitude, area.Ceiling)
				if err != nil {
					log.Println("Insert area error:", err)
				} else {
					areaID, err = res.LastInsertId()
					if err != nil {
						log.Println(err)
					}
					fmt.Println("Added area number", areaID)
				}

				// add Geocodes
				var geocodeID int64
				for _, param := range area.Geocodes {
					statement, err = db.Prepare("insert into geocodes (areaId, valueName, value) values (?, ?, ?)")
					if err != nil {
						log.Println(err)
					}
					res, err = statement.Exec(string(areaID), param.ValueName, param.Value)
					if err != nil {
						log.Println("Insert geocode error:", err)
					} else {
						geocodeID, err = res.LastInsertId()
						if err != nil {
							log.Println(err)
						}
						fmt.Println("Added geocode number", geocodeID)
					}
				}

				// add Polygons
				var polygonID int64
				for _, polygon := range area.Polygons {
					statement, err = db.Prepare("insert into polygons (areaId, polygon) values  (?, ?)")
					if err != nil {
						log.Println(err)
					}
					res, err = statement.Exec(string(areaID), polygon)
					if err != nil {
						log.Println("Insert polygon error:", err)
					} else {
						polygonID, err = res.LastInsertId()
						if err != nil {
							log.Println(err)
						}
						fmt.Println("Added polygon number", polygonID)
					}
				}

				// add Circles
				var circleID int64
				for _, circle := range area.Circles {
					statement, err = db.Prepare("insert into circles (areaId, circle) values (?, ?)")
					if err != nil {
						log.Println(err)
					}
					res, err = statement.Exec(string(areaID), circle)
					if err != nil {
						log.Println("Insert circle error:", err)
					} else {
						circleID, err = res.LastInsertId()
						if err != nil {
							log.Println(err)
						}
						fmt.Println("Added circle number", circleID)
					}
				}
			}
		}
	}

	// if Update or Cancel, set replacedBy pointer on referenced messages
	if alert.MessageType == "Update" || alert.MessageType == "Cancel" {
		var alrt int
		ref := alert.References
		refs := strings.Split(ref, ",")
		sqlStmt := "select id from alerts where identifier ='" + refs[0] + "', sender = '" + refs[1] + "', and sent = '" + refs[2] + "'"
		fmt.Println(sqlStmt)
		_ = db.QueryRow(sqlStmt).Scan(&alrt)
		fmt.Println("replace/update alert", alrt)
		// set replacedBy in cancelled/updated alert
		sqlStmt = "update alerts set replacedBy='" + ref + "' where id='" + string(alrt) + "'"
		fmt.Println(sqlStmt)
		_, err = db.Exec(sqlStmt)
		if err != nil {
			log.Println("Update alert error:", err)
		}
	}
}

func getCMAM(info cap.Info) string {
	for _, param := range info.Parameters {
		if param.ValueName == "CMAMtext" {
			return param.Value
		}
	}
	return ""
}
