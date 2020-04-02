# The trick here is to create the DYNAMO DB TABLE and have a different state file
# This is in the other terraform manifests to be independed of the DYNAMODB state file from here
# Our mighty infrastructure provider
provider "aws" {
  region = "us-west-2"  # CHANGED THIS from us-east-1
  assume_role {
    role_arn     = "arn:aws:iam::751197549810:role/terraform"  # CHANGED THIS from "arn:aws:iam::050506831222:role/admin"
    session_name = "terraform-session"
    access_key = "AKIA25ZW46TZNTIK6ZFB"  # REMOVE THIS
    secret_key = "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" #REMOVE THIS
  }
}

# Creating the bucket

resource "aws_s3_bucket" "terraform_state" {
  bucket = "terraform-state-pbswarn-app"

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
    bucket         = "terraform-state-pbswarn-app"
    key            = "pbswarn-backend.tfstate"
    region         = "us-west-2" # CHANGED THIS from us-east-1
    encrypt        = true
    dynamodb_table = "terraform-pbswarn-lock"
    role_arn       = "arn:aws:iam::751197549810:role/terraform" # CHANGED THIS from arn:aws:iam::050506831222:role/admin"
  }
}
