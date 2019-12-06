/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.1 4/5/2019
 *
 *************************************************************/

package cap

import (
	"encoding/xml"
	"fmt"
)

type Geocode struct {
	XMLName   xml.Name `xml:"geocode" json:"geocode"`
	ValueName string   `xml:"valueName" json:"valueName"`
	Value     string   `xml:"value" json:"value"`
}

type Area struct {
	XMLName     xml.Name  `xml:"area" json:"-"`
	Description string    `xml:"areaDesc" json:"description"`
	Polygons    []string  `xml:"polygon" json:"polygons"`
	Circles     []string  `xml:"circle" json:"circles"`
	Geocodes    []Geocode `xml:"geocode" json:"geocodes"`
	Altitude    string    `xml:"altitude" json:"altitude"`
	Ceiling     string    `xml:"ceiling" json:"ceiling"`
}

type Resource struct {
	XMLName     xml.Name `xml:"resource" json:"-"`
	Description string   `xml:"resourceDesc" json:"description"`
	MimeType    string   `xml:"mimeType" json:"mime_type"`
	Size        int      `xml:"size" json:"size"`
	URI         string   `xml:"uri" json:"uri"`
	Digest      string   `xml:"digest" json:"digest"`
	DerefURI    string   `xml:"derefUri" json:"deref_uri"`
}

type Parameter struct {
	XMLName   xml.Name `xml:"parameter" json:"parameter"`
	ValueName string   `xml:"valueName" json:"valueName"`
	Value     string   `xml:"value" json:"value"`
}

type EventCode struct {
	XMLName   xml.Name `xml:"eventCode" json:"eventCode"`
	ValueName string   `xml:"valueName" json:"valueName"`
	Value     string   `xml:"value" json:"value"`
}

type Info struct {
	XMLName      xml.Name    `xml:"info" json:"-"`
	Language     string      `xml:"language" json:"language"`
	Category     string      `xml:"category" json:"categories"`
	Event        string      `xml:"event" json:"event"`
	ResponseType string      `xml:"responseType" json:"response_types"`
	Urgency      string      `xml:"urgency" json:"urgency"`
	Severity     string      `xml:"severity" json:"severity"`
	Certainty    string      `xml:"certainty" json:"certainty"`
	Audience     string      `xml:"audience" json:"audience"`
	EventCodes   []EventCode `xml:"eventCode" json:"event_codes"`
	Effective    string      `xml:"effective" json:"effective"`
	Onset        string      `xml:"onset" json:"onset"`
	Expires      string      `xml:"expires" json:"expires"`
	SenderName   string      `xml:"senderName" json:"sender_name"`
	Headline     string      `xml:"headline" json:"headline"`
	Description  string      `xml:"description" json:"description"`
	Instruction  string      `xml:"instruction" json:"instruction"`
	Web          string      `xml:"web" json:"web"`
	Contact      string      `xml:"contact" json:"contact"`
	Parameters   []Parameter `xml:"parameter" json:"parameters"`
	Resources    []Resource  `xml:"resource" json:"resources"`
	Areas        []Area      `xml:"area" json:"areas"`
}

type Code struct {
	XMLName xml.Name `xml:"code" json:"code"`
	Code    string   `xml:"code" json:"code"`
}

type Alert struct {
	XMLName     xml.Name `xml:"alert" json:"-"`
	Identifier  string   `xml:"identifier" json:"identifier"`
	Sender      string   `xml:"sender" json:"sender"`
	Sent        string   `xml:"sent" json:"sent"`
	Status      string   `xml:"status" json:"status"`
	MessageType string   `xml:"msgType" json:"message_type"`
	Source      string   `xml:"source" json:"source"`
	Scope       string   `xml:"scope" json:"scope"`
	Restriction string   `xml:"restriction" json:"restriction"`
	Addresses   string   `xml:"addresses" json:"addresses"`
	Code        string   `xml:"code" json:"codes"`
	Note        string   `xml:"note" json:"note"`
	References  string   `xml:"references" json:"references"`
	Incidents   string   `xml:"incidents" json:"incidents"`
	Infos       []Info   `xml:"info" json:"infos"`
}

var TestMsg = `<?xml version="1.0" encoding="UTF-8"?>
 <alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>333706073999497</identifier><sender>333706073999497</sender><sent>2019-03-29T09:13:10-07:00</sent><status>Actual</status><msgType>Alert</msgType><source>Carroll County Public Safety</source><scope>Public</scope><code>IPAWSv1.0</code><info><language>en-US</language><category>Safety</category><event>Law Enforcement Warning</event><urgency>Immediate</urgency><severity>Severe</severity><certainty>Observed</certainty><eventCode><valueName>SAME</valueName><value>LEW</value></eventCode><expires>2019-03-29T10:13:10-07:00</expires><senderName>Carroll County Public Safety</senderName><parameter><valueName>BLOCKCHANNEL</valueName><value>CAPEXCH</value></parameter><parameter><valueName>BLOCKCHANNEL</valueName><value>NWEM</value></parameter><parameter><valueName>BLOCKCHANNEL</valueName><value>EAS</value></parameter><parameter><valueName>BLOCKCHANNEL</valueName><value>PUBLIC</value></parameter><parameter><valueName>EAS-ORG</valueName><value>CIV</value></parameter><parameter><valueName>CMAMtext</valueName><value>Police activity in area of 1100 block of S. Main Street in Hampstead. Please avoid area.</value></parameter><parameter><valueName>timezone</valueName><value>EST</value></parameter><area><areaDesc>Carroll County, MD</areaDesc><polygon>39.61062458654719,-76.84417436532371 39.60975974249771,-76.84321955457622 39.60879000897288,-76.8424514335832 39.60773926784112,-76.84188891094709 39.606633394858,-76.84154582992299 39.605499622230916,-76.84143062832791 39.604365867869724,-76.84154613175063 39.603260047901664,-76.84188948505769 39.60220938934087,-76.84245222377815 39.60123975986217,-76.84322048350698 39.600375031150186,-76.84417534206013 39.599636491474946,-76.84529328590833 39.59904232189891,-76.84654678930494 39.59860714904969,-76.84790499193095 39.598341685302856,-76.84933445824083 39.59825246531188,-76.8507999999996 39.598341685302856,-76.85226554175927 39.59860714904969,-76.85369500806915 39.59904232189891,-76.85505321069515 39.599636491474946,-76.85630671409177 39.600375031150186,-76.85742465793999 39.60123975986217,-76.85837951649312 39.60220938934087,-76.85914777622196 39.603260047901664,-76.85971051494239 39.604365867869724,-76.86005386824857 39.605499622230916,-76.8601693716722 39.606633394858,-76.86005417007712 39.60773926784112,-76.859711089053 39.60879000897288,-76.85914856641692 39.60975974249771,-76.85838044542389 39.61062458654719,-76.8574256346764 39.61136324155786,-76.85630764302255 39.611957515180734,-76.85505400089102 39.6123927706002,-76.85369558217975 39.61265828736208,-76.85226584358692 39.61274752562033,-76.8507999999996 39.61265828736208,-76.84933415641318 39.6123927706002,-76.84790441782035 39.611957515180734,-76.8465459991091 39.61136324155786,-76.84529235697666 39.61062458654719,-76.84417436532371</polygon><geocode><valueName>SAME</valueName><value>024013</value></geocode></area></info><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>qRn8hLlinpFEntv5ayLyuz3QYrwNWXqC5jpXSn6TpvY=</DigestValue></Reference></SignedInfo><SignatureValue>GonGswtNyBIBeaTPeJ0Ry2BtobxEaEWTz8z2mfVOw9Kz2k450/j+NLr0SYIQg+B2Yk1Biy3p+Y1lIGrhincMe3vlEkIohuQtFYitLfQWedTULNC5a93ZMhFLyNGYnp8cTdYZATs0d6XvFoMhXQMSAofRFUeMwJpsr3DPozRB3EsVGr3KEeX2StUhK06uS+BxV1yQAXJiXpZhF9Mf9mRuy79o1ez3NCxt/veud0Mswo6pj+x5j9bc71MJKJijiDAc9rSgz8N5HVXJZhS3htllZYxeDG/k8cyCHGRX7KvfboLBSHIdVLCZzdz5hZFeVqpZF36PlflpHgNKK3s2UNIShQ==</SignatureValue><KeyInfo><X509Data><X509SubjectName>CN=IPAWSOPEN_200076,OU=7F0000010000015ACD63BE1A0000112E,OU=Devices IPAWS,OU=National Continuity Programs,O=FEMA IPAWS,C=US</X509SubjectName><X509Certificate>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</X509Certificate></X509Data></KeyInfo></Signature></alert>`

func ParseTest() {
	alert := ParseCAP([]byte(TestMsg))
	fmt.Println(alert.Identifier)
	for i := 0; i < len(alert.Infos); i++ {
		fmt.Println(alert.Infos[i].Event)
		for k := 0; k < len(alert.Infos[i].Parameters); k++ {
			fmt.Println(alert.Infos[i].Parameters[k].Value)
		}
		for j := 0; j < len(alert.Infos[i].Areas); j++ {
			fmt.Println(alert.Infos[i].Areas[j].Description)
		}
	}
}

// ParseCAP ... XML parse of CAP, return an Alert struct
func ParseCAP(msg []byte) Alert {
	var alert Alert
	xml.Unmarshal(msg, &alert)
	return alert
}

// FormatCAP ... convert an Alert structure to an indented string
func FormatCAP(alert Alert) string {
	output, err := xml.MarshalIndent(alert, "", "   ")
	if err != nil {
		fmt.Printf("error: %v\n", err)
	}
	return string(output)
}
