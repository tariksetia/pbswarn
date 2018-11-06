USE 'warn'
CREATE TABLE `alerts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `xml` mediumtext,
  `received` datetime DEFAULT NULL,
  `expires` datetime DEFAULT NULL,
  `replacedBy` varchar(100) DEFAULT NULL,
  `identifier` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=428 DEFAULT CHARSET=utf8mb4;
CREATE INDEX alerts_identifier_IDX USING BTREE ON warn.alerts (identifier);
CREATE INDEX alerts_expires_IDX USING BTREE ON warn.alerts (expires);
