## WARN Realtime Map
# Gateway application
**warnMonitor.go** uses **catcher/catcher.go** to capture UDP packets from the Harmonic receiver and reassembles them into WEA CAP XML messages, creates a JSON version of each alert, and then posts both versions to the remote database on the server.  It also forwards to the DB a datestamp of the last received heartbeat or active message received over the Harmonic.
