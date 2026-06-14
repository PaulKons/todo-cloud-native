# Cloud Native To-Do Application

This project implements a cloud-native To-Do / Notes / Reminder application using Kubernetes, serverless functions, asynchronous messaging, object storage, monitoring, automation, and GitOps CI/CD.

The application was developed as part of the **Cloud Native Applications** semester project.

---

## 1. Project Overview

The original application was extended into a cloud-native system with multiple independent components:

- React frontend
- Express.js backend API
- MongoDB Atlas database
- RabbitMQ message broker
- MinIO object storage
- Background workers
- Knative serverless notification function
- Prometheus monitoring
- Grafana dashboards
- Jenkins CI pipeline
- ArgoCD GitOps deployment
- Ansible automation

The system runs locally on a MicroK8s Kubernetes cluster.

---

## 2. Architecture

````markdown
```mermaid
flowchart TD
    U["User"] --> FE["React Frontend"]
    FE --> BE["Express Backend API"]

    BE --> DB[("MongoDB Atlas")]
    BE --> MQ[("RabbitMQ")]
    BE --> OS[("MinIO Object Storage")]

    MQ --> AP["Attachment Processor"]
    MQ --> RW["Reminder Worker"]

    AP --> DB
    AP --> OS

    RW --> KF["Knative Notification Function"]
    KF --> RW
    RW --> DB

    BE --> MET["Backend metrics endpoint"]
    MET --> PR["Prometheus"]
    PR --> GR["Grafana"]

    GH["GitHub Repository"] --> JE["Jenkins CI"]
    JE --> REG["MicroK8s Local Registry"]
    JE --> GH

    GH --> AR["ArgoCD"]
    AR --> K8S["MicroK8s Cluster"]
