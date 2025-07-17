---
title: "Building Robust Monitoring with Prometheus and Grafana"
date: "2023-11-20"
excerpt: "Learn how to implement comprehensive monitoring and observability for your infrastructure using Prometheus, Grafana, and modern observability practices."
tags: ["Monitoring", "Prometheus", "Grafana", "Observability", "DevOps", "SRE"]
author: "ETSA"
speakers:
  - name: "Alex Thompson"
    title: "Site Reliability Engineer"
    company: "DataStream Technologies"
    bio: "Alex is an SRE with 6+ years of experience building and maintaining large-scale distributed systems. They specialize in observability, incident response, and building reliable systems that scale."
    image: "/images/speakers/alex-thompson.jpg"
    linkedIn: "https://linkedin.com/in/alex-thompson-sre"
    github: "https://github.com/alexthompson"
presentationTitle: "Building Robust Monitoring with Prometheus and Grafana"
presentationDescription: "A deep dive into modern monitoring practices using the Prometheus ecosystem"
presentationSlides: "https://slides.example.com/prometheus-monitoring"
recordingUrl: "https://youtube.com/watch?v=prometheus-recording-2023"
eventDate: "2023-11-20"
eventLocation: "Knoxville Convention Center"
featured: false
published: true
---

# Building Robust Monitoring with Prometheus and Grafana

In today's complex distributed systems, monitoring and observability are not just nice-to-haves—they're essential for maintaining reliable services. This presentation covered how to build a comprehensive monitoring solution using Prometheus and Grafana.

## The Three Pillars of Observability

### 1. Metrics

Numerical data that changes over time (CPU usage, request rate, error count)

### 2. Logs

Discrete events that happened at a specific time

### 3. Traces

The journey of a request through your system

## Why Prometheus?

Prometheus has become the de facto standard for metrics collection because of:

- **Pull-based model**: Prometheus scrapes metrics from targets
- **Powerful query language**: PromQL for flexible data analysis
- **Service discovery**: Automatic target discovery
- **Alerting**: Built-in alerting with Alertmanager
- **Ecosystem**: Rich ecosystem of exporters and integrations

## Prometheus Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Target    │    │   Target    │    │   Target    │
│ Application │    │   Database  │    │   Server    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │ HTTP /metrics     │                   │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │ Prometheus  │
                    │   Server    │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │   Grafana   │
                    │  Dashboard  │
                    └─────────────┘
```

## Setting Up Prometheus

### Basic Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["localhost:9100"]

  - job_name: "application"
    static_configs:
      - targets: ["app1:8080", "app2:8080"]
    metrics_path: /metrics
    scrape_interval: 5s
```

### Docker Compose Setup

```yaml
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.console.libraries=/etc/prometheus/console_libraries"
      - "--web.console.templates=/etc/prometheus/consoles"
      - "--storage.tsdb.retention.time=200h"
      - "--web.enable-lifecycle"

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.rootfs=/rootfs"
      - "--path.sysfs=/host/sys"
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"

volumes:
  prometheus_data:
  grafana_data:
```

## Instrumenting Applications

### Go Application Example

```go
package main

import (
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "Duration of HTTP requests",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )

    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(activeConnections)
}

func instrumentHandler(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Increment active connections
        activeConnections.Inc()
        defer activeConnections.Dec()

        // Call the actual handler
        next(w, r)

        // Record metrics
        duration := time.Since(start).Seconds()
        httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
        httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, "200").Inc()
    }
}

func main() {
    http.HandleFunc("/", instrumentHandler(func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello, World!"))
    }))

    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

### Python Application Example

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import random

# Define metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')
ACTIVE_USERS = Gauge('active_users', 'Number of active users')

def process_request():
    """Simulate processing a request"""
    REQUEST_COUNT.labels(method='GET', endpoint='/api/users').inc()

    with REQUEST_LATENCY.time():
        # Simulate work
        time.sleep(random.uniform(0.1, 0.5))

    # Update active users
    ACTIVE_USERS.set(random.randint(10, 100))

if __name__ == '__main__':
    # Start metrics server
    start_http_server(8000)

    # Simulate requests
    while True:
        process_request()
        time.sleep(1)
```

## Essential PromQL Queries

### Basic Queries

```promql
# Current CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# HTTP request rate
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

### Advanced Queries

```promql
# Predict disk full time (linear regression)
predict_linear(node_filesystem_free_bytes[1h], 4 * 3600) < 0

# Top 5 endpoints by request count
topk(5, sum(rate(http_requests_total[5m])) by (endpoint))

# Service availability (uptime percentage)
avg_over_time(up[24h]) * 100

# Alert on high error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
```

## Alerting with Alertmanager

### Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: system_alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for more than 5 minutes"

      - alert: DiskSpaceLow
        expr: (node_filesystem_free_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Disk space is running low"
          description: "Disk space is below 10% on {{ $labels.instance }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} on {{ $labels.instance }} is down"

  - name: application_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for {{ $labels.job }}"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 500ms"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: "localhost:587"
  smtp_from: "alerts@company.com"

route:
  group_by: ["alertname"]
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: "web.hook"
  routes:
    - match:
        severity: critical
      receiver: "critical-alerts"
    - match:
        severity: warning
      receiver: "warning-alerts"

receivers:
  - name: "web.hook"
    webhook_configs:
      - url: "http://127.0.0.1:5001/"

  - name: "critical-alerts"
    email_configs:
      - to: "oncall@company.com"
        subject: "CRITICAL: {{ .GroupLabels.alertname }}"
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: "YOUR_SLACK_WEBHOOK_URL"
        channel: "#alerts"
        title: "CRITICAL Alert"
        text: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"

  - name: "warning-alerts"
    email_configs:
      - to: "team@company.com"
        subject: "WARNING: {{ .GroupLabels.alertname }}"
```

## Grafana Dashboards

### Essential Dashboard Panels

1. **System Overview**

   - CPU usage
   - Memory usage
   - Disk usage
   - Network I/O

2. **Application Metrics**

   - Request rate
   - Response time
   - Error rate
   - Active users

3. **Infrastructure Health**
   - Service uptime
   - Database connections
   - Queue depth
   - Cache hit rate

### Dashboard as Code

```json
{
  "dashboard": {
    "title": "System Overview",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 70 },
                { "color": "red", "value": 90 }
              ]
            }
          }
        }
      }
    ]
  }
}
```

## Best Practices

### 1. Metric Design

- Use consistent naming conventions
- Include relevant labels
- Avoid high cardinality
- Use appropriate metric types

### 2. Alert Design

- Alert on symptoms, not causes
- Make alerts actionable
- Avoid alert fatigue
- Use appropriate severity levels

### 3. Dashboard Design

- Focus on user experience
- Use appropriate visualizations
- Include context and documentation
- Organize logically

### 4. Performance Optimization

- Use recording rules for expensive queries
- Implement proper retention policies
- Monitor Prometheus itself
- Use federation for large deployments

## Common Exporters

### Infrastructure

- **Node Exporter**: System metrics
- **Blackbox Exporter**: Endpoint monitoring
- **SNMP Exporter**: Network devices

### Databases

- **MySQL Exporter**: MySQL metrics
- **PostgreSQL Exporter**: PostgreSQL metrics
- **Redis Exporter**: Redis metrics

### Applications

- **JMX Exporter**: Java applications
- **.NET Exporter**: .NET applications
- **Custom exporters**: Application-specific metrics

## Troubleshooting Common Issues

### High Memory Usage

```bash
# Check series count
curl http://localhost:9090/api/v1/label/__name__/values | jq '.data | length'

# Find high cardinality metrics
curl -s http://localhost:9090/api/v1/label/__name__/values | jq -r '.data[]' | while read metric; do
  count=$(curl -s "http://localhost:9090/api/v1/query?query=count+by+(__name__)({__name__=\"$metric\"})" | jq -r '.data.result[0].value[1]')
  echo "$metric: $count"
done | sort -k2 -nr | head -10
```

### Slow Queries

```promql
# Check query performance
prometheus_engine_query_duration_seconds{quantile="0.9"}

# Identify expensive queries
topk(10, prometheus_engine_query_duration_seconds)
```

## Conclusion

Effective monitoring with Prometheus and Grafana requires:

1. **Proper instrumentation**: Instrument your applications with meaningful metrics
2. **Smart alerting**: Alert on what matters and make alerts actionable
3. **Useful dashboards**: Create dashboards that help with troubleshooting
4. **Continuous improvement**: Regularly review and improve your monitoring

Remember: The goal is not to collect all possible metrics, but to collect the right metrics that help you understand and improve your systems.

---

_This presentation was delivered at the ETSA November 2023 meetup. For hands-on examples and configuration files, visit our [GitHub repository](https://github.com/etsa-tech/prometheus-examples)._
