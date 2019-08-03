/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 8/3/2019
 *
 *************************************************************/

package main

import (
    "bytes"
    "database/sql"
    "encoding/json"

    //"fmt"
    "hash"
    "io/ioutil"
    "log"
    "net"
    "net/http"
    "strings"

    "golang.org/x/net/ipv4"
)

//const postURL = "https://94e38d27ol.execute-api.us-west-2.amazonaws.com/dev"
//const postURL2 = "https://qkbfin9m14.execute-api.us-east-1.amazonaws.com/Prod"
const postURL = "https://egct53wru7.execute-api.us-east-1.amazonaws.com/prod"

var (
    inMessage bool
    message   []byte
    breaker   []byte
    lastHash  string
    replacer  strings.Replacer
    h         hash.Hash
    db        *sql.DB
    err       error
    result    sql.Result
    rows      *sql.Rows
    dispPoly  string
    channel   chan []byte
)

type mapItem struct {
    ID           string
    Sent         string
    Status       string
    MsgType      string
    Cmam         string
    Headline     string
    Source       string
    Levels       string
    ResponseType string
    Description  string
    Instruction  string
    Expires      string
    AreaDesc     string
    Geocodes     []string
    Polygons     string
}

// Run is a goroutine to monitor UDP packets from the WARN receiver and
// re-assemble
func main() {
    inMessage = false
    breaker = []byte{0x47, 0x09, 0x11} // Start of MPEG Packet break?
    if err != nil {
        log.Fatal("Create breaker", err)
    }
    breaker = []byte{0x47, 0x09, 0x11} // Start of MPEG Packet break?
    // set up the UDP monitor
    eth0, err := net.InterfaceByName("eth0")
    if err != nil {
        log.Fatal("InterfaceByName", err)
    }
    group := net.IPv4(224, 3, 0, 1)
    c, err := net.ListenPacket("udp4", "0.0.0.0:5000")
    if err != nil {
        log.Fatal("ListenPacket", err)
    }
    defer c.Close()
    p := ipv4.NewPacketConn(c)
    if err := p.JoinGroup(eth0, &net.UDPAddr{IP: group}); err != nil {
        log.Fatal("JoinGroup", err)
    }
    b := make([]byte, 1500)
    log.Println("Starting multicast monitoring from WARN receiver on 224.3.0.1")
    for {
        n, _, _, _ := p.ReadFrom(b)
        packetHandler(b, n)
    }
}

// process each multicast packet, pass along those for assembly
func packetHandler(b []byte, n int) {
    //log.Println("packet")
    msg := b[24:n]
    msg = removeAll(msg, breaker)               // take out MPEG packet breaks
    if bytes.Index(msg, []byte("CMAC")) == -1 { // process if not CMAC message
        assemble(msg)
    } else {
        go postXML("heartbeat")
    }
}

func assemble(msg []byte) {
    // if packet contains "<?xml ", start a new message
    st := bytes.Index(msg, []byte("<?xml "))
    if st != -1 {
        if !inMessage {
            inMessage = true
            msg = msg[st:] // trim off leading garbage
        }
        message = make([]byte, 0) // init a new message
    }
    // if packet contains "</ale" it's the end of the message
    en := bytes.Index(msg, []byte("</ale"))
    if inMessage && en != -1 {
        msg = msg[:en]                           // trim off trailing garbage
        msg = append(msg, []byte("</alert>")...) // repair the closing tag
        message = append(message, msg...)
        inMessage = false
        //fmt.Println(string(message))
        log.Println("message")
        go postXML(string(message))
        return
    }
    // otherwise, if we're in message, append it
    if inMessage {
        message = append(message, msg...)
    }
}

// remove all instances of a byte slice from within another byte slice
func removeAll(source []byte, remove []byte) []byte {
    for bytes.Index(source, remove) > -1 {
        pnt := bytes.Index(source, remove)
        source = append(source[:pnt], source[pnt+12:]...)
    }
    return source
}

func postXML(message string) {

    // send alert to new PBS server
    req, _ := http.NewRequest("POST", postURL, bytes.NewBuffer([]byte(message)))
    req.Header.Set("Content-Type", "application/xml")
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        log.Println("postXML Error", err)
    }
    defer resp.Body.Close()

    // log response from PBS (new) server
    body, _ := ioutil.ReadAll(resp.Body)
    var n map[string]interface{}
    err = json.Unmarshal(body, &n)
    if err != nil {
        log.Println(resp.StatusCode, "-", string(body))
    } else {
        log.Println(resp.StatusCode, "-", n["body"])
    }
    return
}
