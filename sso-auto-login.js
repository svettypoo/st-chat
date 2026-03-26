(function() {
  if (localStorage.getItem("mx_access_token")) return;
  if (window.location.hash.includes("loginToken")) return;
  if (sessionStorage.getItem("sso_attempted")) return;
  sessionStorage.setItem("sso_attempted", "1");
  var origin = window.location.origin;
  var redirectUrl = encodeURIComponent(origin + "/#/login");
  window.location.href = origin + "/_matrix/client/v3/login/sso/redirect/sst?redirectUrl=" + redirectUrl;
})();
