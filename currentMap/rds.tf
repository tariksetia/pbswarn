resource "aws_rds_cluster" "aurora_cluster" {
  cluster_identifier           = "pbswarn-aurora-cluster"
  database_name                = "warn"
  master_username              = "warn"
  master_password              = "${data.aws_ssm_parameter.this.value}"
  backup_retention_period      = 7
  preferred_backup_window      = "02:00-03:00"
  preferred_maintenance_window = "wed:03:00-wed:04:00"
  db_subnet_group_name         = "${aws_db_subnet_group.aurora_subnet_group.name}"
  final_snapshot_identifier    = "pbswarn-aurora-cluster"

  vpc_security_group_ids = [
    "${aws_security_group.pbswarn_inbound_rds.id}",
  ]

  deletion_protection = true

  tags {
    Name      = "PBSWArn-Aurora-DB-Cluster"
    ManagedBy = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_rds_cluster_instance" "aurora_cluster_instance" {
  count = "2"

  identifier           = "pbswarn-aurora-instance-${count.index}"
  cluster_identifier   = "${aws_rds_cluster.aurora_cluster.id}"
  instance_class       = "db.t3.small"
  db_subnet_group_name = "${aws_db_subnet_group.aurora_subnet_group.name}"
  publicly_accessible  = false
  engine               = "aurora"

  tags {
    Name      = "PBSWarn-Aurora-DB-Instance-${count.index}"
    ManagedBy = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_subnet_group" "aurora_subnet_group" {
  name        = "pbswarn_aurora_db_subnet_group"
  description = "Allowed subnets for Aurora DB cluster instances"
  subnet_ids  = ["${var.private_subnets}"]

  tags {
    Name      = "PBSWarn-Aurora-DB-Subnet-Group"
    ManagedBy = "terraform"
  }
}

resource "aws_security_group" "pbswarn_inbound_rds" {
  name        = "pbswarn-inbound-rds"
  description = "Allow port 3306 into RDS"
  vpc_id      = "${var.vpc}"

  ingress {
    from_port = 3306
    to_port   = 3306
    protocol  = "tcp"

    #cidr_blocks = ["0.0.0.0/0"]
    security_groups = ["${aws_security_group.pbswarn_inbound_lambda.id}"]
    description     = "Allowing traffic into RDS instances only Lambda Functions"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags {
    Name    = "pbswarn-inbound-rds"
    Creator = "Terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

########################
## Output
########################

# output "cluster_address" {
#     value = "${aws_rds_cluster.aurora_cluster.address}"
# }

data "aws_ssm_parameter" "this" {
  name = "/PBSWARN/PBSWARN_DB_PASSWORD"
}

# resource "aws_db_instance" "this" {
#   name                        = "warn"
#   identifier                  = "pbswarn"
#   username                    = "warn"
#   password                    = "${data.aws_ssm_parameter.this.value}"
#   port                        = "5432"
#   engine                      = "postgres"
#   engine_version              = "9.6.11"
#   instance_class              = "db.t2.small"
#   allocated_storage           = "5"
#   storage_encrypted           = false
#   vpc_security_group_ids      = ["${aws_security_group.pbswarn_inbound_rds.id}"]
#   db_subnet_group_name        = "${aws_db_subnet_group.this.id}"
#   parameter_group_name        = "default.postgres9.6"
#   multi_az                    = true
#   storage_type                = "standard"
#   publicly_accessible         = false
#   allow_major_version_upgrade = false
#   auto_minor_version_upgrade  = false
#   apply_immediately           = true
#   maintenance_window          = "sun:02:00-sun:04:00"
#   skip_final_snapshot         = false
#   copy_tags_to_snapshot       = true
#   backup_retention_period     = 7
#   backup_window               = "04:00-06:00"
#   final_snapshot_identifier   = "pbswarnFinalSnapshot"
#   deletion_protection         = true
# #   lifecycle {
# #     prevent_destroy = true
# #   }
#   tags {
#     Name    = "pbswarn RDS"
#     Creator = "Terraform"
#   }
# }
# data "aws_ssm_parameter" "this" {
#   name = "/PBSWARN/PBSWARN_DB_PASSWORD"
# }
# resource "aws_db_subnet_group" "this" {
#   name       = "pbswarn-db-subnet-group"
#   subnet_ids = ["${var.operations_subnet_1_id}", "${var.operations_subnet_2_id}"]
#   tags = {
#     Name = "pbswarn DB subnet group"
#   }
# }
# # # Write this to param store to take it into the Task - Generated dynamically
# # resource "aws_ssm_parameter" "jdbc_url" {
# #   name  = "/pbswarn/pbswarn_PROD_JDBC_URL"
# #   type  = "String"
# #   value = "jdbc:postgresql://${aws_db_instance.this.address}/sonar"
# # }

