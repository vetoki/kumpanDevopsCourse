terraform {
  source = "./terraform"
}

locals {
  region  = "eu-north-1"
  profile = "kumpan-devops"
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket  = "btlc-kumpan-devops-tf"
    key     = "kumpan-kurs/${path_relative_to_include()}/terraform.tfstate"
    region  = local.region
    profile = local.profile
  }
}

inputs = {
  aws_region  = local.region
  aws_profile = local.profile
  environment = "dev"

  repository_name = "assignment3/vetoki"
  image_tag_mutability = "MUTABLE"
  scan_on_push = true
  encryption_type = "AES256"
  force_delete = true

  # Optional: Add a lifecycle policy to clean up untagged images
  lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 2 untagged images"
        selection = {
          tagStatus     = "untagged"
          countType     = "imageCountMoreThan"
          countNumber   = 2
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
