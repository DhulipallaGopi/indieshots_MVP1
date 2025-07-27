# Terraform configuration for IndieShots GCP deployment
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "The name of the Cloud Run service"
  type        = string
  default     = "indieshots"
}

variable "image_url" {
  description = "The container image URL"
  type        = string
  default     = "gcr.io/PROJECT_ID/indieshots:latest"
}

# Secrets
variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "firebase_api_key" {
  description = "Firebase API key"
  type        = string
  sensitive   = true
}

variable "firebase_project_id" {
  description = "Firebase Project ID"
  type        = string
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "cloud_run_api" {
  service = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_build_api" {
  service = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secret_manager_api" {
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "container_registry_api" {
  service = "containerregistry.googleapis.com"
  disable_on_destroy = false
}

# Create secrets
resource "google_secret_manager_secret" "database_url" {
  secret_id = "database-url"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.secret_manager_api]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "openai-api-key"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.secret_manager_api]
}

resource "google_secret_manager_secret_version" "openai_api_key" {
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.secret_manager_api]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "firebase-api-key"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.secret_manager_api]
}

resource "google_secret_manager_secret_version" "firebase_api_key" {
  secret      = google_secret_manager_secret.firebase_api_key.id
  secret_data = var.firebase_api_key
}

resource "google_secret_manager_secret" "firebase_project_id" {
  secret_id = "firebase-project-id"
  
  replication {
    automatic = true
  }
  
  depends_on = [google_project_service.secret_manager_api]
}

resource "google_secret_manager_secret_version" "firebase_project_id" {
  secret      = google_secret_manager_secret.firebase_project_id.id
  secret_data = var.firebase_project_id
}

# Cloud Run service
resource "google_cloud_run_service" "indieshots" {
  name     = var.service_name
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "autoscaling.knative.dev/minScale" = "0"
        "run.googleapis.com/cpu-throttling" = "true"
      }
    }

    spec {
      container_concurrency = 80
      timeout_seconds      = 300
      
      containers {
        image = replace(var.image_url, "PROJECT_ID", var.project_id)
        
        ports {
          container_port = 8080
        }
        
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name  = "PORT"
          value = "8080"
        }
        
        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.database_url.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "OPENAI_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.openai_api_key.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.jwt_secret.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "VITE_FIREBASE_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_api_key.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "VITE_FIREBASE_PROJECT_ID"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_project_id.secret_id
              key  = "latest"
            }
          }
        }
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "1Gi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.cloud_run_api,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.openai_api_key,
    google_secret_manager_secret_version.jwt_secret,
    google_secret_manager_secret_version.firebase_api_key,
    google_secret_manager_secret_version.firebase_project_id,
  ]
}

# Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "allUsers" {
  service  = google_cloud_run_service.indieshots.name
  location = google_cloud_run_service.indieshots.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "service_url" {
  value = google_cloud_run_service.indieshots.status[0].url
  description = "The URL of the deployed Cloud Run service"
}

output "service_name" {
  value = google_cloud_run_service.indieshots.name
  description = "The name of the Cloud Run service"
}