FROM grafana/grafana:11.0.0
COPY grafana.ini /etc/grafana/grafana.ini
COPY provisioning/dashboards/ /etc/grafana/provisioning/dashboards/
COPY provisioning/datasources/ /etc/grafana/provisioning/datasources/
COPY public/plugin.js /usr/share/grafana/public/plugin.js
