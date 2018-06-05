# Get all new WEA messages and move to
# "CMAS_Alerts_Processed" sheet

## Install packages ##
if (require(tidyverse) == FALSE) {
  install.packages("tidyverse")
  library(tidyverse)
  library(lubridate)
}
if (require(googlesheets) == FALSE) {
  install.packages("googlesheets")
  library(googlesheets)
}

##

NewCMASImport <- function() { #copies new messages into main sheet
    #browser()
        raw <- gs_key("1GnchiRm2TXgQ1TpTGcsCIGggIjEIsd6TeuVyY_s4a3U",
                      visibility = "private") #CMAS Alerts
        full <- gs_key("1Xw4JefUCS4HHQ0KpvKhr-DjklqzhH3_CeA-zhoAuQfI", 
                       visibility = "private") #CMAS_Alerts_Processed
        ss_new <<- full

        all_cmas <<- gs_read_csv(ss = ss_new
                                 , col_names = c("rec_time", "cmac", "full_text")
                                 , coltypes = "Tcc", skip = 1, trim_ws = TRUE)
        msg_last <- all_cmas %>%
            select(rec_time) %>%
            tail(1) %>%
            as.character() %>%
            mdy_hm()

    print(paste("The last update was", msg_last))

        msg_new <- gs_read_listfeed(raw
                                    , col_names = c("rec_time", "cmac", "full_text")
                                    , coltypes = "Tcc", skip = 1, trim_ws = TRUE) %>%
            mutate(rec_time = mdy_hm(rec_time)) %>%
            filter(rec_time > msg_last) %>%
            mutate(rec_time =
                paste0(
                month(rec_time, label = TRUE,abbr = FALSE), " ",
                day(rec_time), ", ",
                year(rec_time)," at ",
                stringr::str_pad(hour(rec_time),width = 2,side = "left", pad = "0"), ":",
                stringr::str_pad(minute(rec_time),width = 2,side = "left", pad = "0")
            ))

        if (length(msg_new$rec_time)< 1) {
            message("There have been no new messages since your last import.")
        } else {
            print(paste("There have been", length(msg_new$rec_time), "alerts since your last import."))
            gs_add_row(ss = full, ws = 1, input = msg_new, verbose = TRUE)
        }
    }





