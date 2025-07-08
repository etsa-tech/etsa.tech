---
title: "Ansible Automation: Simplifying Configuration Management"
date: "2023-10-15"
excerpt: "Discover how to automate your infrastructure management with Ansible, from basic playbooks to advanced automation patterns and best practices."
tags: ["Ansible", "Automation", "Configuration Management", "DevOps", "Infrastructure"]
author: "ETSA"
speakerName: "Jennifer Park"
speakerTitle: "DevOps Engineer"
speakerCompany: "AutoScale Solutions"
speakerBio: "Jennifer has been automating infrastructure for 7+ years and is passionate about making complex systems simple. She's an Ansible contributor and has helped numerous organizations adopt infrastructure automation."
speakerLinkedIn: "https://linkedin.com/in/jennifer-park-devops"
speakerGitHub: "https://github.com/jpark"
presentationTitle: "Ansible Automation: Simplifying Configuration Management"
presentationDescription: "Learn how to automate infrastructure management with Ansible playbooks and best practices"
presentationSlides: "https://slides.example.com/ansible-automation"
eventDate: "2023-10-15"
eventLocation: "Knoxville Public Library"
featured: false
published: true
---

# Ansible Automation: Simplifying Configuration Management

Configuration management is a critical aspect of modern infrastructure operations. In this session, we explored how Ansible can help automate and standardize your infrastructure management processes, making them more reliable and repeatable.

## What is Ansible?

Ansible is an open-source automation tool that simplifies:
- **Configuration Management**: Ensure systems are configured correctly
- **Application Deployment**: Deploy applications consistently
- **Task Automation**: Automate repetitive operational tasks
- **Orchestration**: Coordinate complex multi-system workflows

### Key Benefits

- **Agentless**: No software to install on managed nodes
- **Simple**: Uses YAML for easy-to-read playbooks
- **Powerful**: Extensive module library
- **Idempotent**: Safe to run multiple times
- **Flexible**: Works with any infrastructure

## Getting Started with Ansible

### Installation

```bash
# Install Ansible
pip install ansible

# Verify installation
ansible --version

# Install additional collections
ansible-galaxy collection install community.general
ansible-galaxy collection install ansible.posix
```

### Basic Inventory

```ini
# inventory.ini
[webservers]
web1.example.com
web2.example.com
web3.example.com

[databases]
db1.example.com
db2.example.com

[production:children]
webservers
databases

[production:vars]
ansible_user=admin
ansible_ssh_private_key_file=~/.ssh/production.pem
```

### Your First Playbook

```yaml
# site.yml
---
- name: Configure web servers
  hosts: webservers
  become: yes
  vars:
    nginx_port: 80
    app_user: webapp
  
  tasks:
    - name: Install nginx
      package:
        name: nginx
        state: present
    
    - name: Start and enable nginx
      service:
        name: nginx
        state: started
        enabled: yes
    
    - name: Create application user
      user:
        name: "{{ app_user }}"
        system: yes
        shell: /bin/false
    
    - name: Copy nginx configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        backup: yes
      notify: restart nginx
  
  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

## Ansible Concepts

### Modules

Ansible modules are the building blocks of playbooks:

```yaml
# File operations
- name: Create directory
  file:
    path: /opt/myapp
    state: directory
    mode: '0755'

# Package management
- name: Install packages
  package:
    name:
      - git
      - python3
      - nodejs
    state: present

# Service management
- name: Start application service
  systemd:
    name: myapp
    state: started
    enabled: yes
    daemon_reload: yes

# Command execution
- name: Run custom script
  command: /opt/scripts/deploy.sh
  args:
    chdir: /opt/myapp
  register: deploy_result

# Template rendering
- name: Generate config file
  template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    owner: myapp
    group: myapp
    mode: '0644'
```

### Variables and Facts

```yaml
# Group variables (group_vars/webservers.yml)
---
nginx_worker_processes: 4
nginx_worker_connections: 1024
ssl_certificate: /etc/ssl/certs/example.com.crt
ssl_private_key: /etc/ssl/private/example.com.key

# Host variables (host_vars/web1.example.com.yml)
---
server_id: 1
backup_enabled: true

# Using variables in playbooks
- name: Configure nginx
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  vars:
    nginx_user: www-data
    nginx_pid: /var/run/nginx.pid

# Gathering facts
- name: Display system information
  debug:
    msg: "{{ ansible_hostname }} is running {{ ansible_distribution }} {{ ansible_distribution_version }}"
```

### Templates (Jinja2)

```jinja2
{# nginx.conf.j2 #}
user {{ nginx_user }};
worker_processes {{ nginx_worker_processes }};
pid {{ nginx_pid }};

events {
    worker_connections {{ nginx_worker_connections }};
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    {% for server in nginx_servers %}
    server {
        listen {{ server.port }};
        server_name {{ server.name }};
        
        {% if server.ssl_enabled %}
        ssl_certificate {{ ssl_certificate }};
        ssl_certificate_key {{ ssl_private_key }};
        {% endif %}
        
        location / {
            proxy_pass http://{{ server.backend }};
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    {% endfor %}
}
```

## Advanced Ansible Features

### Roles

Organize your automation with roles:

```
roles/
├── webserver/
│   ├── tasks/
│   │   └── main.yml
│   ├── handlers/
│   │   └── main.yml
│   ├── templates/
│   │   └── nginx.conf.j2
│   ├── files/
│   │   └── index.html
│   ├── vars/
│   │   └── main.yml
│   ├── defaults/
│   │   └── main.yml
│   └── meta/
│       └── main.yml
```

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install web server packages
  package:
    name: "{{ webserver_packages }}"
    state: present

- name: Configure web server
  template:
    src: "{{ webserver_config_template }}"
    dest: "{{ webserver_config_path }}"
  notify: restart webserver

- name: Deploy application files
  copy:
    src: "{{ item }}"
    dest: "{{ webserver_document_root }}/"
  with_fileglob:
    - "files/*"

# Using roles in playbooks
---
- name: Deploy web application
  hosts: webservers
  roles:
    - common
    - webserver
    - monitoring
```

### Conditionals and Loops

```yaml
# Conditionals
- name: Install package on RedHat family
  yum:
    name: httpd
    state: present
  when: ansible_os_family == "RedHat"

- name: Install package on Debian family
  apt:
    name: apache2
    state: present
  when: ansible_os_family == "Debian"

# Loops
- name: Create multiple users
  user:
    name: "{{ item.name }}"
    groups: "{{ item.groups }}"
    state: present
  loop:
    - { name: alice, groups: "wheel,developers" }
    - { name: bob, groups: "developers" }
    - { name: charlie, groups: "wheel" }

# Loop with conditions
- name: Install development packages
  package:
    name: "{{ item }}"
    state: present
  loop: "{{ dev_packages }}"
  when: environment == "development"
```

### Error Handling

```yaml
# Ignore errors
- name: Attempt to start service
  service:
    name: myservice
    state: started
  ignore_errors: yes

# Handle failures
- name: Download application
  get_url:
    url: "{{ app_download_url }}"
    dest: /tmp/app.tar.gz
  register: download_result
  failed_when: download_result.status_code != 200

# Rescue and always blocks
- name: Deploy application
  block:
    - name: Stop application
      service:
        name: myapp
        state: stopped
    
    - name: Deploy new version
      unarchive:
        src: /tmp/app.tar.gz
        dest: /opt/myapp
        remote_src: yes
  
  rescue:
    - name: Rollback on failure
      command: /opt/scripts/rollback.sh
  
  always:
    - name: Start application
      service:
        name: myapp
        state: started
```

## Real-World Examples

### Web Server Deployment

```yaml
---
- name: Deploy LAMP stack
  hosts: webservers
  become: yes
  vars:
    mysql_root_password: "{{ vault_mysql_root_password }}"
    app_domain: example.com
  
  tasks:
    - name: Install LAMP packages
      package:
        name:
          - apache2
          - mysql-server
          - php
          - php-mysql
          - libapache2-mod-php
        state: present
    
    - name: Configure MySQL root password
      mysql_user:
        name: root
        password: "{{ mysql_root_password }}"
        login_unix_socket: /var/run/mysqld/mysqld.sock
    
    - name: Create application database
      mysql_db:
        name: webapp
        state: present
        login_user: root
        login_password: "{{ mysql_root_password }}"
    
    - name: Enable Apache modules
      apache2_module:
        name: "{{ item }}"
        state: present
      loop:
        - rewrite
        - ssl
      notify: restart apache
    
    - name: Deploy application code
      git:
        repo: https://github.com/company/webapp.git
        dest: /var/www/html
        version: "{{ app_version | default('main') }}"
      notify: restart apache
    
    - name: Configure virtual host
      template:
        src: vhost.conf.j2
        dest: "/etc/apache2/sites-available/{{ app_domain }}.conf"
      notify: restart apache
    
    - name: Enable virtual host
      command: "a2ensite {{ app_domain }}"
      notify: restart apache
  
  handlers:
    - name: restart apache
      service:
        name: apache2
        state: restarted
```

### System Hardening

```yaml
---
- name: System security hardening
  hosts: all
  become: yes
  
  tasks:
    - name: Update all packages
      package:
        name: "*"
        state: latest
    
    - name: Configure SSH security
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^X11Forwarding', line: 'X11Forwarding no' }
      notify: restart ssh
    
    - name: Configure firewall
      ufw:
        rule: "{{ item.rule }}"
        port: "{{ item.port }}"
        proto: "{{ item.proto }}"
      loop:
        - { rule: allow, port: 22, proto: tcp }
        - { rule: allow, port: 80, proto: tcp }
        - { rule: allow, port: 443, proto: tcp }
    
    - name: Enable firewall
      ufw:
        state: enabled
        policy: deny
    
    - name: Install security tools
      package:
        name:
          - fail2ban
          - rkhunter
          - chkrootkit
        state: present
    
    - name: Configure fail2ban
      template:
        src: jail.local.j2
        dest: /etc/fail2ban/jail.local
      notify: restart fail2ban
  
  handlers:
    - name: restart ssh
      service:
        name: ssh
        state: restarted
    
    - name: restart fail2ban
      service:
        name: fail2ban
        state: restarted
```

## Best Practices

### 1. Project Structure

```
ansible-project/
├── inventories/
│   ├── production/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   └── staging/
│       ├── hosts.yml
│       └── group_vars/
├── roles/
├── playbooks/
├── group_vars/
├── host_vars/
├── ansible.cfg
└── requirements.yml
```

### 2. Security with Ansible Vault

```bash
# Create encrypted file
ansible-vault create secrets.yml

# Edit encrypted file
ansible-vault edit secrets.yml

# Encrypt existing file
ansible-vault encrypt vars.yml

# Run playbook with vault
ansible-playbook -i inventory site.yml --ask-vault-pass
```

### 3. Testing with Molecule

```yaml
# molecule/default/molecule.yml
---
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: instance
    image: ubuntu:20.04
    pre_build_image: true
provisioner:
  name: ansible
verifier:
  name: ansible
```

### 4. CI/CD Integration

```yaml
# .github/workflows/ansible.yml
name: Ansible CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      
      - name: Install dependencies
        run: |
          pip install ansible molecule[docker]
      
      - name: Run molecule tests
        run: molecule test
      
      - name: Run ansible-lint
        run: ansible-lint playbooks/
```

## Troubleshooting Common Issues

### Debug and Verbose Output

```bash
# Verbose output
ansible-playbook -vvv playbook.yml

# Debug tasks
- name: Debug variable
  debug:
    var: my_variable

# Check mode (dry run)
ansible-playbook --check playbook.yml

# Diff mode
ansible-playbook --diff playbook.yml
```

### Connection Issues

```bash
# Test connectivity
ansible all -m ping

# Use different connection methods
ansible-playbook -i inventory site.yml --connection=local
ansible-playbook -i inventory site.yml --connection=ssh
```

## Ansible Galaxy and Collections

```bash
# Install roles from Galaxy
ansible-galaxy install geerlingguy.nginx

# Install collections
ansible-galaxy collection install community.general

# Create requirements file
# requirements.yml
---
roles:
  - name: geerlingguy.nginx
    version: 2.8.0

collections:
  - name: community.general
    version: ">=3.0.0"

# Install from requirements
ansible-galaxy install -r requirements.yml
```

## Conclusion

Ansible provides a powerful yet simple way to automate infrastructure management. Key takeaways:

1. **Start simple**: Begin with basic playbooks and gradually add complexity
2. **Use roles**: Organize your automation with reusable roles
3. **Test thoroughly**: Use tools like Molecule for testing
4. **Follow best practices**: Structure projects well and use version control
5. **Secure your automation**: Use Ansible Vault for sensitive data
6. **Document everything**: Make your playbooks self-documenting

Remember: The goal is to make your infrastructure more reliable and manageable, not just to automate for automation's sake.

---

*This presentation was delivered at the ETSA October 2023 meetup. Complete playbook examples and role templates are available in our [GitHub repository](https://github.com/etsa-tech/ansible-examples).*
