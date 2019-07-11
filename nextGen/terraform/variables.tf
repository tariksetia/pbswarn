variable "region" {
  default = "us-east-1"
}

variable "aws_account_id" {
  default = "476543043875"
}

variable "vpc" {
  default = "vpc-08d178bb08318eddf"
}

variable "private_subnets" {
  type    = "list"
  default = ["subnet-01e5fddd8a3ddf14f", "subnet-069571f0fdbbcf8cd"]
}

variable "public_subnets" {
  type    = "list"
  default = ["subnet-03ce5e3795883f58e", "subnet-086ee730e782f5533"]
}

# variable "private_subnet_1" {
#   default = "subnet-01e5fddd8a3ddf14f"
# }


# variable "private_subnet_2" {
#   default = "subnet-069571f0fdbbcf8cd"
# }

