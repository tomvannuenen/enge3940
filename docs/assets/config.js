// Where the class service lives.
// On the Cloudflare site and in local testing it is on the same address as the pages.
// On any other copy of the site (for example GitHub Pages), set ENGE_WORKER to the Cloudflare address.
(function () {
  var ENGE_WORKER = ""; // e.g. "https://enge3940.<account>.workers.dev" once deployed
  var h = location.hostname;
  var same = /workers\.dev$/.test(h) || h === "localhost" || h === "127.0.0.1";
  window.ENGE_API = same ? "" : ENGE_WORKER;
  window.ENGE_CLASS_AVAILABLE = same || !!ENGE_WORKER;
})();
