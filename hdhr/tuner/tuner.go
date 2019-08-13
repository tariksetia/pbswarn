/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Updated 8/13/2019
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
	"time"

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
	log.Println("(tuner.Start) My address is", myIP)
	// discover HDHomeRun receiver on ethernet
	hdhr := strings.Split(Discover(), " ")
	//fmt.Println("(tuner.Start) ", hdhr)
	deviceID = hdhr[2]
	deviceIP = hdhr[5]
	fmt.Print("(tuner.Start) Found receiver ", deviceID, " at ", deviceIP + ".")
	// load system configuration
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		log.Println("(tuner.Start config.GetConf)", err.Error())
	}
	targetPort = strconv.Itoa(cfg.UDPPort)
	tuner = strconv.Itoa(cfg.Tuner)
	pid = cfg.PID
	freq = cfg.Freq
	fmt.Println("(tuner.Start) Tuner"+tuner+":", freq, "MHz, PID", pid)
	// set station frequency
	TuneRX(deviceID, tuner, freq)
	fmt.Print("(tuner.Start) Tuner status ", RXstatus(deviceID, tuner))
	// set PID to monitor
	SetPIDFilter(deviceID, tuner, pid)
	// now launch UDP feed
	TargetRX(deviceID, tuner, myIP, targetPort)
}

func Discover() string {
	for {
		discovery := execCmd("/usr/local/bin/hdhomerun_config", "discover")
		fmt.Print("(tuner.Discover) ", discovery)
		if (strings.Contains(discovery, "hdhomerun")) {
			return discovery
		}
		fmt.Println("(tuner.Discover) retry")
		time.Sleep(2 * time.Second)
	}
}

func TuneRX(device string, tuner string, freq string) {
	device = strings.TrimSuffix(device, "\n")
	if (device == "") {
		fmt.Println("(tuner.TuneRX) no device ID provided: ", device)
		return
	}
	fmt.Println("(tuner.TuneRX) set device", device, "tuner", tuner, "to", freq)
	execCmd("/usr/local/bin/hdhomerun_config", device, "set", "/tuner"+tuner+"/channel", "8vsb:"+freq+"000000")
	// load system configuration
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		fmt.Println("(tuner.TuneRX config.GetConf)", err.Error())
	}
	SetPIDFilter(device, tuner, cfg.PID)
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
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		fmt.Println("(execCmd) " + fmt.Sprint(err) + ": " + stderr.String())
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
