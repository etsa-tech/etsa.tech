---
author: ETSA
date: "2026-09-29"
eventDate: "2026-10-06"
eventLocation:
  address: 17 Market Square SUITE 101, Knoxville, TN 37902
  coordinates:
    lat: 35.965179
    lng: "-83.919846"
  name: Knoxville Entrepreneur Center
excerpt: Explore file descriptors, a fundamental UNIX abstraction that connects files, pipes, network sockets, and the UNIX philosophy of building programs that work together.
published: true
speakers:
  - bio: Robert French is the Grinch of computing. He hates it when your systems are up, and loves it when unplanned outages cause you to miss your kids' soccer games. His ideal morning involves waking up to news of major cyberattacks, outages, or general panic across the internet. He thinks Y2K was a disappointment, but is very excited about the Year 2038 Problem.
    company: Independent
    image: /images/speakers/robert-french.jpeg
    linkedIn: "https://www.linkedin.com/in/robertdanielfrench/"
    name: Robert French
    title: Security Researcher
  - bio: Somehow, James 'Jake' Wynne is a storage systems engineer at ORNL. He thinks tape is cool and flash is a fad, and thinks the way you do DevOps is wrong. Jake once deployed a single, custom 5000 line python script to production and it worked; it was basically glorified rsync. In his spare time, he does the same thing as he does at his job, but for fun. He's just out to have a good time and move some electrons. He is a Sagittarius and likes medium walks on the beach.
    company: Oak Ridge National Laboratory
    image: /images/speakers/jake-wynne.jpeg
    linkedIn: "https://www.linkedin.com/in/gpujake/"
    name: James 'Jake' Wynne
    title: HPC Storage Systems Engineer
tags:
  - UNIX
  - Linux
  - System Administration
  - File Descriptors
  - Operating Systems
title: "File Descriptors: The Heart and Soul of UNIX"
---

When you open a file, pipe a command, or bind to a network port, you are working with a "file descriptor." File descriptors are central to the UNIX philosophy, both in the "everything is a file" sense and the "write programs to work together" sense. In this talk, we will go under the hood to understand what these things actually are and how they facilitate every aspect of daily life on both UNIX and Penguin UNIX.
