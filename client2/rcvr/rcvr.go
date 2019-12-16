/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 12/15/2019
 *
 *************************************************************/

/*
	REQUIRES Go 1.12 or later
*/

package main

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"net"
	"os/exec"
	"strings"

	dbapi "pbs.org/warnmonitor/dbapi"
	config "pbs.org/warnmonitor/config"
	hdhr "pbs.org/warnmonitor/hdhr"
	cap "pbs.org/warnmonitor/cap"
)

var (
	cfg 		config.Configuration
	inMessage 	bool
	message 	[]byte
	myIP 		string
	replacer 	strings.Replacer
	currentIP 	string 
	currentNetworkHardwareName string
	deviceID 	string
	alerts 		chan cap.Alert
)


func init() {
	cfg = config.GetConfig()
}


func main() {
	inMessage = false
	var buf []byte
	// listen to incoming udp packets
	myIP = getOutboundIP().String()
	// set up UDP client
	packets := make(chan []byte, 20)
	go reader(packets)
	// set up print spooler
	alerts = make(chan cap.Alert, 5)
	go spooler(alerts)
	// tune up the receiver
	hdhr.Tune()
	// now monitor for UDP traffic
	for {
		buf = <-packets
		//fmt.Println(string(buf))
		slice(buf)
	}
}


// Get preferred outbound ip of this machine
func getOutboundIP() net.IP {
	myIP := execCmd("/sbin/ifconfig", "eth0")
	myIP = strings.TrimSpace(strings.Split(myIP, "\n")[1])
	myIP = strings.Split(myIP, " ")[1]
	return net.ParseIP(myIP)
}


// UDP client (must lanuch before tuner is set)
func reader(ch chan []byte) {
	pc, err := net.ListenPacket("udp", myIP+":"+cfg.UDPport)
	if err != nil {
		fmt.Println("(rcvr.reader)", err)
	}
	defer pc.Close()
	for {
		buffer := make([]byte, 4096)
		pc.ReadFrom(buffer)
		//fmt.Println("(rcvr.reader)", string(buffer))
		ch <- buffer
	}
}


// parse a UDP packet into a slice of MPEG Packet content strings
func slice(msg []byte) {
	items := split(msg, 188)
	for _, v := range items {
		item := filter(v)
		if len(item) > 0 {
			//fmt.Println("(rcvr.slice)", string(item))
			assemble(item)
		}
	}
}


// filter cruft from each MPEG packet
func filter(item []byte) []byte {
	// remove the MPEG header
	item = item[12:]
	// remove any 0x00 or 0x01
	item = bytes.ReplaceAll(item, []byte("\x00"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\x01"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\xff"), []byte(""))
	// remove the WARN header
	st := bytes.Index(item, []byte("<?xml "))
	if st != -1 {
		item = item[st:]
	}
	return item
}


// filter the UDP packets, and assemble XML from start to finish
func assemble(msg []byte) {
	if len(msg) == 0 {
		return
	}
	// if packet contains "<?xml ", start a new message
	st := bytes.Index(msg, []byte("<?xml "))
	if st != -1 {
		message = message[st:]
		inMessage = true
		message = make([]byte, 0) // init a new message
	}
	// if we're in a message, append this new fragment
	if inMessage {
		message = append(message, msg...)
	}
	// repair and trim the end of CMAC, record uptime
	en := bytes.Index(message, []byte("</CMAC_Alert_"))
	if en != -1 {
		message = message[:en]                                           // trim off trailing garbage
		message = append(message, []byte("</CMAC_Alert_Attributes>")...) // repair the closing tag
		inMessage = false
		dbapi.AddLinkTest(message)
	}
	// repair and trim the end of CAP Alert, record uptime
	en = bytes.Index(message, []byte("</ale"))
	if en != -1 {
		message = message[:en]                           // trim off trailing garbage
		message = append(message, []byte("</alert>")...) // repair the closing tag
		inMessage = false
		alert := cap.Alert{}
		err := xml.Unmarshal(message, &alert)
		if err != nil {
			fmt.Println("(rcvr.assemble)", err.Error())
			return
		}
		// channel alert to spooler
		alerts <- alert
	}
}


// spool alerts off channel to print/DB
func spooler(ch chan cap.Alert) {
	for {
		a := <-ch
		xmlmsg := []byte(toXML(a))
		xmlmsg = bytes.ReplaceAll(xmlmsg, []byte("\xff"), []byte(""))
		xmlmsg = bytes.ReplaceAll(xmlmsg, []byte("&#xA;"), []byte("\n"))
		//fmt.Println("(rcvr.spooler) ", string(xml))
		dbapi.AddAlert(a)
		//dbapi.Uptime()
	}
}


// execute a system-level command
func execCmd(cmdStr string, args ...string) string {
	cmd := exec.Command(cmdStr, args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		fmt.Println("(rcvr.execCmd)", err)
	}
	return out.String()
}


// split packet into MPEG Packets
func split(buf []byte, lim int) [][]byte {
	var chunk []byte
	chunks := make([][]byte, 0, len(buf)/lim+1)
	for len(buf) >= lim {
		chunk, buf = buf[:lim], buf[lim:]
		chunks = append(chunks, chunk)
	}
	if len(buf) > 0 {
		chunks = append(chunks, buf[:len(buf)])
	}
	return chunks
}


// serialize a CAP object
func toXML(alert cap.Alert) string {
	cap, err := xml.MarshalIndent(alert, "", "    ") // prettiness
	if err != nil {
		fmt.Println("(rcvr.toXML)", err)
		return ""
	}
	// return XML with XML-escaped newlines ("&#xA;") replaced
	return "<?xml version='UTF-8' encoding='UTF-8'?>\n" + replacer.Replace(string(cap))
}


