// ES5 fallback for browsers that cannot execute JavaScript modules.
(function () {
  var root = document.getElementById("root");
  if (!root) return;

  var message = document.createElement("main");
  message.setAttribute("role", "alert");
  message.style.cssText = "max-width:40rem;margin:10vh auto;padding:2rem;font:16px/1.5 system-ui,sans-serif;color:#172033";

  var heading = document.createElement("h1");
  heading.appendChild(document.createTextNode("Browser not supported"));
  var detail = document.createElement("p");
  detail.appendChild(document.createTextNode(
    "Fluxora needs a recent version of Chrome 109+, Edge 109+, Firefox 115+, or Safari 16.4+. Update your browser to use the app."
  ));

  message.appendChild(heading);
  message.appendChild(detail);
  root.appendChild(message);
})();
