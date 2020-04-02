# Lambbda Function 1 for receiving POST messages - associated with the FIRST api Gateway

resource "aws_lambda_function" "warn_in" {
  function_name    = "warn-in"
  handler          = "index.handler"
  runtime          = "nodejs8.10"
  filename         = "warn_in.zip"
  source_code_hash = "${base64sha256(file("warn_in.zip"))}"
  description      = "Receives POST messages from API gateway: ${aws_api_gateway_rest_api.in_api.name}"
  role             = "${aws_iam_role.lambda_exec_role.arn}"

  vpc_config {
    subnet_ids         = ["${var.public_subnets}"]
    security_group_ids = ["${aws_security_group.pbswarn_inbound_lambda.id}"]
  }
}

resource "aws_lambda_function" "warn_out" {
  function_name    = "warn-out"
  handler          = "index.handler"
  runtime          = "nodejs8.10"
  filename         = "warn_out.zip"
  source_code_hash = "${base64sha256(file("warn_out.zip"))}"
  description      = "Receives GET messages from API gateway: ${aws_api_gateway_rest_api.out_api.name}"
  role             = "${aws_iam_role.lambda_exec_role.arn}"
  timeout          = 15

  vpc_config {
    subnet_ids         = ["${var.public_subnets}"]
    security_group_ids = ["${aws_security_group.pbswarn_inbound_lambda.id}"]
  }
}

# Lambda Role
resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda_exec_role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": ["lambda.amazonaws.com", "apigateway.amazonaws.com"]
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "lambda" {
  name = "pbswarn-lambda-execution"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": [
                "arn:aws:logs:*:*:*"
            ]
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "ec2_permissions" {
  role = "${aws_iam_role.lambda_exec_role.name}"

  #policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}

resource "aws_iam_role_policy_attachment" "attach_permission" {
  role       = "${aws_iam_role.lambda_exec_role.name}"
  policy_arn = "${aws_iam_policy.lambda.arn}"
}

resource "aws_security_group" "pbswarn_inbound_lambda" {
  name        = "pbswarn-inbound-lambda"
  description = "Allow traffic into PBSWarn lambdas"
  vpc_id      = "${var.vpc}"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags {
    Name    = "pbswarn-inbound-lambda"
    Creator = "Terraform"
  }
}
