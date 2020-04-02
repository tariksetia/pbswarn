# Create a unique ID for the production S3 bucket - this comes into play if you are routing to multiple sources
# Inspired from - https://blog.mikeauclair.com/blog/2018/10/16/simple-static-blog-terraform.html
locals {
  s3_origin_id = "S3-${aws_s3_bucket.pbswarn_files.bucket_regional_domain_name}"
}

# Create an identity for the cloudfront distribution - this lets us not open the S3 bucket to the world

resource "aws_cloudfront_origin_access_identity" "origin_access_identity" {
  comment = "access-identity-${aws_s3_bucket.pbswarn_files.bucket_regional_domain_name}.s3.amazonaws.com"
}

resource "aws_cloudfront_distribution" "distribution" {
  origin {
    domain_name = "${aws_s3_bucket.pbswarn_files.bucket_regional_domain_name}"
    origin_id   = "${local.s3_origin_id}"

    s3_origin_config {
      origin_access_identity = "${aws_cloudfront_origin_access_identity.origin_access_identity.cloudfront_access_identity_path}"
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["warn.pbs.org"]

  # Simple cache config, and toss all methods but GET and HEAD since we're just reading
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "${local.s3_origin_id}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Use the certificate we imported earlier, and use SNI so that we don't pay for dedicated IPs

  viewer_certificate {
    acm_certificate_arn      = "arn:aws:acm:us-east-1:050506831222:certificate/e833f8a1-0a7c-4fbb-9485-1ee8cef1fc31"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.1_2016"
  }
  tags = {
    Name    = "PBSWarn CF"
    Creator = "Terraform"
  }
  comment = "PBSWarn CF Distribution - CAT-16012"
}

# Add a policy onto the production bucket that lets the cloudfront identity we created earlier read from it
resource "aws_s3_bucket_policy" "cfread" {
  bucket = "${aws_s3_bucket.pbswarn_files.id}"

  policy = <<POLICY
{
  "Version": "2008-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
    {
      "Sid": "1",
      "Effect": "Allow",
      "Principal": {
        "AWS": "${aws_cloudfront_origin_access_identity.origin_access_identity.iam_arn}"
      },
      "Action": "s3:GetObject",
      "Resource": "${aws_s3_bucket.pbswarn_files.arn}/*"
    }
  ]
}
POLICY
}
