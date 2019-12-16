/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 12/14/2019
 *
 *************************************************************/

package cmam

import (
	"encoding/xml"
	"fmt"
)

type CMAM struct {
	Protocol xml.Name `xml:"CMAC_protocol_version" json:"protocol"`
	Gateway  string   `xml:"CMAC_sending_gateway" json:"gateway"`
	Number   string   `xml:"CMAC_message_number" json:"number"`
	Sent     string   `xml:"CMAC_sent_date_time" json:"sent"`
	Status   string   `xml:"CMAC_status" json:"status"`
	Type     string   `xml:"CMAC_message_type" json:"type"`
}


// ParseCMAM ... XML parse of Link Test, return a CMAM struct
func ParseCMAM(msg []byte) CMAM {
	var cmam CMAM
	xml.Unmarshal(msg, &cmam)
	return cmam
}


// FormatCMAM ... convert a CMAM struct to indented XML
func FormatCMAM(cmam CMAM) string {
	output, err := xml.MarshalIndent(cmam, "", "   ")
	if err != nil {
		fmt.Printf("error: %v\n", err)
	}
	return string(output)
}
