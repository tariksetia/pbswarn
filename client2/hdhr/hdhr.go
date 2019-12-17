/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 12/9/2019
 *
 *************************************************************/
package hdhr

import (
	"bytes"
	"fmt"
	"net"
	"os/exec"
	config "pbs.org/warnmonitor/config"
	"strings"
)

// set up the HDHomeRun receiver
func Tune() {
	cfg := config.GetConfig()
	// discover receiver
	response := execCmd("/usr/bin/hdhomerun_config", "discover")
	deviceID := strings.Split(response, " ")[2]
	deviceIP := strings.Split(response, " ")[5]
	myIP := getOutboundIP().String()
	fmt.Println("My IP is", myIP)
	fmt.Print("Device ", deviceID, " is at ", deviceIP)
	execCmd("/usr/bin/hdhomerun_config", deviceID, "set", "/tuner1/channel", "8vsb:"+cfg.Freq+"000000")
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
