/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  warnmonitor.hdhr.go
 *  Version 12/21/2019
 *
 *************************************************************/

package hdhr

import (
	"bytes"
	"time"
	"fmt"
	"net"
	"os/exec"
	config "pbs.org/warnmonitor/config"
	"strings"
)

var deviceID string
var deviceIP string
var cfg config.Configuration
var freq string
var RestartReader bool
var myIP string

func init() {
	cfg = config.GetConfig()
	freq = cfg.Freq
	// discover receiver
	response := execCmd("/usr/bin/hdhomerun_config", "discover")
	deviceID = strings.Split(response, " ")[2]
	deviceIP = strings.Split(response, " ")[5]
}

// set up the HDHomeRun receiver
func Tune() {
	myIP = getOutboundIP().String()
	fmt.Println("My IP is", myIP)
	fmt.Print("Device ", deviceID, " is at ", deviceIP)
	SetFreq(freq)
	execCmd("/usr/bin/hdhomerun_config", deviceIP, "set", "/tuner1/filter", cfg.PID)
	execCmd("/usr/bin/hdhomerun_config", deviceID, "set", "/tuner1/target", "udp://"+myIP+":"+cfg.UDPport)
	fmt.Print(execCmd("/usr/bin/hdhomerun_config", deviceID, "get", "/tuner1/status"))
}

// Get preferred outbound ip of this processor
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
		fmt.Println("(hdhr.execCmd)", err)
	}
	return out.String()
}

func SetFreq(freq string) {
	RestartReader = true
	fmt.Println("(hdhr.SetFreq) "+ freq)
	time.Sleep(300)
	execCmd("/usr/bin/hdhomerun_config", deviceID, "set", "/tuner1/channel", "8vsb:"+freq+"000000")
	execCmd("/usr/bin/hdhomerun_config", deviceIP, "set", "/tuner1/filter", cfg.PID)
	execCmd("/usr/bin/hdhomerun_config", deviceID, "set", "/tuner1/target", "udp://"+myIP+":"+cfg.UDPport)
	fmt.Println("(hdhr.SetFreq) done")
}

func GetStatus() string {
	return execCmd("/usr/bin/hdhomerun_config", deviceID, "get", "/tuner1/status")
}

