/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.0 7/13/2019
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
	"log"
	"net"
	"os/exec"
	"strings"

	"../cap"
	"../warndb"
)

var inMessage bool
var message []byte
var myIP string
var replacer strings.Replacer

var currentIP, currentNetworkHardwareName string
var deviceID string
var alerts chan cap.Alert

func main() {
	inMessage = false
	var buf []byte
	// listen to incoming udp packets
	myIP = getOutboundIP().String()
	fmt.Println("My IP is", myIP)
	// set up UDP client
	packets := make(chan []byte, 20)
	go reader(packets)
	// set up print spooler
	alerts = make(chan cap.Alert, 5)
	go spooler(alerts)
	// tune up the receiver
	setup()
	// now monitor for UDP traffic
	for {
		buf = <-packets
		slice(buf)
	}
}

// UDP client (must lanuch before tuner is set)
func reader(ch chan []byte) {
	pc, err := net.ListenPacket("udp", myIP+":8125")
	if err != nil {
		log.Fatal(err)
	}
	defer pc.Close()
	for {
		buffer := make([]byte, 4096)
		pc.ReadFrom(buffer)
		//fmt.Println("=>", string(buffer))
		ch <- buffer
	}
}

// spool alerts off channel to print/DB
func spooler(ch chan cap.Alert) {
	for {
		a := <-ch
		log.Println("GOT ALERT")
		xml := []byte(toXML(a))
		xml = bytes.ReplaceAll(xml, []byte("\xff"), []byte(""))
		xml = bytes.ReplaceAll(xml, []byte("&#xA;"), []byte("\n"))
		fmt.Println("(", len(xml), ") ", string(xml))
		warndb.ToDB(a, string(xml))
		warndb.Uptime()
	}
}

// parse a UDP packet into a slice of MPEG Packet content strings
func slice(msg []byte) {
	//log.Print("PACKET ",  execCmd("/usr/local/bin/hdhomerun_config", deviceID, "get", "/tuner1/status"))
	items := split(msg, 188)
	for _, v := range items {
		item := filter(v)
		if len(item) > 0 {
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
	//fmt.Println("->", string(msg), "\n")
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
	// repair and trim at the end of CMAC, record uptime
	en := bytes.Index(message, []byte("</CMAC_Alert_"))
	if en != -1 {
		message = message[:en]                                           // trim off trailing garbage
		message = append(message, []byte("</CMAC_Alert_Attributes>")...) // repair the closing tag
		inMessage = false
		//log.Println("CMAC")
		warndb.Uptime()
	}
	// repair and trim at the end of CAP Alert, record uptime
	en = bytes.Index(message, []byte("</ale"))
	if en != -1 {
		message = message[:en]                           // trim off trailing garbage
		message = append(message, []byte("</alert>")...) // repair the closing tag
		inMessage = false
		alert := cap.Alert{}
		err := xml.Unmarshal(message, &alert)
		if err != nil {
			log.Println(err)
			return
		}
		// channel alert to spooler
		alerts <- alert
	}
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
		log.Println(err)
		return ""
	}
	// return XML with XML-escaped newlines ("&#xA;") replaced
	return "<?xml version='UTF-8' encoding='UTF-8'?>\n" + replacer.Replace(string(cap))
}

// set up the HDHomeRun receiver
func setup() {
	// discover receiver
	response := execCmd("/usr/local/bin/hdhomerun_config", "discover")
	deviceID = strings.Split(response, " ")[2]
	deviceIP := strings.Split(response, " ")[5]
	fmt.Print("Device ", deviceID, " is at ", deviceIP)
	execCmd("/usr/local/bin/hdhomerun_config", deviceID, "set", "/tuner1/channel", "8vsb:189000000")
	execCmd("/usr/local/bin/hdhomerun_config", deviceIP, "set", "/tuner1/filter", "0x0911")
	execCmd("/usr/local/bin/hdhomerun_config", deviceID, "set", "/tuner1/target", "udp://"+myIP+":8125")
	fmt.Print(execCmd("/usr/local/bin/hdhomerun_config", deviceID, "get", "/tuner1/status"))
}

// Get preferred outbound ip of this machine
func getOutboundIP() net.IP {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()
	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP
}

// execute a system-level command
func execCmd(cmdStr string, args ...string) string {
	cmd := exec.Command(cmdStr, args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		log.Fatal(err)
	}
	return out.String()
}
