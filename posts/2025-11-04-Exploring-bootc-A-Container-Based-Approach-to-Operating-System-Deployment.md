---
title: "Exploring bootc: A Container-Based Approach to Operating System Deployment"
date: "2025-11-03"
excerpt: >-
  Discover how bootc revolutionizes OS management by packaging entire operating systems as OCI containers—bringing atomic updates, rollbacks, and version control to infrastructure workflows.
tags:
  - bootc
  - Containers
  - Operating Systems
  - OCI
  - Infrastructure Management
  - Configuration Management
  - CI/CD
  - Atomic Updates
  - DevOps
  - Reproducibility
author: ETSA
speakers:
  - name: Jason Kincl
    title: Principal Specialist Solution Architect
    company: Red Hat
    image: /images/speakers/jason_kincl.jpg
    bio: >-
      Jason Kincl is a Solution Architect with 15+ years as a systems engineer in high performance computing. At Red Hat he specializes in helping organizations adopt containers and OpenShift to modernize their platforms and achieve their critical objectives.
    linkedIn: https://www.linkedin.com/in/jasonkincl/
eventDate: "2025-11-03"
published: true
---

Managing operating system deployments across many nodes and environments stubbornly remains challenging even in 2025. We have all solved this problem in one way or another with a combination of CI/CD and configuration management tools. Containers have become a de-facto component in every environment and with it an entire ecosystem of tools and technologies has grown up around the technology to help manage it. This presentation examines bootc, yet another tool in the container ecosystem that packages operating systems as OCI containers to simplify infrastructure management. We'll explore how bootc enables atomic OS updates, rollbacks, and version control similar to container workflows. We'll discuss how it leverages the entire ecosystem for better configuration management and reproducibility in distributed environments. We will also talk a look at some practical examples that will demonstrate bootc deployments in test environments and compare to traditional provisioning methods.
