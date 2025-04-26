terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

resource "aws_ecr_repository" "repo" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.kms_key_arn
  }

  force_delete = var.force_delete
}

resource "aws_ecr_lifecycle_policy" "policy" {
  count      = var.lifecycle_policy != null ? 1 : 0
  repository = aws_ecr_repository.repo.name

  policy = var.lifecycle_policy
}

resource "aws_ecr_repository_policy" "policy" {
  count      = var.repository_policy != null ? 1 : 0
  repository = aws_ecr_repository.repo.name
  policy     = var.repository_policy
}
