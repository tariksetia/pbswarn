/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Updated 8/6/2019
 *
 *************************************************************/

package tuner

import (
	"bytes"
	"fmt"
	"log"
	"net"
	"os/exec"
	"strconv"
	"strings"

	config "github.com/Tkanos/gonfig"
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

var cfg Configuration
var myIP string
var deviceID string
var deviceIP string
var targetIP string
var targetPort string
var pid string
var tuner string
var freq string

func Start() {
	// get my ethernet IP address
	myIP = getOutboundIP().String()
	fmt.Println("(tuner.init) My address is", myIP)
	// discover HDHomeRun receiver on ethernet
	hdhr := strings.Split(Discover(), " ")
	deviceID = hdhr[2]
	deviceIP = hdhr[5]
	fmt.Print("(tuner.init) Found receiver ", deviceID, " at ", deviceIP)
	// load system configuration
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		log.Println("(tuner.init config.GetConf)", err.Error())
	}
	targetPort = strconv.Itoa(cfg.UDPPort)
	tuner = strconv.Itoa(cfg.Tuner)
	pid = cfg.PID
	freq = cfg.Freq
	fmt.Println("(tuner.init) Tuner"+tuner+":", freq, "MHz, PID", pid)
	// set station frequency
	TuneRX(deviceID, tuner, freq)
	fmt.Print("(tuner.init) Tuner status ", RXstatus(deviceID, tuner))
	// set PID to monitor
	SetPIDFilter(deviceID, tuner, pid)
	// now launch UDP feed
	TargetRX(deviceID, tuner, myIP, targetPort)
}

func Discover() string {
	return execCmd("/usr/local/bin/hdhomerun_config", "discover")
}

func TuneRX(device string, tuner string, freq string) {
	fmt.Println("(tuner.TuneRX) set device", device, "tuner", tuner, "to", freq)
	execCmd("/usr/local/bin/hdhomerun_config", device, "set", "/tuner"+tuner+"/channel", "8vsb:"+freq+"000000")
	// load system configuration
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		log.Println("(tuner.init config.GetConf)", err.Error())
	}
	SetPIDFilter(device, tuner, cfg.PID)
	fmt.Println("(tuner.TuneRX) set target", device, "tuner", tuner, "IP", getOutboundIP().String(), "port", strconv.Itoa(cfg.UDPPort))
	TargetRX(device, tuner, getOutboundIP().String(), strconv.Itoa(cfg.UDPPort))
}

func RXstatus(device string, tuner string) string {
	return execCmd("/usr/local/bin/hdhomerun_config", device, "get", "/tuner"+tuner+"/status")
}

func TargetRX(device string, tuner string, ip string, port string) {
	execCmd("/usr/local/bin/hdhomerun_config", device, "set", "/tuner"+tuner+"/target", "udp://"+ip+":"+port)
}

func SetPIDFilter(device string, tuner string, pid string) {
	execCmd("/usr/local/bin/hdhomerun_config", device, "set", "/tuner"+tuner+"/filter", pid)
}

// execute a system-level command
func execCmd(cmdStr string, args ...string) string {
	cmd := exec.Command(cmdStr, args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		log.Println("(execCmd)", err)
	}
	return out.String()
}

// Get preferred outbound ip of this machine
func getOutboundIP() net.IP {
	myIP := execCmd("/sbin/ifconfig", "eth0")
	myIP = strings.TrimSpace(strings.Split(myIP, "\n")[1])
	myIP = strings.Split(myIP, " ")[1]
	return net.ParseIP(myIP)
}
