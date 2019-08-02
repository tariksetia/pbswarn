/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Updated 8/1/2019
 *
 *************************************************************/

package hdhr

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"log"
	"net"
	"os/exec"
	"strconv"
	"strings"
	"unicode/utf8"

	config "github.com/Tkanos/gonfig"
	cap "pbs.org/hdhr/cap"
	newdb "pbs.org/hdhr/newdb"
	tuner "pbs.org/hdhr/tuner"
)

// Configuration data structure for application config
type Configuration struct {
	Dsn     string
	Driver  string
	Tuner   int
	UDPPort int
	PID     string
	Version string
	WebPort int
	Freq    string
}

var inMessage bool
var message []byte
var myIP string
var replacer strings.Replacer
var cfg Configuration

var currentIP, currentNetworkHardwareName string
var deviceID string
var alerts chan cap.Alert
var buf []byte
var posn int

func Start() {
	// load system configuration
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		log.Println("(test.main config.GetConf)", err.Error())
	}
	// trim database
	newdb.TrimDB(10)
	// set up UDP client
	packets := make(chan []byte, 20)
	go reader(packets)
	// set up print spooler
	alerts = make(chan cap.Alert, 5)
	go spooler(alerts)
	// start up the receiver
	tuner.Start()
	defer panicHandler()
	for {
		buf = <-packets // get lines of data from reader()
		slice(buf) // split out mpeg packets and pass to assembler
	}
}

// UDP client (must lanuch before tuner is set)
func reader(packets chan []byte) {
	pc, err := net.ListenPacket("udp", getOutboundIP().String()+":"+strconv.Itoa(cfg.UDPPort))
	fmt.Println("(hdhr.reader) Listening to UDP on port", strconv.Itoa(cfg.UDPPort))
	if err != nil {
		log.Println("(hdhr.reader)", err)
	}
	defer pc.Close()
	for {
		buffer := make([]byte, 4096)
		pc.ReadFrom(buffer)
		packets <- buffer
	}
}

// parse a UDP packet into a slice of MPEG Packet content strings
func slice(msg []byte) {
	items := split(msg, 188)
	for _, v := range items {
		filter(v)
	}
}

// filter cruft from each MPEG packet
func filter(item []byte) {
	// remove the MPEG header
	item = item[12:]
	// remove any offending bytes
	item = bytes.ReplaceAll(item, []byte("\x00"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\x01"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\xff"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\u0018"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\u001a"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\u000f"), []byte(""))
	item = bytes.ReplaceAll(item, []byte("\u0010"), []byte(""))
	item = removeNonUTF8Bytes(item)
	item = bytes.ReplaceAll(item, []byte("&#xA;"), []byte("\n")) // HTML-escaped newlines
	// remove the WARN packet header at message start
	st := bytes.Index(item, []byte("<?xml "))
	if st != -1 {
		item = item[st:]
	}
	// now pass to assembler
	if (len(item) > 0) {
		//log.Println(string(item))
		assemble(item)
	}
}

// filter the UDP packets, and assemble XML from start to finish
func assemble(msg []byte) {
	if len(msg) == 0 {
		return
	}
	// if packet contains "<?xml ", start a new message
	st := bytes.Index(msg, []byte("<?xml "))
	if st != -1 {
		message = msg[st:]
		inMessage = true
		posn = 0
		message = make([]byte, 0) // init a new message
	}
	// if we're in a message, append this new fragment
	if inMessage {
		//fmt.Println("\n",strconv.Itoa(posn)+"->", string(msg) )
		message = append(message, msg...)
		posn = posn + 1
	}
	// repair and trim at the end of CMAC, record uptime
	en := bytes.Index(message, []byte("</CMAC_Alert_"))
	if en != -1 {
		message = message[:en]                                           // trim off trailing garbage
		message = append(message, []byte("</CMAC_Alert_Attributes>")...) // repair the closing tag
		inMessage = false
		newdb.PutUptime()
		fmt.Println("cmam", newdb.GetUptime())
	}
	// repair and trim at the end of CAP Alert, record uptime
	en = bytes.Index(message, []byte("</ale"))
	if en != -1 {
		message = message[:en]                           // trim off trailing garbage
		message = append(message, []byte("</alert>")...) // repair the closing tag
		inMessage = false
		// now parse the XML
		alert := cap.Alert{}
		err := xml.Unmarshal(message, &alert)
		if err != nil {
			log.Println("(test.assemble)", err)
			fmt.Println(string(message))
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
		xml := []byte(toXML(a))
		xml = bytes.ReplaceAll(xml, []byte("\xff"), []byte(""))
		//fmt.Println("(hdhr.spooler)", string(xml))
		newdb.PutAlert(a)
		newdb.PutUptime()
	}
}

// serialize a CAP object
func toXML(alert cap.Alert) string {
	cap, err := xml.MarshalIndent(alert, "", "    ") // prettiness
	if err != nil {
		log.Println(err)
		//log.Println("<?xml version='UTF-8' encoding='UTF-8'?>\n" + replacer.Replace(string(cap)))
		return ""
	}
	// return XML with XML-escaped newlines ("&#xA;") replaced
	return "<?xml version='UTF-8' encoding='UTF-8'?>\n" + replacer.Replace(string(cap))
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

// Get preferred outbound ip of this machine
func getOutboundIP() net.IP {
	myIP := execCmd("/sbin/ifconfig", "eth0")
	myIP = strings.TrimSpace(strings.Split(myIP, "\n")[1])
	myIP = strings.Split(myIP, " ")[1]
	return net.ParseIP(myIP)
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

func panicHandler() {
	if err := recover(); err != nil {
		fmt.Printf("recovering from: %q\n", err)
	}
}

var removeNonUTF = func(r rune) rune {
	if r == utf8.RuneError {
		return -1
	}
	return r
}

// RemoveNonUTF8Strings removes strings that isn't UTF-8 encoded
func removeNonUTF8Strings(string string) string {
	return strings.Map(removeNonUTF, string)
}

// RemoveNonUTF8Bytes removes bytes that isn't UTF-8 encoded
func removeNonUTF8Bytes(data []byte) []byte {
	return bytes.Map(removeNonUTF, data)
}
