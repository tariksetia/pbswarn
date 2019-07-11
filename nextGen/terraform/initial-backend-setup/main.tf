# The trick here is to create the DYNAMO DB TABLE and have a different state file
# This is in the other terraform manifests to be independed of the DYNAMODB state file from here
# Our mighty infrastructure provider
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::<replace_with_your account>:role/admin"
    session_name = "terraform-session"
  }
}

# Creating the bucket

resource "aws_s3_bucket" "terraform_state" {
  bucket = "<replace_with_your_bucket>"

  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Setting terraform state locks
resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "terraform-pbswarn-lock"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

# Storing the terraform state in S3 - BEAWARE THIS HAS THE bucket name hardcoded
terraform {
  backend "s3" {
    bucket         = "<replace_with_your_bucket>"
    key            = "pbswarn-backend.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-pbswarn-lock"
    role_arn       = "arn:aws:iam::<replace_with_your account>:role/admin"
  }
}
