resource "aws_s3_bucket" "pbswarn_files" {
  bucket = "pbswarn-app-code"
  acl    = "public-read"

  cors_rule {
    allowed_headers = ["Authorization", "Content-Type", "Origin", "X-Requested-With"]
    allowed_methods = ["GET", "POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  website {
    index_document = "index.html"
  }

  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "PBSWarn static resources - Created by terraform"
  }
}

resource "aws_s3_bucket_policy" "this" {
  bucket = "${aws_s3_bucket.pbswarn_files.id}"

  policy = <<POLICY
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AddPerm",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::pbswarn-app-code/*"
        }
    ]
}
POLICY
}
