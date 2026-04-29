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

  function GrafanaCharts(props) {
    var projectId = props.projectId || "";
    var urlState = useState(null);
    var grafanaUrl = urlState[0];
    var setGrafanaUrl = urlState[1];
    var ctx = usePluginContext();

    useEffect(function () {
      ctx.api
        .get("/api/v1/plugins/grafana-visualizer")
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

    if (!grafanaUrl) {
      return React.createElement(
        "div",
        { style: { padding: "16px", color: "#6b7280", fontSize: "14px" } },
        "Loading Grafana charts…"
      );
    }

    var params =
      "orgId=1&from=now-1h&to=now&refresh=30s&theme=dark" +
      "&var-datasource=default" +
      "&var-project=" +
      encodeURIComponent(projectId);

    var panels = [
      { id: 1, title: "CPU Usage" },
      { id: 2, title: "Memory Usage" },
      { id: 3, title: "Network In" },
      { id: 4, title: "Disk Read" },
    ];

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
      panels.map(function (panel) {
        var src =
          grafanaUrl +
          "/d-solo/kleff-monitoring/kleff-monitoring?panelId=" +
          panel.id +
          "&" +
          params;
        return React.createElement(
          "div",
          {
            key: panel.id,
            style: { borderRadius: "8px", overflow: "hidden", minHeight: "300px" },
          },
          React.createElement("iframe", {
            src: src,
            width: "100%",
            height: "300",
            frameBorder: "0",
            style: { display: "block", border: "none" },
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
          component: GrafanaCharts,
          priority: 10,
        },
      ],
    },
  });

  registry.register(plugin);
})();
