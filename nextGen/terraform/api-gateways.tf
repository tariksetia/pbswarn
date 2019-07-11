# Api Gateway - 1 for receiving POST messages

resource "aws_api_gateway_rest_api" "in_api" {
  name        = "pbswarn-in"
  description = "Proxy to handle POST requests to our Lambda function"
}

# resource "aws_api_gateway_resource" "resource" {
#   rest_api_id = "${aws_api_gateway_rest_api.api.id}"
#   parent_id   = "${aws_api_gateway_rest_api.api.root_resource_id}"
#   path_part   = "{proxy+}"
# }
resource "aws_api_gateway_method" "in_method" {
  rest_api_id   = "${aws_api_gateway_rest_api.in_api.id}"
  resource_id   = "${aws_api_gateway_rest_api.in_api.root_resource_id}"
  http_method   = "POST"
  authorization = "NONE"

  #   request_parameters = {
  #     "method.request.path.proxy" = false
  #   }
}

resource "aws_api_gateway_integration" "in_integration" {
  rest_api_id             = "${aws_api_gateway_rest_api.in_api.id}"
  resource_id             = "${aws_api_gateway_rest_api.in_api.root_resource_id}"
  http_method             = "${aws_api_gateway_method.in_method.http_method}"
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/${aws_lambda_function.warn_in.arn}/invocations"
  content_handling        = "CONVERT_TO_TEXT"

  #   request_parameters =  {
  #     "integration.request.path.proxy" = "method.request.path.proxy"
  #   }
}

resource "aws_api_gateway_integration_response" "in_integration_response" {
  rest_api_id = "${aws_api_gateway_rest_api.in_api.id}"
  resource_id = "${aws_api_gateway_rest_api.in_api.root_resource_id}"
  http_method = "${aws_api_gateway_method.in_method.http_method}"
  status_code = 200

  response_templates = {
    "application/json" = ""
  }
}

resource "aws_lambda_permission" "in" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.warn_in.function_name}"
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:aws:execute-api:${var.region}:${var.aws_account_id}:${aws_api_gateway_rest_api.in_api.id}/*/${aws_api_gateway_method.in_method.http_method}" # ${aws_api_gateway_rest_api.in_api.root_resource_id}"
}

resource "aws_api_gateway_stage" "in" {
  rest_api_id   = "${aws_api_gateway_rest_api.in_api.id}"
  stage_name    = "prod"
  deployment_id = "${aws_api_gateway_deployment.in.id}"
}

# ALWAYS Forcing a new deploy here - because changes made previously to any API GW components isn't deemed to have a deploy ;(
resource "aws_api_gateway_deployment" "in" {
  depends_on  = ["aws_api_gateway_integration.in_integration"]
  rest_api_id = "${aws_api_gateway_rest_api.in_api.id}"
  stage_name  = "prod"

  variables {
    deployed_at = "${timestamp()}"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# resource "aws_api_gateway_method_response" "200" {
#   rest_api_id = "${aws_api_gateway_rest_api.in_api.id}"
#   resource_id = "${aws_api_gateway_rest_api.in_api.root_resource_id}"
#   http_method = "${aws_api_gateway_method.in_method.http_method}"
#   status_code = "200"
#   #response_parameters = {"method.response.header.HTTP Status" = true}
#   #response_parameters = { "method.response.header.X-Some-Header" = true }
# }

###! Api Gateway - 1 for receiving POST messages

# Api Gateway - 2  for responding to GET messages

resource "aws_api_gateway_rest_api" "out_api" {
  name        = "pbswarn-out"
  description = "Handles GET requests to our Lambda function"
}

resource "aws_api_gateway_resource" "out" {
  rest_api_id = "${aws_api_gateway_rest_api.out_api.id}"
  parent_id   = "${aws_api_gateway_rest_api.out_api.root_resource_id}"
  path_part   = "map"
}

# resource "aws_api_gateway_resource" "out_for_get" {
#   rest_api_id = "${aws_api_gateway_rest_api.out_api.id}"
#   parent_id   = "${aws_api_gateway_rest_api.out_api.root_resource_id}"
#   #path   = ""
#   path_part = " "
# }

resource "aws_api_gateway_method" "out" {
  rest_api_id   = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id   = "${aws_api_gateway_rest_api.out_api.root_resource_id}"
  http_method   = "GET"
  authorization = "NONE"

  #   request_parameters = {
  #     "method.request.path.proxy" = false
  #   }
}

resource "aws_api_gateway_method" "map_out" {
  rest_api_id   = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id   = "${aws_api_gateway_resource.out.id}"
  http_method   = "ANY"
  authorization = "NONE"

  #   request_parameters = {
  #     "method.request.path.proxy" = false
  #   }
}

resource "aws_api_gateway_integration" "out_integration" {
  rest_api_id             = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id             = "${aws_api_gateway_resource.out.id}"
  http_method             = "${aws_api_gateway_method.map_out.http_method}"
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/${aws_lambda_function.warn_out.arn}/invocations"
  content_handling        = "CONVERT_TO_TEXT"

  #  content_handling = "CONVERT_TO_TEXT"

  #   request_parameters =  {
  #     "integration.request.path.proxy" = "method.request.path.proxy"
  #   }
}

resource "aws_api_gateway_integration" "out_integration_for_get" {
  rest_api_id             = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id             = "${aws_api_gateway_rest_api.out_api.root_resource_id}"
  http_method             = "${aws_api_gateway_method.out.http_method}"
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/${aws_lambda_function.warn_out.arn}/invocations"
  content_handling        = "CONVERT_TO_TEXT"

  #  content_handling = "CONVERT_TO_TEXT"

  #   request_parameters =  {
  #     "integration.request.path.proxy" = "method.request.path.proxy"
  #   }
}

resource "aws_api_gateway_integration_response" "out_integration_response_for_get" {
  rest_api_id = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id = "${aws_api_gateway_rest_api.out_api.root_resource_id}"
  http_method = "${aws_api_gateway_method.out.http_method}"
  status_code = 200

  response_templates = {
    "application/json" = ""
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "out_integration_response" {
  rest_api_id = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id = "${aws_api_gateway_resource.out.id}"
  http_method = "${aws_api_gateway_method.map_out.http_method}"
  status_code = 200

  response_templates = {
    "application/json" = ""
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}

resource "aws_api_gateway_method_response" "200_out" {
  rest_api_id = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id = "${aws_api_gateway_resource.out.id}"
  http_method = "${aws_api_gateway_method.map_out.http_method}"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = false
  }
}

resource "aws_api_gateway_method_response" "200_out_for_get" {
  rest_api_id = "${aws_api_gateway_rest_api.out_api.id}"
  resource_id = "${aws_api_gateway_rest_api.out_api.root_resource_id}"
  http_method = "${aws_api_gateway_method.out.http_method}"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = false
  }
}

resource "aws_lambda_permission" "out" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.warn_out.function_name}"
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:aws:execute-api:${var.region}:${var.aws_account_id}:${aws_api_gateway_rest_api.out_api.id}/*/${aws_api_gateway_method.out.http_method}"
}

resource "aws_api_gateway_stage" "out" {
  rest_api_id   = "${aws_api_gateway_rest_api.out_api.id}"
  stage_name    = "prod"
  deployment_id = "${aws_api_gateway_deployment.out.id}"
}

# ALWAYS Forcing a new deploy here - because changes made previously to any API GW components isn't deemed to have a deploy ;(
resource "aws_api_gateway_deployment" "out" {
  depends_on  = ["aws_api_gateway_integration.out_integration_for_get"]
  rest_api_id = "${aws_api_gateway_rest_api.out_api.id}"
  stage_name  = "prod"

  variables {
    deployed_at = "${timestamp()}"
  }

  lifecycle {
    create_before_destroy = true
  }
}

###! Api Gateway - 2  for responding to GET messages

