chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('window.html', {
    width: 800,
    height: 600
  });
});
