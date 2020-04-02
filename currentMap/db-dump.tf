resource "aws_ecs_cluster" "this" {
  name = "pbswarn"

  tags = {
    Name    = "Created to do PBSWarn scheduled DB dumps"
    Creator = "Terraform"
  }
}

resource "aws_ecs_task_definition" "pbswarn_postgres_dump" {
  family = "pbswarn-db-dump"

  #family = "${aws_ecs_task_definition.this.task_definition}"

  #container_definitions    = "${data.template_file.web_task.rendered}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = "${aws_iam_role.ecs_execution.arn}"
  task_role_arn            = "${aws_iam_role.ecs_task.arn}"

  #execution_role_arn = "arn:aws:iam::476146385463:role/ecsTaskExecutionRole"
  #task_role_arn = "arn:aws:iam::476146385463:role/ecsTaskExecutionRole"

  container_definitions = <<DEFINITION
[
  {
   "name": "pbswarn-postgres-dumper",
   "image": "377875505818.dkr.ecr.${var.region}.amazonaws.com/chronos-ops:latest",
   "essential": true,
   "logConfiguration": {
       "logDriver": "awslogs",
       "options": {
         "awslogs-group": "${aws_cloudwatch_log_group.pbswarn_scheduled_task_log_group.name}",
         "awslogs-region": "${var.region}",
         "awslogs-stream-prefix": "ecs"
       }
   },
   "secrets": [
     {
       "name": "MYSQL_PASSWORD",
       "valueFrom": "arn:aws:ssm:${var.region}:${var.aws_account_id}:parameter/PBSWARN/PBSWARN_DB_PASSWORD"
     }
   ],
   "command": [
     "/bin/sh -c \" mysqldump --single-transaction --max_allowed_packet=900M -u warn -h pbswarn-aurora-instance-0.c7se85sxbdyk.us-east-1.rds.amazonaws.com -p\"$MYSQL_PASSWORD\" warn | gzip -c > pbswarn_$(date +\"%d-%b-%Y\").dump.gz && ls -l && pwd && /root/.local/bin/aws s3 cp /pbswarn_$(date +\"%d-%b-%Y\").dump.gz s3://pbs.admin.backup/tools/pbswarn/pbswarn_$(date +\"%d-%b-%Y\").dump.gz --acl bucket-owner-full-control \""
     ],
   "entryPoint": [
     "sh",
     "-c"
     ]
  }
]
DEFINITION
}

resource "aws_cloudwatch_event_rule" "cloudwatch_rule" {
  name        = "pbswarn-db-dump"
  description = "pbswarn cloudwatch rule for scheduled task - Runs at 23:00 every day"

  #schedule_expression = "cron(0 23 * * ? *)"
  schedule_expression = "cron(0 23 * * ? *)"
}

resource "aws_cloudwatch_event_target" "cloudwatch_event_target" {
  rule      = "${aws_cloudwatch_event_rule.cloudwatch_rule.name}"
  target_id = "pbswarn-db-dump-target"
  arn       = "${aws_ecs_cluster.this.arn}"
  role_arn  = "${aws_iam_role.ecs_events.arn}"

  ecs_target = {
    task_count          = "1"
    task_definition_arn = "${aws_ecs_task_definition.pbswarn_postgres_dump.arn}"
    launch_type         = "FARGATE"
    platform_version    = "LATEST"

    network_configuration {
      security_groups  = ["${aws_security_group.pbswarn_inbound_lambda.id}"]
      subnets          = ["${var.private_subnets}"]
      assign_public_ip = false
    }
  }
}

### Execution role - required to pull the dockerfile write to Cloudwatch
resource "aws_iam_role" "ecs_execution" {
  name               = "ecs-execution-pbswarn"
  path               = "/"
  assume_role_policy = "${data.aws_iam_policy_document.ecs_execution.json}"
  description        = "This will allow ECS pbswarn to pull Dockerfile and write to Cloudwatch"
}

data "aws_iam_policy_document" "ecs_execution" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type = "Service"

      #identifiers = ["ec2.amazonaws.com"]
      #identifiers = ["ecs-tasks.amazonaws.com"]
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role = "${aws_iam_role.ecs_execution.name}"

  #policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# This seems to have been needed because of DB Dumps, shouldn't have been here? It should have been attached to some other role
# Fetching secret data from SSM Parameter Store in us-east-1: AccessDeniedException: User: arn:aws:sts::377875505818:assumed-role/ecs-execution-docs/c2f954191b2f454b8e36b1fbd8c07308
# is not authorized to perform: ssm:GetParameters on resource: arn:aws:ssm:us-east-1:377875505818:parameter/OPS/ATLASSIAN/DOCS/DOCS_JDBC_PASSWORD status code: 400, request id: d8f12cd2-3d7c-4623-bddb-e03e6797bdfb
resource "aws_iam_role_policy_attachment" "ecs_execution_ssm" {
  role       = "${aws_iam_role.ecs_execution.name}"
  policy_arn = "${aws_iam_policy.ecs_task.arn}"
}

###! Execution role - required to pull the dockerfile write to Cloudwatch

### Task role - what a container can do with the other different AWS services
resource "aws_iam_role" "ecs_task" {
  name               = "ecs-task-execution-pbswarn"
  path               = "/"
  assume_role_policy = "${data.aws_iam_policy_document.ecs-task-execution-pbswarn.json}"
}

data "aws_iam_policy_document" "ecs-task-execution-pbswarn" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type = "Service"

      #identifiers = ["ec2.amazonaws.com"]
      #identifiers = ["ecs-tasks.amazonaws.com"]
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "ecs_task" {
  name = "ecs-task-execution-pbswarn"

  #  path               = "/"
  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "ssm:GetParameters",
            "Resource": [
                "arn:aws:ssm:*:*:parameter/PBSWARN/PBSWARN_DB_PASSWORD"
            ]
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "attach_param_store" {
  role       = "${aws_iam_role.ecs_task.name}"
  policy_arn = "${aws_iam_policy.ecs_task.arn}"
}

resource "aws_iam_policy" "policy" {
  name        = "pbswarn-ssm-permissions"
  description = "Permissions for pbswarn to read from Parameter Store"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "ssm:GetParameters",
            "Resource": [
              "arn:aws:ssm:*:*:parameter/PBSWARN/PBSWARN_DB_PASSWORD"
            ]
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "attach-param-store-permissions" {
  role       = "${aws_iam_role.ecs_task.name}"
  policy_arn = "${aws_iam_policy.policy.arn}"
}

# Allow pbswarn to put DB dumps in S3 - pbs.admin.backup bucket
resource "aws_iam_policy" "db_dumps" {
  name        = "pbswarn-s3-permissions"
  description = "Permissions for pbswarn to put DB dumps into S3 - pbs.admin.backup bucket"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Stmt1553614187144",
      "Action": ["s3:PutObject","s3:PutObjectAcl"],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::pbs.admin.backup/tools/pbswarn/*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "attach_db_dumps" {
  role       = "${aws_iam_role.ecs_task.name}"
  policy_arn = "${aws_iam_policy.db_dumps.arn}"
}

###! Task role - what a container can do with the other different AWS services

# Required for scheduling tasks - https://www.terraform.io/docs/providers/aws/r/cloudwatch_event_target.html
resource "aws_iam_role" "ecs_events" {
  name = "pbswarn_ecs_events"

  assume_role_policy = <<DOC
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
DOC
}

resource "aws_iam_role_policy" "ecs_events_run_task_with_any_role" {
  name = "ecs_events_run_task_with_any_role"
  role = "${aws_iam_role.ecs_events.id}"

  policy = <<DOC
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "ecs:RunTask",
            "Resource": "${replace(aws_ecs_task_definition.pbswarn_postgres_dump.arn, "/:\\d+$/", ":*")}"
        }
    ]
}
DOC
}

############################################################################
# CloudWatch Logs
############################################################################
resource "aws_cloudwatch_log_group" "pbswarn_scheduled_task_log_group" {
  name              = "/ecs/pbswarn-db-dump"
  retention_in_days = 30

  tags {
    Name    = "pbswarn DB Dumps Logs"
    Creator = "Terraform"
  }
}

resource "aws_cloudwatch_log_stream" "pbswarn_scheduled_task_log_stream" {
  name           = "pbswarn-db-dump-stream"
  log_group_name = "${aws_cloudwatch_log_group.pbswarn_scheduled_task_log_group.name}"
}
