(function () {
  "use strict";

  var kleff = window.__kleff__;
  if (!kleff || !kleff.React || !kleff.definePlugin || !kleff.registry) return;

  var React = kleff.React;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var usePluginContext = kleff.usePluginContext;
  var definePlugin = kleff.definePlugin;
  var registry = kleff.registry;

  // Workload panels always render (VictoriaMetrics data is always present).
  // Container panels only render when cAdvisor data exists (Linux only).
  // Host panels only render on admin page (showHost prop) and when node exporter data exists.
  var WORKLOAD_PANELS = {
    "workload.cpu":      { id: 1, title: "CPU Usage" },
    "workload.memory":   { id: 2, title: "Memory Usage" },
    "workload.network":  { id: 3, title: "Network In" },
    "workload.disk":     { id: 4, title: "Disk Read" },
  };

  var CONTAINER_PANELS = {
    "container.cpu":     { id: 5, title: "Container CPU" },
    "container.memory":  { id: 6, title: "Container Memory" },
    "container.network": { id: 7, title: "Container Network Rx" },
    "container.disk":    { id: 8, title: "Container Disk Read" },
  };

  var HOST_PANELS = {
    "host.cpu":     { id: 9,  title: "Host CPU Available" },
    "host.memory":  { id: 10, title: "Host Memory Available" },
    "host.network": { id: 11, title: "Host Network Rx" },
    "host.disk":    { id: 12, title: "Host Disk Read" },
  };

  var TOTAL_PANELS = {
    "workload.total.cpu":     { id: 13, title: "Total CPU Usage" },
    "workload.total.memory":  { id: 14, title: "Total Memory Usage" },
    "workload.total.network": { id: 15, title: "Total Network In" },
    "workload.total.disk":    { id: 16, title: "Total Disk Read" },
  };

  var CANONICAL_ORDER = [
    "workload.cpu", "workload.memory", "workload.network", "workload.disk",
    "workload.total.cpu", "workload.total.memory", "workload.total.network", "workload.total.disk",
    "container.cpu", "container.memory", "container.network", "container.disk",
    "host.cpu", "host.memory", "host.network", "host.disk",
  ];

  var PANEL_MAP = Object.assign({}, WORKLOAD_PANELS, CONTAINER_PANELS, HOST_PANELS, TOTAL_PANELS);

  function GrafanaMonitoringCharts(props) {
    var projectId = props.projectId || "";
    var showHost = props.showHost || false;

    var urlState = useState(null);
    var grafanaUrl = urlState[0];
    var setGrafanaUrl = urlState[1];

    var containerState = useState(false);
    var hasContainerData = containerState[0];
    var setHasContainerData = containerState[1];

    var hostState = useState(false);
    var hasHostData = hostState[0];
    var setHasHostData = hostState[1];

    var ctx = usePluginContext();

    useEffect(function () {
      ctx.api
        .get("/api/v1/admin/plugins/grafana-visualizer")
        .then(function (data) {
          var cfg = (data && data.data && data.data.config) || {};
          var rootUrl =
            cfg.GF_SERVER_ROOT_URL ||
            window.location.protocol + "//" + window.location.hostname + ":3002";
          setGrafanaUrl(rootUrl.replace(/\/$/, ""));
        })
        .catch(function () {
          setGrafanaUrl(
            window.location.protocol + "//" + window.location.hostname + ":3002"
          );
        });
    }, []);

    // Only show container panels when a plugin providing container metrics is installed.
    useEffect(function () {
      ctx.api
        .get("/api/v1/plugins/by-capability?capability=monitoring.source.containers")
        .then(function (data) {
          setHasContainerData(data && data.data && data.data.plugins && data.data.plugins.length > 0);
        })
        .catch(function () {
          setHasContainerData(false);
        });
    }, []);

    // Only show host panels when node exporter data is present in VictoriaMetrics.
    useEffect(function () {
      if (!showHost) return;
      var now = Math.floor(Date.now() / 1000);
      ctx.api
        .get("/api/v1/metrics/query_range?query=node_uname_info&start=" + (now - 120) + "&end=" + now + "&step=60")
        .then(function (data) {
          setHasHostData(data && data.status === "success" && data.data && data.data.result && data.data.result.length > 0);
        })
        .catch(function () {
          setHasHostData(false);
        });
    }, [showHost]);

    var panelEntries = CANONICAL_ORDER
      .filter(function (id) {
        if (!PANEL_MAP[id]) return false;
        if (CONTAINER_PANELS[id] && !hasContainerData) return false;
        if (HOST_PANELS[id] && (!showHost || !hasHostData)) return false;
        return true;
      })
      .map(function (id) { return PANEL_MAP[id]; });

    if (!grafanaUrl) {
      return React.createElement(
        "div",
        { style: { padding: "16px", color: "#6b7280", fontSize: "14px" } },
        "Loading Grafana charts…"
      );
    }

    if (panelEntries.length === 0) return null;

    var params =
      "orgId=1&from=now-1h&to=now&refresh=30s&theme=dark" +
      "&var-datasource=default" +
      "&var-project=" +
      encodeURIComponent(projectId || ".*");

    return React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          width: "100%",
        },
      },
      panelEntries.map(function (entry) {
        var src =
          grafanaUrl +
          "/d-solo/kleff-monitoring/kleff-monitoring?panelId=" +
          entry.id +
          "&" +
          params;
        return React.createElement(
          "div",
          {
            key: entry.id,
            style: {
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.07)",
              background: "var(--card, hsl(240 10% 8%))",
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              minHeight: "300px",
            },
          },
          React.createElement("iframe", {
            src: src,
            width: "100%",
            height: "300",
            frameBorder: "0",
            style: { display: "block", border: "none", background: "transparent" },
          })
        );
      })
    );
  }

  var plugin = definePlugin({
    manifest: {
      id: "kleff.grafana-visualizer",
      name: "Grafana Charts",
      version: "1.0.0",
      description: "Monitoring charts powered by Grafana.",
      slots: [
        {
          slot: "monitoring.charts",
          component: GrafanaMonitoringCharts,
          priority: 10,
          provides: [
            "workload.cpu", "workload.memory", "workload.network", "workload.disk",
            "workload.total.cpu", "workload.total.memory", "workload.total.network", "workload.total.disk",
            "container.cpu", "container.memory", "container.network", "container.disk",
            "host.cpu", "host.memory", "host.network", "host.disk",
          ],
          group: "Grafana",
        },
      ],
    },
  });

  registry.register(plugin);
})();
