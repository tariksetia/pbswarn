provider "aws" {
  region = "${var.region}"

  assume_role {
    role_arn     = "arn:aws:iam::<replace_with_your account>:role/admin"
    session_name = "terraform-session"
  }
}

# Storing the terraform state in S3 - BEAWARE THIS HAS THE bucket name hardcoded
terraform {
  backend "s3" {
    bucket         = "<replace_with_your_bucket>"
    key            = "pbswarn-application.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-pbswarn-lock"
    role_arn       = "arn:aws:iam::<replace_with_your account>:role/admin"
    session_name   = "terraform-session"
  }
}
